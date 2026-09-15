import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.services.graph_engine import graph_engine

logger = logging.getLogger(__name__)

def compute_vulnerability_severity_score(vulnerabilities: List[Dict[str, Any]]) -> float:
    if not vulnerabilities:
        return 0.0
    
    # Severity weights
    weight_map = {
        "critical": 1.0,
        "high": 0.75,
        "medium": 0.45,
        "low": 0.20
    }
    
    max_sev = 0.0
    sum_sev = 0.0
    for v in vulnerabilities:
        sev = str(v.get("severity", "medium")).lower()
        w = weight_map.get(sev, 0.45)
        max_sev = max(max_sev, w)
        sum_sev += w * 0.25
        
    # Combine highest severity with a small additive factor for multiple CVEs, capped at 1.0
    return min(1.0, max_sev + sum_sev)

def compute_maintainer_health_risk(package: Dict[str, Any]) -> float:
    """
    Maintainer health risk:
    - Single maintainer inactive > 6 months: 1.0
    - Multiple maintainers but inactive > 12 months: 0.75
    - Active maintainers (< 3 months) or OpenSSF score >= 7.0: 0.1 - 0.2
    """
    maintainers = package.get("maintainers", [])
    maintainer_count = len(maintainers) if maintainers else 1
    scorecard = package.get("scorecard_score")
    
    last_release = package.get("last_release_date")
    inactive_months = 0
    if last_release:
        if isinstance(last_release, str):
            try:
                last_release = datetime.fromisoformat(last_release.replace("Z", "+00:00"))
            except Exception:
                last_release = None
        if last_release:
            if last_release.tzinfo is None:
                last_release = last_release.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days = (now - last_release).days
            inactive_months = max(0, days // 30)

    # Base risk by inactivity
    if inactive_months > 12:
        inactivity_factor = 0.8
    elif inactive_months > 6:
        inactivity_factor = 0.5
    elif inactive_months > 3:
        inactivity_factor = 0.25
    else:
        inactivity_factor = 0.05

    # Single maintainer penalty
    bus_factor = 0.4 if maintainer_count <= 1 else 0.1

    # Scorecard mitigation
    scorecard_mitigation = 0.0
    if scorecard is not None:
        scorecard_mitigation = min(0.4, (scorecard / 10.0) * 0.4)

    raw_risk = (inactivity_factor + bus_factor) - scorecard_mitigation
    return max(0.05, min(1.0, raw_risk))

async def calculate_and_store_risk_score(
    db: AsyncIOMotorDatabase,
    package_id: str,
    package_doc: Optional[Dict[str, Any]] = None,
    vulnerabilities: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Computes risk score using the exact 6-factor formula:
    risk_score = 100 * (
        0.25 * dependents_normalized +
        0.15 * centrality_normalized +
        0.20 * vulnerability_severity_normalized +
        0.10 * active_exploitation_flag +
        0.15 * maintainer_health_risk +
        0.15 * critical_app_exposure
    )
    """
    if not package_doc:
        try:
            package_doc = await db.packages.find_one({"_id": ObjectId(package_id)})
        except Exception:
            package_doc = await db.packages.find_one({"_id": package_id})
    
    if not package_doc:
        logger.warning(f"Package {package_id} not found for risk scoring.")
        return {}

    # 1. Dependents count (normalized against total graph size or max 20)
    dependents_count = graph_engine.get_dependents_count(package_id)
    dependents_normalized = min(1.0, dependents_count / 15.0)

    # 2. Centrality normalized
    centrality_normalized = graph_engine.get_centrality_for_package(package_id)
    centrality_normalized = min(1.0, max(0.0, centrality_normalized))

    # 3. Vulnerabilities
    if vulnerabilities is None:
        vulnerabilities = []
        try:
            cursor = db.vulnerabilities.find({"package_id": ObjectId(package_id)})
            async for v in cursor:
                vulnerabilities.append(v)
        except Exception:
            cursor = db.vulnerabilities.find({"package_id": package_id})
            async for v in cursor:
                vulnerabilities.append(v)

    vulnerability_severity_normalized = compute_vulnerability_severity_score(vulnerabilities)

    # 4. Active exploitation flag (1.0 if any KEV-listed CVE, else 0.0)
    has_kev = any(v.get("is_actively_exploited", False) for v in vulnerabilities)
    active_exploitation_flag = 1.0 if has_kev else 0.0

    # 5. Maintainer health risk
    maintainer_health_risk = compute_maintainer_health_risk(package_doc)

    # 6. Critical app exposure: fraction of dependent applications that are customer_facing
    dependent_apps = graph_engine.get_dependent_apps(package_id)
    if dependent_apps:
        customer_facing_count = sum(1 for a in dependent_apps if a.get("criticality_tag") == "customer_facing")
        critical_app_exposure = customer_facing_count / len(dependent_apps)
    else:
        critical_app_exposure = 0.0

    # Risk score calculation
    raw_score = 100.0 * (
        0.25 * dependents_normalized +
        0.15 * centrality_normalized +
        0.20 * vulnerability_severity_normalized +
        0.10 * active_exploitation_flag +
        0.15 * maintainer_health_risk +
        0.15 * critical_app_exposure
    )
    score = round(max(0.0, min(100.0, raw_score)), 1)

    factor_breakdown = {
        "dependents_normalized": round(dependents_normalized, 3),
        "centrality_normalized": round(centrality_normalized, 3),
        "vulnerability_severity_normalized": round(vulnerability_severity_normalized, 3),
        "active_exploitation_flag": round(active_exploitation_flag, 3),
        "maintainer_health_risk": round(maintainer_health_risk, 3),
        "critical_app_exposure": round(critical_app_exposure, 3)
    }

    # Store in MongoDB risk_scores collection
    risk_record = {
        "package_id": ObjectId(package_id) if ObjectId.is_valid(package_id) else package_id,
        "score": score,
        "factor_breakdown": factor_breakdown,
        "computed_at": datetime.now(timezone.utc)
    }

    await db.risk_scores.update_one(
        {"package_id": risk_record["package_id"]},
        {"$set": risk_record},
        upsert=True
    )

    return {
        "score": score,
        "factor_breakdown": factor_breakdown,
        "dependents_count": dependents_count,
        "critical_count": sum(1 for a in dependent_apps if a.get("criticality_tag") == "customer_facing"),
        "has_kev": has_kev
    }
