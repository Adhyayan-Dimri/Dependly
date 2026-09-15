import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.seed.seed_data import seed_demo_data
from app.services.graph_engine import graph_engine
from app.services.simulator import compromise_simulator
from app.services.mitigations import get_ranked_mitigations
from app.services.explain_ai import explain_package_risk
from app.services.alternatives import get_safer_alternatives
from app.services.manifest_parser import parse_manifest_content
from app.services.github_client import fetch_github_manifest
from app.services.ingestor import ingest_application
from app.services.cisa_kev import cisa_kev_service
from app.models.schemas import (
    ApplicationSummary,
    ApplicationDetail,
    GitHubIngestRequest,
    GraphResponse,
    SimulationRequest,
    SimulationResponse,
    ExplainRequest,
    ExplainResponse,
    MitigationsResponse,
    AlternativesResponse,
    TyposquatFlag,
    SystemHealthResponse
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ripple_effect")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Ripple Effect backend services...")
    await connect_to_mongo()
    db = await get_db()
    
    # Refresh CISA KEV in background
    try:
        await cisa_kev_service.refresh_feed()
    except Exception as e:
        logger.warning(f"CISA KEV initialization: {e}")

    # Seed demo applications (offline-safe fallback)
    await seed_demo_data(db)
    
    logger.info("Ripple Effect is operational.")
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Ripple Effect API",
    description="Intelligent Open-Source Dependency Risk-Analysis Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler to ensure standard { "error": str, "detail": str } shape
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail if isinstance(exc.detail, str) else "Request Error", "detail": detail_msg}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "detail": str(exc)}
    )

# --- APPLICATION ENDPOINTS ---

@app.get("/api/applications", response_model=List[ApplicationSummary])
async def list_applications():
    """List all applications with dependency counts and max risk score."""
    db = await get_db()
    apps = []
    
    async for app_doc in db.applications.find({}):
        app_id = str(app_doc["_id"])
        direct_deps = [str(d) for d in app_doc.get("direct_deps", [])]
        
        # Calculate total resolved dependencies
        total_deps = 0
        max_score = 0.0
        
        # Query total reachability from graph
        app_node = f"app:{app_id}"
        if app_node in graph_engine.graph:
            import networkx as nx
            desc = nx.descendants(graph_engine.graph, app_node)
            total_deps = len([d for d in desc if d.startswith("pkg:")])
            
            for d in desc:
                if d.startswith("pkg:"):
                    p_id = d.replace("pkg:", "")
                    r_doc = await db.risk_scores.find_one({"package_id": ObjectId(p_id) if ObjectId.is_valid(p_id) else p_id})
                    if r_doc:
                        max_score = max(max_score, r_doc.get("score", 0.0))

        apps.append(ApplicationSummary(
            id=app_id,
            name=app_doc.get("name", "Unnamed App"),
            criticality_tag=app_doc.get("criticality_tag", "internal"),
            source=app_doc.get("source", "uploaded"),
            source_ref=app_doc.get("source_ref"),
            direct_deps_count=len(direct_deps),
            total_deps_count=total_deps if total_deps > 0 else len(direct_deps),
            max_risk_score=round(max_score, 1)
        ))

    return apps

@app.get("/api/applications/{app_id}", response_model=ApplicationDetail)
async def get_application(app_id: str):
    """Full application detail."""
    db = await get_db()
    try:
        app_doc = await db.applications.find_one({"_id": ObjectId(app_id)})
    except Exception:
        app_doc = await db.applications.find_one({"_id": app_id})
        
    if not app_doc:
        raise HTTPException(status_code=404, detail=f"Application with ID '{app_id}' not found.")

    direct_deps = [str(d) for d in app_doc.get("direct_deps", [])]
    
    total_deps = len(direct_deps)
    app_node = f"app:{app_id}"
    if app_node in graph_engine.graph:
        import networkx as nx
        desc = nx.descendants(graph_engine.graph, app_node)
        total_deps = len([d for d in desc if d.startswith("pkg:")])

    return ApplicationDetail(
        id=str(app_doc["_id"]),
        name=app_doc.get("name", "Unnamed App"),
        criticality_tag=app_doc.get("criticality_tag", "internal"),
        source=app_doc.get("source", "uploaded"),
        source_ref=app_doc.get("source_ref"),
        direct_deps_count=len(direct_deps),
        total_deps_count=total_deps,
        direct_deps=direct_deps,
        created_at=app_doc.get("created_at")
    )

