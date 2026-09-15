import logging
import networkx as nx
from typing import Dict, Any, List, Set, Tuple, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

logger = logging.getLogger(__name__)

class GraphEngine:
    def __init__(self):
        self.graph: nx.DiGraph = nx.DiGraph()
        self.package_metadata: Dict[str, Dict[str, Any]] = {}
        self.app_metadata: Dict[str, Dict[str, Any]] = {}
        self.betweenness_centrality: Dict[str, float] = {}

    async def rebuild_graph_from_db(self, db: AsyncIOMotorDatabase):
        """
        Rebuilds the in-memory NetworkX DiGraph from MongoDB collections:
        - applications
        - packages
        - dependencies
        """
        logger.info("Rebuilding in-memory NetworkX dependency graph...")
        new_graph = nx.DiGraph()
        new_pkg_meta = {}
        new_app_meta = {}

        # 1. Load all applications
        async for app in db.applications.find({}):
            app_id = str(app["_id"])
            new_app_meta[app_id] = {
                "id": app_id,
                "name": app["name"],
                "criticality_tag": app.get("criticality_tag", "internal"),
                "source": app.get("source", "uploaded"),
                "source_ref": app.get("source_ref"),
                "direct_deps": [str(d) for d in app.get("direct_deps", [])]
            }
            new_graph.add_node(
                f"app:{app_id}",
                node_type="application",
                app_id=app_id,
                name=app["name"],
                criticality_tag=app.get("criticality_tag", "internal")
            )

        # 2. Load all packages
        async for pkg in db.packages.find({}):
            pkg_id = str(pkg["_id"])
            new_pkg_meta[pkg_id] = {
                "id": pkg_id,
                "ecosystem": pkg["ecosystem"],
                "name": pkg["name"],
                "version": pkg["version"],
                "maintainers": pkg.get("maintainers", []),
                "last_release_date": pkg.get("last_release_date"),
                "scorecard_score": pkg.get("scorecard_score"),
                "download_rank": pkg.get("download_rank")
            }
            new_graph.add_node(
                f"pkg:{pkg_id}",
                node_type="package",
                pkg_id=pkg_id,
                ecosystem=pkg["ecosystem"],
                name=pkg["name"],
                version=pkg["version"]
            )

        # 3. Add application -> direct dependency edges
        for app_id, app_info in new_app_meta.items():
            for dep_id in app_info["direct_deps"]:
                if f"pkg:{dep_id}" in new_graph:
                    new_graph.add_edge(
                        f"app:{app_id}",
                        f"pkg:{dep_id}",
                        is_direct=True,
                        version_range="*",
                        is_dev_dependency=False
                    )

        # 4. Load package-to-package dependencies
        async for dep in db.dependencies.find({}):
            from_id = str(dep["from_package_id"])
            to_id = str(dep["to_package_id"])
            from_node = f"pkg:{from_id}"
            to_node = f"pkg:{to_id}"
            if from_node in new_graph and to_node in new_graph:
                new_graph.add_edge(
                    from_node,
                    to_node,
                    is_direct=False,
                    version_range=dep.get("version_range", "*"),
                    is_dev_dependency=dep.get("is_dev_dependency", False)
                )

        # 5. Compute Betweenness Centrality
        try:
            if len(new_graph) > 0:
                raw_centrality = nx.betweenness_centrality(new_graph)
                max_cent = max(raw_centrality.values()) if raw_centrality.values() else 1.0
                if max_cent > 0:
                    self.betweenness_centrality = {k: v / max_cent for k, v in raw_centrality.items()}
                else:
                    self.betweenness_centrality = raw_centrality
            else:
                self.betweenness_centrality = {}
        except Exception as e:
            logger.warning(f"Centrality calculation error: {e}")
            self.betweenness_centrality = {}

        self.graph = new_graph
        self.package_metadata = new_pkg_meta
        self.app_metadata = new_app_meta
        logger.info(f"In-memory graph rebuilt with {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges.")

    def get_centrality_for_package(self, package_id: str) -> float:
        node_key = f"pkg:{package_id}"
        return self.betweenness_centrality.get(node_key, 0.0)

    def get_dependents_count(self, package_id: str) -> int:
        """
        Count all upstream ancestor nodes (packages and applications) that depend on this package
        """
        node_key = f"pkg:{package_id}"
        if node_key not in self.graph:
            return 0
        try:
            # Predecessors in reversed graph = nodes with a path leading to this package
            ancestors = nx.ancestors(self.graph, node_key)
            return len(ancestors)
        except Exception:
            return 0

    def get_dependent_apps(self, package_id: str) -> List[Dict[str, Any]]:
        """
        Return list of application records that transitively depend on this package
        """
        node_key = f"pkg:{package_id}"
        if node_key not in self.graph:
            return []
        
        dependent_apps = []
        try:
            ancestors = nx.ancestors(self.graph, node_key)
            for anc in ancestors:
                if anc.startswith("app:"):
                    app_id = anc.replace("app:", "")
                    if app_id in self.app_metadata:
                        dependent_apps.append(self.app_metadata[app_id])
        except Exception as e:
            logger.warning(f"Error fetching dependent apps: {e}")
        
        return dependent_apps

graph_engine = GraphEngine()
