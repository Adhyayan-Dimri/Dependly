import os
import json
import logging
import httpx
from typing import Set, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
CACHE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "cisa_kev_cache.json"

class CisaKevService:
    def __init__(self):
        self._cve_set: Set[str] = set()
        self._cve_metadata: Dict[str, Dict[str, Any]] = {}
        self.load_cache()

    def load_cache(self):
        try:
            if CACHE_PATH.exists():
                with open(CACHE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    vulns = data.get("vulnerabilities", [])
                    for item in vulns:
                        cve_id = item.get("cveID", "").upper()
                        if cve_id:
                            self._cve_set.add(cve_id)
                            self._cve_metadata[cve_id] = item
                    logger.info(f"Loaded {len(self._cve_set)} CVEs from CISA KEV local cache.")
        except Exception as e:
            logger.error(f"Failed to load CISA KEV cache: {e}")

    async def refresh_feed(self):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(CISA_KEV_URL)
                if resp.status_code == 200:
                    data = resp.json()
                    vulns = data.get("vulnerabilities", [])
                    new_set = set()
                    new_meta = {}
                    for item in vulns:
                        cve_id = item.get("cveID", "").upper()
                        if cve_id:
                            new_set.add(cve_id)
                            new_meta[cve_id] = item
                    self._cve_set = new_set
                    self._cve_metadata = new_meta
                    
                    # Persist to cache file
                    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
                    with open(CACHE_PATH, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    logger.info(f"Refreshed CISA KEV feed: {len(self._cve_set)} CVEs stored.")
        except Exception as e:
            logger.warning(f"Could not refresh live CISA KEV feed (using cached version): {e}")

    def is_actively_exploited(self, cve_id: str) -> bool:
        if not cve_id:
            return False
        return cve_id.strip().upper() in self._cve_set

    def get_cve_detail(self, cve_id: str) -> Dict[str, Any]:
        return self._cve_metadata.get(cve_id.strip().upper(), {})

cisa_kev_service = CisaKevService()
