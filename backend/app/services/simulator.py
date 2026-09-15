import logging
import re
import networkx as nx
from typing import Dict, Any, List, Set, Optional, Literal
from app.services.graph_engine import graph_engine
from app.config import settings
from packaging.specifiers import SpecifierSet
from packaging.version import Version, InvalidVersion
import semver

logger = logging.getLogger(__name__)

def semver_satisfies(version_str: str, range_str: str) -> bool:
    """
    Evaluates whether a version matches a given range string.
    Supports npm (^, ~, >=, <=, *, exact) and PyPI (>=, ==, <=, ~=).
    """
    if not range_str or range_str.strip() in ["*", "latest", "x", "X"]:
        return True
    
    clean_v = version_str.strip().lstrip("vV")
    clean_range = range_str.strip()

    # Exact equality check
    if clean_range.lstrip("vV") == clean_v:
        return True

    # 1. Try python packaging SpecifierSet for standard comparison
    try:
        # Translate npm caret and tilde to standard specifiers
        norm_range = clean_range
        if norm_range.startswith("^"):
            base = norm_range[1:].strip()
            # ^1.2.3 -> >=1.2.3, <2.0.0
            parts = base.split(".")
            major = int(parts[0]) if parts[0].isdigit() else 0
            norm_range = f">={base},<{major + 1}.0.0"
        elif norm_range.startswith("~"):
            base = norm_range[1:].strip()
            parts = base.split(".")
            major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
            minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
            norm_range = f">={base},<{major}.{minor + 1}.0"

        spec = SpecifierSet(norm_range)
        # Parse version
        v_parsed = Version(clean_v)
        return v_parsed in spec
    except Exception:
        pass

    # 2. Try semver match
    try:
        # Normalize semver 3-parts
        parts = clean_v.split(".")
        while len(parts) < 3:
            parts.append("0")
        sem_v = ".".join(parts[:3])
        
        parsed_semver = semver.Version.parse(sem_v)
        if clean_range.startswith("^"):
            base_v = clean_range[1:].strip()
            return semver.Version.parse(base_v).major == parsed_semver.major and parsed_semver >= semver.Version.parse(base_v)
        elif clean_range.startswith("~"):
            base_v = clean_range[1:].strip()
            base_p = semver.Version.parse(base_v)
            return parsed_semver.major == base_p.major and parsed_semver.minor == base_p.minor and parsed_semver >= base_p
        elif clean_range.startswith(">="):
            base_v = clean_range[2:].strip()
            return parsed_semver >= semver.Version.parse(base_v)
        elif clean_range.startswith("<="):
            base_v = clean_range[2:].strip()
            return parsed_semver <= semver.Version.parse(base_v)
    except Exception:
        pass

    # Default fallback: assume matches if range contains major version
    v_major = clean_v.split(".")[0]
    return v_major in clean_range

