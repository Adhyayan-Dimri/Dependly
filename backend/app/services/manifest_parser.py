import json
import re
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

class DirectDependencyRef:
    def __init__(self, name: str, version_range: str, ecosystem: str, is_dev: bool = False):
        self.name = name.strip()
        self.version_range = version_range.strip() if version_range else "*"
        self.ecosystem = ecosystem.lower()
        self.is_dev = is_dev

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version_range": self.version_range,
            "ecosystem": self.ecosystem,
            "is_dev": self.is_dev
        }

def parse_package_json(content: str) -> Tuple[List[DirectDependencyRef], str]:
    """
    Parses package.json content to extract direct dependencies and project name.
    """
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format in package.json: {str(e)}")

    if not isinstance(data, dict):
        raise ValueError("Root of package.json must be a JSON object.")

    app_name = data.get("name", "unnamed-node-app")
    deps_list: List[DirectDependencyRef] = []

    # Production dependencies
    prod_deps = data.get("dependencies", {})
    if isinstance(prod_deps, dict):
        for name, ver in prod_deps.items():
            if isinstance(name, str) and isinstance(ver, str):
                deps_list.append(DirectDependencyRef(name=name, version_range=ver, ecosystem="npm", is_dev=False))

    # Dev dependencies
    dev_deps = data.get("devDependencies", {})
    if isinstance(dev_deps, dict):
        for name, ver in dev_deps.items():
            if isinstance(name, str) and isinstance(ver, str):
                deps_list.append(DirectDependencyRef(name=name, version_range=ver, ecosystem="npm", is_dev=True))

    return deps_list, app_name

def parse_requirements_txt(content: str) -> Tuple[List[DirectDependencyRef], str]:
    """
    Parses requirements.txt content line-by-line.
    """
    lines = content.splitlines()
    deps_list: List[DirectDependencyRef] = []

    for raw_line in lines:
        line = raw_line.strip()
        # Strip comments
        if not line or line.startswith("#") or line.startswith("-r") or line.startswith("-i") or line.startswith("--"):
            continue

        # Split on standard specifiers: ==, >=, <=, ~=, !=, >, <
        match = re.split(r"(==|>=|<=|~=|!=|>|<)", line, maxsplit=1)
        if match:
            pkg_name = match[0].strip()
            # Clean extras e.g. requests[security] -> requests
            pkg_name = re.sub(r"\[.*?\]", "", pkg_name)
            
            if len(match) >= 3:
                op = match[1].strip()
                ver = match[2].strip()
                version_range = f"{op}{ver}"
            else:
                version_range = "*"

            if pkg_name:
                deps_list.append(DirectDependencyRef(
                    name=pkg_name,
                    version_range=version_range,
                    ecosystem="pypi",
                    is_dev=False
                ))

    return deps_list, "unnamed-python-app"

def parse_manifest_content(filename: str, content: str) -> Tuple[List[DirectDependencyRef], str, str]:
    """
    Dispatches to appropriate parser based on filename.
    Returns (dependencies_list, detected_app_name, ecosystem)
    """
    clean_fn = filename.lower()
    if clean_fn.endswith("package.json"):
        deps, app_name = parse_package_json(content)
        return deps, app_name, "npm"
    elif clean_fn.endswith("requirements.txt"):
        deps, app_name = parse_requirements_txt(content)
        return deps, app_name, "pypi"
    else:
        raise ValueError(
            f"Unsupported manifest file: '{filename}'. Ripple Effect currently accepts only 'package.json' (npm) or 'requirements.txt' (PyPI)."
        )
