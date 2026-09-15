import pytest
from app.services.simulator import semver_satisfies
from app.services.manifest_parser import parse_package_json, parse_requirements_txt
from app.services.typosquat import typosquat_detector
from app.services.risk_scorer import compute_vulnerability_severity_score, compute_maintainer_health_risk

def test_semver_satisfies():
    # Caret range
    assert semver_satisfies("4.17.15", "^4.17.0") is True
    assert semver_satisfies("5.0.0", "^4.17.0") is False
    
    # Tilde range
    assert semver_satisfies("1.2.3", "~1.2.0") is True
    assert semver_satisfies("1.3.0", "~1.2.0") is False
    
    # Exact and wildcard
    assert semver_satisfies("1.0.0", "1.0.0") is True
    assert semver_satisfies("2.1.0", "*") is True
    
    # Greater than equal
    assert semver_satisfies("2.28.1", ">=2.0.0") is True
    assert semver_satisfies("1.9.0", ">=2.0.0") is False

def test_manifest_parser_package_json():
    pkg_json = """
    {
      "name": "my-secure-api",
      "dependencies": {
        "express": "^4.18.2",
        "lodash": "4.17.15"
      },
      "devDependencies": {
        "jest": "^29.5.0"
      }
    }
    """
    deps, name = parse_package_json(pkg_json)
    assert name == "my-secure-api"
    assert len(deps) == 3
    
    prod_names = [d.name for d in deps if not d.is_dev]
    assert "express" in prod_names
    assert "lodash" in prod_names
    
    dev_names = [d.name for d in deps if d.is_dev]
    assert "jest" in dev_names

def test_manifest_parser_requirements_txt():
    req_txt = """
    # Primary API dependencies
    requests>=2.28.0
    urllib3==1.26.4
    pandas[all]>=2.0.0
    --extra-index-url https://example.com
    """
    deps, _ = parse_requirements_txt(req_txt)
    assert len(deps) == 3
    dep_names = [d.name for d in deps]
    assert "requests" in dep_names
    assert "urllib3" in dep_names
    assert "pandas" in dep_names

def test_typosquat_detection():
    # "reqeusts" is distance 1 from "requests"
    res = typosquat_detector.check_package("pypi", "reqeusts")
    assert res is not None
    assert res["suspected_target"] == "requests"
    assert res["edit_distance"] <= 2
    
    # "requests" exact is NOT a typosquat
    assert typosquat_detector.check_package("pypi", "requests") is None

def test_risk_factors():
    vulns = [
        {"severity": "critical", "is_actively_exploited": True},
        {"severity": "high", "is_actively_exploited": False}
    ]
    sev_score = compute_vulnerability_severity_score(vulns)
    assert 0.7 <= sev_score <= 1.0

    pkg = {"maintainers": ["single-person"], "scorecard_score": 4.0}
    health_risk = compute_maintainer_health_risk(pkg)
    assert 0.05 <= health_risk <= 1.0