class CompromiseSimulator:
    def simulate_compromise(
        self,
        package_id: str,
        execution_type: Literal["install_time", "runtime"] = "install_time",
        version_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Simulates how a compromise of `package_id` propagates upstream through the dependency graph.
        
        - Version-filtered reachability: only propagate if edge range includes the package version.
        - Execution-type distinction:
            * install_time: affects all transitive parents (including devDependencies if present).
            * runtime: affects runtime invocation paths (excluding pure dev dependencies).
        - Path finding: nx.all_simple_paths (depth-capped) from compromised node to reachable apps.
        """
        source_node = f"pkg:{package_id}"
        g = graph_engine.graph

        if source_node not in g:
            # Check if package_id exists in metadata
            pkg_meta = graph_engine.package_metadata.get(package_id, {})
            pkg_name = pkg_meta.get("name", "unknown")
            return {
                "compromised_package_id": package_id,
                "compromised_package_name": pkg_name,
                "execution_type": execution_type,
                "affected_packages": [],
                "affected_applications": [],
                "propagation_paths": [],
                "blast_radius": 0,
                "max_depth": 0,
                "estimated_cost": 0.0,
                "customer_facing_apps_count": 0
            }

        pkg_meta = graph_engine.package_metadata.get(package_id, {})
        pkg_name = pkg_meta.get("name", "unknown")
        pkg_version = version_override or pkg_meta.get("version", "1.0.0")

        # Reversed graph to trace upstream dependents from package -> parent packages -> applications
        # Filter edges based on execution type and semver range
        filtered_rev_graph = nx.DiGraph()

        for u, v, data in g.edges(data=True):
            # In g, u depends on v (u -> v). In reversed graph, propagation goes from v to u (v -> u).
            is_dev = data.get("is_dev_dependency", False)
            version_range = data.get("version_range", "*")

            # Check execution filter
            if execution_type == "runtime" and is_dev:
                # Runtime ignores pure dev dependencies
                continue

            # Check semver filter if target node is the compromised package
            if v == source_node:
                if not semver_satisfies(pkg_version, version_range):
                    continue

            # Add reverse edge: from dependency to dependent
            filtered_rev_graph.add_edge(v, u, **data)

        # BFS / reachability from source_node in filtered_rev_graph
        affected_nodes: Set[str] = set()
        if source_node in filtered_rev_graph:
            try:
                reachable = nx.descendants(filtered_rev_graph, source_node)
                affected_nodes = reachable
            except Exception as e:
                logger.warning(f"Reachability error in simulation: {e}")

        affected_packages: List[str] = []
        affected_apps_map: Dict[str, Dict[str, Any]] = {}
        propagation_paths: List[Dict[str, Any]] = []
        max_depth = 0

        # Separate affected packages and affected applications
        for node in affected_nodes:
            if node.startswith("pkg:"):
                p_id = node.replace("pkg:", "")
                p_info = graph_engine.package_metadata.get(p_id, {})
                affected_packages.append(f"{p_info.get('name', p_id)}@{p_info.get('version', '')}")
            elif node.startswith("app:"):
                a_id = node.replace("app:", "")
                app_info = graph_engine.app_metadata.get(a_id, {})
                affected_apps_map[a_id] = {
                    "id": a_id,
                    "name": app_info.get("name", a_id),
                    "criticality_tag": app_info.get("criticality_tag", "internal"),
                    "is_customer_facing": app_info.get("criticality_tag") == "customer_facing"
                }

        # Find propagation paths from source_node to all reachable applications
        for app_node in [n for n in affected_nodes if n.startswith("app:")]:
            try:
                paths_gen = nx.all_simple_paths(
                    filtered_rev_graph,
                    source=source_node,
                    target=app_node,
                    cutoff=settings.MAX_PATH_DEPTH
                )
                
                # Take up to 3 shortest paths per application for display clarity
                paths = sorted(list(paths_gen), key=len)[:3]
                for p in paths:
                    depth = len(p) - 1
                    max_depth = max(max_depth, depth)
                    
                    # Convert node keys to human-readable names
                    path_names = []
                    for n in p:
                        if n.startswith("pkg:"):
                            pid = n.replace("pkg:", "")
                            pinfo = graph_engine.package_metadata.get(pid, {})
                            path_names.append(f"{pinfo.get('name', pid)}@{pinfo.get('version', '')}")
                        elif n.startswith("app:"):
                            aid = n.replace("app:", "")
                            ainfo = graph_engine.app_metadata.get(aid, {})
                            path_names.append(f"App: {ainfo.get('name', aid)}")

                    app_id = app_node.replace("app:", "")
                    app_info = graph_engine.app_metadata.get(app_id, {})
                    is_cf = app_info.get("criticality_tag") == "customer_facing"

                    propagation_paths.append({
                        "path": p,
                        "path_names": path_names,
                        "target_app_id": app_id,
                        "target_app_name": app_info.get("name", app_id),
                        "is_customer_facing": is_cf,
                        "depth": depth
                    })
            except Exception as e:
                logger.warning(f"Path generation error for app {app_node}: {e}")

        # Sort paths by customer-facing priority, then shortest depth
        propagation_paths.sort(key=lambda x: (not x["is_customer_facing"], x["depth"]))

        affected_apps_list = list(affected_apps_map.values())
        customer_facing_count = sum(1 for a in affected_apps_list if a["is_customer_facing"])
        blast_radius = len(affected_packages) + len(affected_apps_list)

        # Illustrative financial cost model
        base_cost = len(affected_apps_list) * settings.COST_PER_AFFECTED_APP
        cf_cost = customer_facing_count * (settings.COST_PER_AFFECTED_APP * settings.CUSTOMER_FACING_COST_MULTIPLIER)
        estimated_cost = round(base_cost + cf_cost, 2)

        return {
            "compromised_package_id": package_id,
            "compromised_package_name": pkg_name,
            "execution_type": execution_type,
            "affected_packages": affected_packages,
            "affected_applications": affected_apps_list,
            "propagation_paths": propagation_paths,
            "blast_radius": blast_radius,
            "max_depth": max_depth,
            "estimated_cost": estimated_cost,
            "customer_facing_apps_count": customer_facing_count
        }

compromise_simulator = CompromiseSimulator()
