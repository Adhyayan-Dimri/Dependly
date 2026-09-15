import httpx
import logging
from typing import Dict, Any, List, Optional
import urllib.parse

logger = logging.getLogger(__name__)

DEPS_DEV_API_BASE = "https://api.deps.dev/v3"

# In-memory local cache for deps.dev responses
_DEPS_CACHE: Dict[str, Dict[str, Any]] = {}

async def get_package_version_info(ecosystem: str, name: str, version: str) -> Optional[Dict[str, Any]]:
    """
    Calls deps.dev API v3 /systems/{system}/packages/{package}/versions/{version}
    """
    sys_name = "npm" if ecosystem.lower() == "npm" else "pypi"
    encoded_pkg = urllib.parse.quote(name, safe="")
    cache_key = f"ver:{sys_name}:{name}:{version}"
    
    if cache_key in _DEPS_CACHE:
        return _DEPS_CACHE[cache_key]

    url = f"{DEPS_DEV_API_BASE}/systems/{sys_name}/packages/{encoded_pkg}/versions/{version}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                _DEPS_CACHE[cache_key] = data
                return data
    except Exception as e:
        logger.warning(f"deps.dev version query failed for {name}@{version}: {e}")
    
    return None

async def get_dependency_tree(ecosystem: str, name: str, version: str) -> Optional[Dict[str, Any]]:
    """
    Calls deps.dev API v3 /systems/{system}/packages/{package}/versions/{version}:dependencies
    """
    sys_name = "npm" if ecosystem.lower() == "npm" else "pypi"
    encoded_pkg = urllib.parse.quote(name, safe="")
    cache_key = f"tree:{sys_name}:{name}:{version}"
    
    if cache_key in _DEPS_CACHE:
        return _DEPS_CACHE[cache_key]

    url = f"{DEPS_DEV_API_BASE}/systems/{sys_name}/packages/{encoded_pkg}/versions/{version}:dependencies"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                _DEPS_CACHE[cache_key] = data
                return data
    except Exception as e:
        logger.warning(f"deps.dev tree query failed for {name}@{version}: {e}")

    return None

async def get_project_scorecard(ecosystem: str, name: str, version: str) -> Optional[float]:
    """
    Extract OpenSSF Scorecard overall score from deps.dev
    """
    info = await get_package_version_info(ecosystem, name, version)
    if not info:
        return None
    
    # Check for scorecard under projects
    projects = info.get("projects", [])
    for p in projects:
        scorecard = p.get("scorecard")
        if scorecard and "overallScore" in scorecard:
            try:
                return float(scorecard["overallScore"])
            except (ValueError, TypeError):
                pass
    return None
