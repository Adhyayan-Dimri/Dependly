import logging
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.services.graph_engine import graph_engine

logger = logging.getLogger(__name__)

async def get_ranked_mitigations(db: AsyncIOMotorDatabase, package_id: str) -> Dict[str, Any]:
    """
    Computes prioritized mitigation actions:
    priority = risk_reduction / effort
    effort ∈ {1: patch/minor bump, 2: major bump, 3: full replacement/vendoring/isolation}
    """
    try:
        pkg = await db.packages.find_one({"_id": ObjectId(package_id)})
    except Exception:
        pkg = await db.packages.find_one({"_id": package_id})

    if not pkg:
        return {
            "package_id": package_id,
            "package_name": "unknown",
            "current_score": 0.0,
            "mitigations": []
        }

    # Fetch current risk score
    try:
        risk_doc = await db.risk_scores.find_one({"package_id": ObjectId(package_id)})
    except Exception:
        risk_doc = await db.risk_scores.find_one({"package_id": package_id})

    current_score = risk_doc["score"] if risk_doc else 50.0
    factors = risk_doc.get("factor_breakdown", {}) if risk_doc else {}

    pkg_name = pkg.get("name", "package")
    pkg_ver = pkg.get("version", "1.0.0")
    ecosystem = pkg.get("ecosystem", "npm")

    # Fetch vulnerabilities
    vulns = []
    try:
        cursor = db.vulnerabilities.find({"package_id": ObjectId(package_id)})
        async for v in cursor:
            vulns.append(v)
    except Exception:
        cursor = db.vulnerabilities.find({"package_id": package_id})
        async for v in cursor:
            vulns.append(v)

    has_cves = len(vulns) > 0
    has_kev = any(v.get("is_actively_exploited") for v in vulns)
    maintainer_risk = factors.get("maintainer_health_risk", 0.5)

    mitigations = []

    # 1. Action: Patch / Minor Version Bump (Effort 1)
    if has_cves:
        # Patch fixes known CVEs and KEV
        patch_factors = dict(factors)
        patch_factors["vulnerability_severity_normalized"] = 0.0
        patch_factors["active_exploitation_flag"] = 0.0

        projected_patch_score = round(100.0 * (
            0.25 * patch_factors.get("dependents_normalized", 0) +
            0.15 * patch_factors.get("centrality_normalized", 0) +
            0.20 * 0.0 +
            0.10 * 0.0 +
            0.15 * patch_factors.get("maintainer_health_risk", 0.3) +
            0.15 * patch_factors.get("critical_app_exposure", 0)
        ), 1)

        reduction = max(0.0, round(current_score - projected_patch_score, 1))
        effort = 1
        priority = round(reduction / effort, 2)

        # Suggest next patch version
        parts = pkg_ver.split(".")
        suggested_patch = f"{parts[0]}.{parts[1]}.{int(parts[2]) + 1}" if len(parts) >= 3 and parts[2].isdigit() else f"^{pkg_ver}"
        if pkg_name == "lodash" and "4.17.15" in pkg_ver:
            suggested_patch = "4.17.21"
        elif pkg_name == "jsonwebtoken" and "8.5.1" in pkg_ver:
            suggested_patch = "9.0.0"
        elif pkg_name == "urllib3" and "1.26.4" in pkg_ver:
            suggested_patch = "1.26.18"

        mitigations.append({
            "action_type": "patch",
            "title": f"Apply security patch update to {pkg_name}@{suggested_patch}",
            "description": f"Resolves {len(vulns)} known vulnerabilities (including {'CISA KEV exploited CVEs' if has_kev else 'critical/high CVEs'}) without breaking API contract.",
            "target_version_or_package": suggested_patch,
            "effort": effort,
            "effort_label": "Low (Patch)",
            "current_score": current_score,
            "projected_score": projected_patch_score,
            "risk_reduction": reduction,
            "priority_score": priority
        })

    # 2. Action: Major Bump / Framework Modernization (Effort 2)
    major_factors = dict(factors)
    major_factors["vulnerability_severity_normalized"] = 0.0
    major_factors["active_exploitation_flag"] = 0.0
    major_factors["maintainer_health_risk"] = min(0.15, maintainer_risk * 0.5)

    projected_major_score = round(100.0 * (
        0.25 * major_factors.get("dependents_normalized", 0) +
        0.15 * major_factors.get("centrality_normalized", 0) +
        0.20 * 0.0 +
        0.10 * 0.0 +
        0.15 * 0.15 +
        0.15 * major_factors.get("critical_app_exposure", 0)
    ), 1)

    major_reduction = max(0.0, round(current_score - projected_major_score, 1))
    major_effort = 2
    major_priority = round(major_reduction / major_effort, 2)

    parts = pkg_ver.split(".")
    suggested_major = f"{int(parts[0]) + 1}.0.0" if parts and parts[0].isdigit() else "latest"

    mitigations.append({
        "action_type": "major_bump",
        "title": f"Upgrade to next-generation {pkg_name}@{suggested_major}",
        "description": "Adopts modern active release branch, receiving continuous upstream security maintenance and enhanced performance.",
        "target_version_or_package": suggested_major,
        "effort": major_effort,
        "effort_label": "Medium (Major Bump)",
        "current_score": current_score,
        "projected_score": projected_major_score,
        "risk_reduction": major_reduction,
        "priority_score": major_priority
    })

    # 3. Action: Safer Alternative Replacement / Isolation (Effort 3)
    alt_factors = dict(factors)
    alt_factors["vulnerability_severity_normalized"] = 0.0
    alt_factors["active_exploitation_flag"] = 0.0
    alt_factors["maintainer_health_risk"] = 0.05
    alt_factors["centrality_normalized"] = max(0.0, alt_factors.get("centrality_normalized", 0) * 0.6)

    projected_alt_score = round(100.0 * (
        0.25 * alt_factors.get("dependents_normalized", 0) +
        0.15 * alt_factors["centrality_normalized"] +
        0.20 * 0.0 +
        0.10 * 0.0 +
        0.15 * 0.05 +
        0.15 * alt_factors.get("critical_app_exposure", 0)
    ), 1)

    alt_reduction = max(0.0, round(current_score - projected_alt_score, 1))
    alt_effort = 3
    alt_priority = round(alt_reduction / alt_effort, 2)

    alt_name = f"{pkg_name}-es" if ecosystem == "npm" else f"httpx" if pkg_name == "urllib3" else "native-substitute"
    if pkg_name == "lodash":
        alt_name = "lodash-es / native ES6"
    elif pkg_name == "request":
        alt_name = "axios / undici"

    mitigations.append({
        "action_type": "alternative",
        "title": f"Replace with modular alternative ({alt_name})",
        "description": "Eliminates monolithic transitive dependency surface area and adopts tree-shakeable modern standards.",
        "target_version_or_package": alt_name,
        "effort": alt_effort,
        "effort_label": "High (Replace/Isolate)",
        "current_score": current_score,
        "projected_score": projected_alt_score,
        "risk_reduction": alt_reduction,
        "priority_score": alt_priority
    })

    # Sort mitigations by priority score descending
    mitigations.sort(key=lambda x: x["priority_score"], reverse=True)

    # Assign 1-indexed ranks
    for i, m in enumerate(mitigations, 1):
        m["rank"] = i

    return {
        "package_id": package_id,
        "package_name": pkg_name,
        "current_score": current_score,
        "mitigations": mitigations
    }
