import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.services.manifest_parser import DirectDependencyRef
from app.services.deps_dev import get_dependency_tree, get_package_version_info, get_project_scorecard
from app.services.osv_client import query_osv_vulnerabilities
from app.services.typosquat import typosquat_detector
from app.services.graph_engine import graph_engine
from app.services.risk_scorer import calculate_and_store_risk_score
from app.config import settings

logger = logging.getLogger(__name__)

async def resolve_package_node(
    db: AsyncIOMotorDatabase,
    ecosystem: str,
    name: str,
    version: str,
    scorecard_score: Optional[float] = None
) -> ObjectId:
    """
    Finds or creates a package document in MongoDB.
    """
    clean_ver = version.lstrip("vV^~>=< ").strip() or "1.0.0"
    
    existing = await db.packages.find_one({
        "ecosystem": ecosystem,
        "name": name,
        "version": clean_ver
    })
    
    if existing:
        return existing["_id"]

    # Fetch scorecard if not provided
    if scorecard_score is None:
        scorecard_score = await get_project_scorecard(ecosystem, name, clean_ver)

    doc = {
        "ecosystem": ecosystem,
        "name": name,
        "version": clean_ver,
        "maintainers": [f"{name}-maintainer"],
        "last_release_date": datetime.now(timezone.utc),
        "scorecard_score": scorecard_score,
        "download_rank": None
    }

    res = await db.packages.insert_one(doc)
    pkg_id = res.inserted_id

    # Check for vulnerabilities via OSV + KEV
    vulns = await query_osv_vulnerabilities(ecosystem, name, clean_ver)
    for v in vulns:
        vuln_doc = {
            "package_id": pkg_id,
            "cve_id": v["cve_id"],
            "severity": v["severity"],
            "is_actively_exploited": v["is_actively_exploited"],
            "summary": v.get("summary", ""),
            "disclosed_date": datetime.now(timezone.utc)
        }
        await db.vulnerabilities.insert_one(vuln_doc)

    # Check for typosquatting
    typo_match = typosquat_detector.check_package(ecosystem, name)
    if typo_match:
        flag_doc = {
            "package_id": pkg_id,
            "package_name": name,
            "ecosystem": ecosystem,
            "suspected_target": typo_match["suspected_target"],
            "edit_distance": typo_match["edit_distance"],
            "detected_at": datetime.now(timezone.utc)
        }
        await db.typosquat_flags.insert_one(flag_doc)

    return pkg_id

async def ingest_application(
    db: AsyncIOMotorDatabase,
    direct_deps: List[DirectDependencyRef],
    name: str,
    criticality_tag: str = "customer_facing",
    source: str = "uploaded",
    source_ref: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified ingestion pipeline (§3).
    Ingests an application and its direct dependencies, resolves transitive graphs,
    caps at 300 nodes, computes risk scores, and triggers in-memory graph rebuild.
    """
    logger.info(f"Starting unified ingest for application '{name}' ({source}) with {len(direct_deps)} direct deps.")

    direct_pkg_ids: List[ObjectId] = []
    resolved_package_keys: Set[str] = set()
    edge_tuples: List[Dict[str, Any]] = []

    # 1. Process Direct Dependencies
    for dep in direct_deps:
        clean_version = dep.version_range.lstrip("^~>=< ").strip() or "1.0.0"
        pkg_id = await resolve_package_node(
            db=db,
            ecosystem=dep.ecosystem,
            name=dep.name,
            version=clean_version
        )
        direct_pkg_ids.append(pkg_id)
        resolved_package_keys.add(f"{dep.ecosystem}:{dep.name}:{clean_version}")

        # 2. Attempt Transitive Resolution via deps.dev
        if len(resolved_package_keys) < settings.MAX_RESOLVED_NODES:
            tree_data = await get_dependency_tree(dep.ecosystem, dep.name, clean_version)
            if tree_data and "nodes" in tree_data:
                nodes = tree_data.get("nodes", [])
                edges = tree_data.get("edges", [])
                
                # Node map by index
                node_id_map: Dict[int, ObjectId] = {}
                for idx, node in enumerate(nodes):
                    if len(resolved_package_keys) >= settings.MAX_RESOLVED_NODES:
                        break
                    
                    v_key = node.get("versionKey", {})
                    pkg_sys = v_key.get("system", dep.ecosystem).lower()
                    pkg_name = v_key.get("name")
                    pkg_ver = v_key.get("version", "1.0.0")

                    if pkg_name:
                        t_id = await resolve_package_node(db, pkg_sys, pkg_name, pkg_ver)
                        node_id_map[idx] = t_id
                        resolved_package_keys.add(f"{pkg_sys}:{pkg_name}:{pkg_ver}")

                # Save edges
                for edge in edges:
                    from_idx = edge.get("fromNode")
                    to_idx = edge.get("toNode")
                    req = edge.get("requirement", "*")
                    if from_idx in node_id_map and to_idx in node_id_map:
                        from_id = node_id_map[from_idx]
                        to_id = node_id_map[to_idx]
                        edge_tuples.append({
                            "from_package_id": from_id,
                            "to_package_id": to_id,
                            "version_range": req,
                            "is_dev_dependency": False
                        })

    # Save inter-package dependencies
    for e in edge_tuples:
        await db.dependencies.update_one(
            {
                "from_package_id": e["from_package_id"],
                "to_package_id": e["to_package_id"]
            },
            {"$set": e},
            upsert=True
        )

    # 3. Insert or Update Application Document
    app_doc = {
        "name": name,
        "criticality_tag": criticality_tag,
        "direct_deps": direct_pkg_ids,
        "source": source,
        "source_ref": source_ref or name,
        "created_at": datetime.now(timezone.utc)
    }

    # Upsert application by name and source
    existing_app = await db.applications.find_one({"name": name, "source": source})
    if existing_app:
        app_id = existing_app["_id"]
        await db.applications.update_one({"_id": app_id}, {"$set": app_doc})
    else:
        res = await db.applications.insert_one(app_doc)
        app_id = res.inserted_id

    # 4. Rebuild in-memory NetworkX graph
    await graph_engine.rebuild_graph_from_db(db)

    # 5. Compute Risk Scores for all resolved packages
    async for pkg in db.packages.find({}):
        await calculate_and_store_risk_score(db, str(pkg["_id"]), package_doc=pkg)

    logger.info(f"Ingest complete for '{name}' (ID: {app_id}). Graph updated.")

    return {
        "id": str(app_id),
        "name": name,
        "criticality_tag": criticality_tag,
        "source": source,
        "source_ref": source_ref,
        "direct_deps_count": len(direct_pkg_ids),
        "total_resolved_count": len(resolved_package_keys)
    }