@app.delete("/api/applications/{app_id}")
async def delete_application(app_id: str):
    """Delete application by ID."""
    db = await get_db()
    try:
        await db.applications.delete_one({"_id": ObjectId(app_id)})
    except Exception:
        await db.applications.delete_one({"_id": app_id})
        
    app_node = f"app:{app_id}"
    if app_node in graph_engine.graph:
        graph_engine.graph.remove_node(app_node)
        
    return {"message": "Application deleted successfully", "app_id": app_id}

@app.post("/api/applications/upload")
async def upload_manifest(
    file: UploadFile = File(...),
    criticality_tag: str = Form("customer_facing"),
    app_name_override: Optional[str] = Form(None)
):
    """
    Ingest manifest file (package.json or requirements.txt).
    Capped at 1MB and 300 resolved nodes.
    """
    if file.size and file.size > 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Manifest file exceeds the maximum 1MB size limit."
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    try:
        direct_deps, detected_name, ecosystem = parse_manifest_content(file.filename, content_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not direct_deps:
        raise HTTPException(status_code=400, detail="No dependencies found in the uploaded manifest file.")

    final_name = app_name_override.strip() if (app_name_override and app_name_override.strip()) else detected_name
    db = await get_db()
    
    result = await ingest_application(
        db=db,
        direct_deps=direct_deps,
        name=final_name,
        criticality_tag=criticality_tag,
        source="uploaded",
        source_ref=file.filename
    )

    return result

@app.post("/api/applications/github")
async def ingest_github_repo(payload: GitHubIngestRequest):
    """
    Ingest public GitHub repository manifest.
    """
    try:
        filename, content, repo_name = await fetch_github_manifest(payload.repo_url)
        direct_deps, detected_name, ecosystem = parse_manifest_content(filename, content)
    except (ValueError, FileNotFoundError, PermissionError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch GitHub repo: {str(e)}")

    final_name = payload.name.strip() if (payload.name and payload.name.strip()) else repo_name
    db = await get_db()

    result = await ingest_application(
        db=db,
        direct_deps=direct_deps,
        name=final_name,
        criticality_tag=payload.criticality_tag or "customer_facing",
        source="github",
        source_ref=payload.repo_url
    )

    return result

# --- GRAPH ENDPOINT FOR CYTOSCAPE ---

@app.get("/api/applications/{app_id}/graph", response_model=GraphResponse)
async def get_application_graph(app_id: str):
    """
    Generates Cytoscape nodes and edges for the specified application's dependency tree.
    """
    db = await get_db()
    try:
        app_doc = await db.applications.find_one({"_id": ObjectId(app_id)})
    except Exception:
        app_doc = await db.applications.find_one({"_id": app_id})

    if not app_doc:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found.")

    app_name = app_doc.get("name", "Application")
    criticality = app_doc.get("criticality_tag", "internal")
    direct_dep_ids = set(str(d) for d in app_doc.get("direct_deps", []))

    # Trace all reachable nodes from app node in graph
    app_node_key = f"app:{app_id}"
    g = graph_engine.graph

    nodes = []
    edges = []
    
    # 1. Root Application Node
    nodes.append({
        "data": {
            "id": app_node_key,
            "label": app_name,
            "name": app_name,
            "type": "application",
            "criticality_tag": criticality,
            "is_customer_facing": criticality == "customer_facing",
            "risk_score": 0.0,
            "has_kev": False,
            "vulnerability_count": 0
        }
    })

    subgraph_nodes = set([app_node_key])
    if app_node_key in g:
        import networkx as nx
        descendants = nx.descendants(g, app_node_key)
        subgraph_nodes.update(descendants)

    # 2. Package Nodes
    for node_key in subgraph_nodes:
        if node_key.startswith("pkg:"):
            pkg_id = node_key.replace("pkg:", "")
            pkg_meta = graph_engine.package_metadata.get(pkg_id, {})
            
            # Fetch risk score and vulnerabilities
            risk_doc = await db.risk_scores.find_one({"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id})
            score = risk_doc.get("score", 0.0) if risk_doc else 0.0
            
            vulns = []
            cursor = db.vulnerabilities.find({"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id})
            async for v in cursor:
                vulns.append(v)

            has_kev = any(v.get("is_actively_exploited") for v in vulns)
            is_direct = pkg_id in direct_dep_ids

            nodes.append({
                "data": {
                    "id": node_key,
                    "label": f"{pkg_meta.get('name', 'pkg')}@{pkg_meta.get('version', '')}",
                    "name": pkg_meta.get("name", "package"),
                    "version": pkg_meta.get("version", "1.0.0"),
                    "ecosystem": pkg_meta.get("ecosystem", "npm"),
                    "type": "direct_dep" if is_direct else "transitive_dep",
                    "risk_score": score,
                    "has_kev": 1 if has_kev else 0,
                    "vulnerability_count": len(vulns),
                    "scorecard_score": pkg_meta.get("scorecard_score"),
                    "is_compromised": 1 if (has_kev or score >= 75.0) else 0,
                    "maintainer_count": len(pkg_meta.get("maintainers", [1]))
                }
            })

    # 3. Edges in Subgraph
    edge_idx = 0
    for u, v, data in g.edges(data=True):
        if u in subgraph_nodes and v in subgraph_nodes:
            edge_idx += 1
            edges.append({
                "data": {
                    "id": f"e_{edge_idx}_{u}_{v}",
                    "source": u,
                    "target": v,
                    "version_range": data.get("version_range", "*"),
                    "is_dev_dependency": data.get("is_dev_dependency", False),
                    "is_propagation_path": False
                }
            })

    # Compute graph statistics
    pkg_nodes = [n for n in nodes if n["data"]["type"] != "application"]
    stats = {
        "total_nodes": len(nodes),
        "total_packages": len(pkg_nodes),
        "direct_dependencies": len([n for n in pkg_nodes if n["data"]["type"] == "direct_dep"]),
        "transitive_dependencies": len([n for n in pkg_nodes if n["data"]["type"] == "transitive_dep"]),
        "total_edges": len(edges),
        "critical_packages": len([n for n in pkg_nodes if n["data"]["risk_score"] >= 75.0 or n["data"]["has_kev"]]),
        "actively_exploited_cves": len([n for n in pkg_nodes if n["data"]["has_kev"]])
    }

    return GraphResponse(
        application_id=app_id,
        application_name=app_name,
        criticality_tag=criticality,
        nodes=nodes,
        edges=edges,
        stats=stats
    )

# --- PACKAGE SEARCH & LISTING ENDPOINTS ---

@app.get("/api/packages/search")
async def search_packages(q: str = "", ecosystem: Optional[str] = None, limit: int = 20):
    """
    Search packages by name (case-insensitive prefix/substring match).
    Returns packages stored in the DB from ingested/seeded applications.
    """
    db = await get_db()
    query: Dict[str, Any] = {}
    if q.strip():
        query["name"] = {"$regex": q.strip(), "$options": "i"}
    if ecosystem and ecosystem in ("npm", "pypi"):
        query["ecosystem"] = ecosystem

    results = []
    cursor = db.packages.find(query).limit(min(limit, 50))
    async for pkg in cursor:
        pkg_id = str(pkg["_id"])
        risk_doc = await db.risk_scores.find_one(
            {"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id}
        )
        score = risk_doc.get("score", 0.0) if risk_doc else 0.0

        # Count vulns & check KEV
        vuln_count = 0
        has_kev = False
        top_cve = None
        top_cve_desc = None
        cve_cursor = db.vulnerabilities.find(
            {"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id}
        )
        async for v in cve_cursor:
            vuln_count += 1
            if v.get("is_actively_exploited"):
                has_kev = True
            if top_cve is None:
                top_cve = v.get("cve_id")
                top_cve_desc = v.get("summary", "")

        results.append({
            "id": pkg_id,
            "name": pkg["name"],
            "version": pkg.get("version", ""),
            "ecosystem": pkg.get("ecosystem", "npm"),
            "risk_score": round(score, 1),
            "cve_count": vuln_count,
            "has_kev": has_kev,
            "top_cve": top_cve,
            "cve_desc": top_cve_desc,
        })

    # Sort by risk score descending
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


@app.get("/api/packages/top-risk")
async def get_top_risk_packages(limit: int = 10):
    """
    Returns the highest-risk packages (by risk score) actually stored in the DB.
    Used by the Dashboard watchlist — zero hardcoded data.
    """
    db = await get_db()
    top_scores = []
    async for r in db.risk_scores.find({}).sort("score", -1).limit(limit):
        pkg_id_raw = r.get("package_id")
        pkg_id = str(pkg_id_raw)
        pkg = await db.packages.find_one(
            {"_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id}
        )
        if not pkg:
            continue

        vuln_count = 0
        has_kev = False
        top_cve = None
        top_cve_desc = None
        cve_cursor = db.vulnerabilities.find(
            {"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id}
        )
        async for v in cve_cursor:
            vuln_count += 1
            if v.get("is_actively_exploited"):
                has_kev = True
            if top_cve is None:
                top_cve = v.get("cve_id")
                top_cve_desc = v.get("summary", "")

        top_scores.append({
            "id": pkg_id,
            "name": pkg["name"],
            "version": pkg.get("version", ""),
            "ecosystem": pkg.get("ecosystem", "npm"),
            "risk_score": round(r.get("score", 0.0), 1),
            "cve_count": vuln_count,
            "has_kev": has_kev,
            "top_cve": top_cve,
            "cve_desc": top_cve_desc,
        })

    return top_scores


# --- PACKAGE DETAIL & RISK ENDPOINTS ---

@app.get("/api/packages/{pkg_id}")
async def get_package_detail(pkg_id: str):
    db = await get_db()
    try:
        pkg = await db.packages.find_one({"_id": ObjectId(pkg_id)})
    except Exception:
        pkg = await db.packages.find_one({"_id": pkg_id})

    if not pkg:
        raise HTTPException(status_code=404, detail=f"Package {pkg_id} not found.")

    risk_doc = await db.risk_scores.find_one({"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id})

    vulns = []
    cursor = db.vulnerabilities.find({"package_id": ObjectId(pkg_id) if ObjectId.is_valid(pkg_id) else pkg_id})
    async for v in cursor:
        vulns.append({
            "id": str(v["_id"]),
            "package_id": str(v.get("package_id", "")),
            "cve_id": v.get("cve_id", ""),
            "severity": v.get("severity", "medium"),
            "is_actively_exploited": bool(v.get("is_actively_exploited", False)),
            "summary": v.get("summary", ""),
            "disclosed_date": v.get("disclosed_date").isoformat() if v.get("disclosed_date") else None,
        })

    maintainers = pkg.get("maintainers", [])
    last_release = pkg.get("last_release_date")

    return {
        "id": str(pkg["_id"]),
        "ecosystem": pkg.get("ecosystem", "npm"),
        "name": pkg.get("name", ""),
        "version": pkg.get("version", ""),
        "maintainers": [str(m) for m in maintainers] if maintainers else [],
        "last_release_date": last_release.isoformat() if hasattr(last_release, "isoformat") else str(last_release) if last_release else None,
        "scorecard_score": pkg.get("scorecard_score"),
        "download_rank": pkg.get("download_rank"),
        "risk_score": {
            "score": risk_doc.get("score", 0.0) if risk_doc else 0.0,
            "factor_breakdown": risk_doc.get("factor_breakdown", {}) if risk_doc else {},
            "computed_at": risk_doc["computed_at"].isoformat() if risk_doc and risk_doc.get("computed_at") else None
        } if risk_doc else None,
        "vulnerabilities": vulns
    }


@app.get("/api/packages/{pkg_id}/risk")
async def get_package_risk(pkg_id: str):
    """Get current risk score and 6-factor breakdown."""
    db = await get_db()
    try:
        risk_doc = await db.risk_scores.find_one({"package_id": ObjectId(pkg_id)})
    except Exception:
        risk_doc = await db.risk_scores.find_one({"package_id": pkg_id})

    if not risk_doc:
        raise HTTPException(status_code=404, detail=f"Risk score for package {pkg_id} not found.")

    computed_at = risk_doc.get("computed_at")
    return {
        "package_id": pkg_id,
        "score": risk_doc.get("score", 0.0),
        "factor_breakdown": risk_doc.get("factor_breakdown", {}),
        "computed_at": computed_at.isoformat() if hasattr(computed_at, "isoformat") else str(computed_at) if computed_at else None
    }

# --- SIMULATION (WAR ROOM) ENDPOINT ---

@app.post("/api/simulate", response_model=SimulationResponse)
async def simulate_compromise(req: SimulationRequest):
    """
    Simulates upstream compromise propagation with version filtering and execution type distinction.
    """
    result = compromise_simulator.simulate_compromise(
        package_id=req.package_id,
        execution_type=req.execution_type,
        version_override=req.version_override
    )
    return result

# --- MITIGATIONS, EXPLAIN AI, ALTERNATIVES, TYPOSQUAT ---

@app.get("/api/mitigations/{pkg_id}", response_model=MitigationsResponse)
async def get_mitigations(pkg_id: str):
    """Ranked mitigation actions with before/after score diff."""
    db = await get_db()
    return await get_ranked_mitigations(db, pkg_id)

@app.post("/api/explain", response_model=ExplainResponse)
async def explain_risk(req: ExplainRequest):
    """Explainable AI narration strictly grounded in stored factor breakdown numbers."""
    db = await get_db()
    return await explain_package_risk(db, req.package_id)

@app.get("/api/alternatives/{pkg_id}", response_model=AlternativesResponse)
async def get_alternatives(pkg_id: str):
    """Ranked candidate replacement packages with tradeoff analysis."""
    db = await get_db()
    return await get_safer_alternatives(db, pkg_id)

@app.get("/api/typosquat-flags", response_model=List[TyposquatFlag])
async def list_typosquat_flags():
    """All flagged packages detected by RapidFuzz Levenshtein matching."""
    db = await get_db()
    flags = []
    async for f in db.typosquat_flags.find({}):
        flags.append(TyposquatFlag(
            id=str(f["_id"]),
            package_id=str(f["package_id"]),
            package_name=f.get("package_name", "unknown"),
            ecosystem=f.get("ecosystem", "npm"),
            suspected_target=f.get("suspected_target", ""),
            edit_distance=f.get("edit_distance", 1),
            detected_at=f.get("detected_at")
        ))
    return flags

# --- HEALTH & SETTINGS ENDPOINT ---

@app.get("/api/system/health", response_model=SystemHealthResponse)
async def get_system_health():
    """Returns backend and database operational health."""
    db = await get_db()
    mongo_ok = True
    pkg_count = 0
    app_count = 0
    try:
        pkg_count = await db.packages.count_documents({})
        app_count = await db.applications.count_documents({})
    except Exception:
        mongo_ok = False

    return SystemHealthResponse(
        status="healthy" if mongo_ok else "degraded",
        mongo_connected=mongo_ok,
        packages_count=pkg_count,
        applications_count=app_count,
        active_graph_nodes=len(graph_engine.graph.nodes),
        active_graph_edges=len(graph_engine.graph.edges),
        ai_provider=settings.AI_PROVIDER,
        has_openrouter_key=bool(settings.OPENROUTER_API_KEY),
        has_github_token=bool(settings.GITHUB_TOKEN)
    )

@app.post("/api/system/settings")
async def update_settings(payload: Dict[str, Any]):
    """Update API keys or settings dynamically."""
    if "openrouter_api_key" in payload:
        settings.OPENROUTER_API_KEY = payload["openrouter_api_key"].strip()
    if "github_token" in payload:
        settings.GITHUB_TOKEN = payload["github_token"].strip()
    if "ai_provider" in payload:
        settings.AI_PROVIDER = payload["ai_provider"]
    if "openrouter_model" in payload:
        settings.OPENROUTER_MODEL = payload["openrouter_model"]
    return {"message": "Settings updated successfully."}
