import httpx
import logging
from typing import List, Dict, Any
from app.services.cisa_kev import cisa_kev_service

logger = logging.getLogger(__name__)

OSV_QUERY_URL = "https://api.osv.dev/v1/query"

# Local memory cache for package vulnerabilities
_VULN_CACHE: Dict[str, List[Dict[str, Any]]] = {}

async def query_osv_vulnerabilities(ecosystem: str, name: str, version: str) -> List[Dict[str, Any]]:
    cache_key = f"{ecosystem}:{name}:{version}"
    if cache_key in _VULN_CACHE:
        return _VULN_CACHE[cache_key]

    osv_ecosystem = "npm" if ecosystem.lower() == "npm" else "PyPI"
    payload = {
        "package": {
            "name": name,
            "ecosystem": osv_ecosystem
        },
        "version": version
    }

    vulnerabilities = []
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(OSV_QUERY_URL, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                vulns_raw = data.get("vulns", [])
                for v in vulns_raw:
                    # Extract CVE or GHSA
                    aliases = v.get("aliases", [])
                    cve_id = next((a for a in aliases if a.startswith("CVE-")), v.get("id", "UNKNOWN"))
                    
                    # Compute severity
                    severity = "medium"
                    if "database_specific" in v and "severity" in v["database_specific"]:
                        raw_sev = str(v["database_specific"]["severity"]).lower()
                        if "crit" in raw_sev:
                            severity = "critical"
                        elif "high" in raw_sev:
                            severity = "high"
                        elif "low" in raw_sev:
                            severity = "low"
                        else:
                            severity = "medium"
                    elif "severity" in v:
                        # CVSS check
                        sev_items = v.get("severity", [])
                        for s in sev_items:
                            score_str = s.get("score", "")
                            if "CVSS" in score_str:
                                severity = "high"

                    is_kev = cisa_kev_service.is_actively_exploited(cve_id)
                    if is_kev:
                        severity = "critical"

                    vulnerabilities.append({
                        "cve_id": cve_id,
                        "severity": severity,
                        "is_actively_exploited": is_kev,
                        "summary": v.get("summary", v.get("details", "")[:120]),
                        "disclosed_date": v.get("published")
                    })
    except Exception as e:
        logger.warning(f"OSV lookup failed for {name}@{version}: {e}")

    _VULN_CACHE[cache_key] = vulnerabilities
    return vulnerabilities
