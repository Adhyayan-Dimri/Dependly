import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from rapidfuzz.distance import Levenshtein

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

class TyposquatDetector:
    def __init__(self):
        self.npm_top_packages: List[str] = []
        self.pypi_top_packages: List[str] = []
        self.load_corpus()

    def load_corpus(self):
        try:
            npm_path = DATA_DIR / "top_npm_packages.json"
            if npm_path.exists():
                with open(npm_path, "r", encoding="utf-8") as f:
                    self.npm_top_packages = json.load(f)
            
            pypi_path = DATA_DIR / "top_pypi_packages.json"
            if pypi_path.exists():
                with open(pypi_path, "r", encoding="utf-8") as f:
                    self.pypi_top_packages = json.load(f)
                    
            logger.info(f"Loaded {len(self.npm_top_packages)} npm and {len(self.pypi_top_packages)} PyPI top packages for typosquat detection.")
        except Exception as e:
            logger.error(f"Error loading typosquat corpus: {e}")

    def check_package(self, ecosystem: str, package_name: str) -> Optional[Dict[str, Any]]:
        name_clean = package_name.strip().lower()
        candidates = self.npm_top_packages if ecosystem.lower() == "npm" else self.pypi_top_packages
        
        # Exact matches are NOT typosquats
        if name_clean in [c.lower() for c in candidates]:
            return None

        for candidate in candidates:
            cand_clean = candidate.lower()
            # Calculate Levenshtein distance
            dist = Levenshtein.distance(name_clean, cand_clean)
            if 1 <= dist <= 2 and len(name_clean) > 3:
                return {
                    "package_name": package_name,
                    "ecosystem": ecosystem,
                    "suspected_target": candidate,
                    "edit_distance": dist
                }
        return None

typosquat_detector = TyposquatDetector()
