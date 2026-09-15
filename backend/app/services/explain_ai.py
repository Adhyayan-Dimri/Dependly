import logging
from typing import Dict, Any, List, Optional
import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.config import settings
from app.services.graph_engine import graph_engine

logger = logging.getLogger(__name__)

OPENROUTER_MODELS = [
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
    "anthropic/claude-3.5-sonnet:beta",
    "google/gemini-2.0-flash-001"
]

def generate_local_deterministic_explanation(
    name: str,
    version: str,
    score: float,
    dependents_count: int,
    critical_count: int,
    centrality: float,
    maintainer_risk: float,
    vulns: List[Dict[str, Any]]
) -> str:
    """
    High-fidelity deterministic plain-language fallback that strictly adheres to the stored numbers.
    """
    has_kev = any(v.get("is_actively_exploited") for v in vulns)
    cve_count = len(vulns)
    cve_str = f"{cve_count} known vulnerabilit{'ies' if cve_count != 1 else 'y'} ({', '.join(v.get('cve_id', '') for v in vulns[:2])})" if cve_count else "no active CVEs"

    sentences = []
    
    # Sentence 1: Score & vulnerability / KEV presence
    if has_kev:
        sentences.append(
            f"{name}@{version} carries an elevated risk score of {score:.1f}/100, driven by actively exploited vulnerabilities cataloged in CISA KEV ({cve_str})."
        )
    elif cve_count > 0:
        sentences.append(
            f"{name}@{version} has an evaluated risk score of {score:.1f}/100, primarily impacted by {cve_str} and a maintainer risk index of {maintainer_risk:.2f}."
        )
    else:
        sentences.append(
            f"{name}@{version} maintains a healthy baseline score of {score:.1f}/100 with zero active CVEs and a maintainer risk index of {maintainer_risk:.2f}."
        )

    # Sentence 2: Graph centrality & application exposure
    if dependents_count > 0:
        sentences.append(
            f"It occupies a structural centrality of {centrality:.2f} across the graph, directly or transitively affecting {dependents_count} dependent component{'s' if dependents_count != 1 else ''}, including {critical_count} customer-facing application{'s' if critical_count != 1 else ''}."
        )
    else:
        sentences.append(
            f"Its structural graph centrality is measured at {centrality:.2f}, isolated from critical customer-facing production paths."
        )

    return " ".join(sentences)

async def explain_package_risk(db: AsyncIOMotorDatabase, package_id: str) -> Dict[str, Any]:
    """
    Builds a strictly constrained prompt containing ONLY stored factor numbers
    and calls OpenRouter / Anthropic / Gemini / or Local Engine.
    """
    try:
        pkg = await db.packages.find_one({"_id": ObjectId(package_id)})
    except Exception:
        pkg = await db.packages.find_one({"_id": package_id})

    if not pkg:
        return {
            "package_id": package_id,
            "package_name": "unknown",
            "narration": "Package information not found.",
            "prompt_used": "",
            "provider": "none"
        }

    pkg_name = pkg.get("name", "package")
    pkg_ver = pkg.get("version", "1.0.0")

    # Fetch stored risk score and factor breakdown
    try:
        risk_doc = await db.risk_scores.find_one({"package_id": ObjectId(package_id)})
    except Exception:
        risk_doc = await db.risk_scores.find_one({"package_id": package_id})

    score = risk_doc.get("score", 0.0) if risk_doc else 0.0
    factors = risk_doc.get("factor_breakdown", {}) if risk_doc else {}

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

    # Dependent applications
    dependent_apps = graph_engine.get_dependent_apps(package_id)
    dependents_count = graph_engine.get_dependents_count(package_id)
    critical_count = sum(1 for a in dependent_apps if a.get("criticality_tag") == "customer_facing")

    vuln_summary_list = []
    for v in vulns:
        kev_txt = " (ACTIVELY EXPLOITED / CISA KEV)" if v.get("is_actively_exploited") else ""
        vuln_summary_list.append(f"{v.get('cve_id')} [{v.get('severity', 'medium').upper()}]{kev_txt}")
    vuln_str = ", ".join(vuln_summary_list) if vuln_summary_list else "None"

    centrality = factors.get("centrality_normalized", 0.0)
    maintainer_risk = factors.get("maintainer_health_risk", 0.2)

    # Assembling prompt strictly per §5.5 specification
    prompt = (
        f"Package: {pkg_name}@{pkg_ver}\n"
        f"Score: {score}/100\n"
        f"Used by: {dependents_count} dependents ({critical_count} customer-facing applications)\n"
        f"Centrality: {centrality:.2f}\n"
        f"Maintainer health risk factor: {maintainer_risk:.2f}\n"
        f"Vulnerabilities: {vuln_str}\n\n"
        f"Write 2-3 sentences explaining this risk score in plain language, referencing only the numbers above."
    )

    narration = ""
    provider_used = "local"

    # Attempt OpenRouter LLM call if key is present
    if settings.OPENROUTER_API_KEY:
        models_to_try = [settings.OPENROUTER_MODEL] + [m for m in OPENROUTER_MODELS if m != settings.OPENROUTER_MODEL]
        for model_name in models_to_try:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://ripple-effect.security",
                    "X-Title": "Ripple Effect Dependency Risk Analyzer",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": model_name,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are Ripple Effect's Security Explainability Engine. Your task is to explain pre-calculated dependency risk metrics in exactly 2-3 clear, authoritative, factual sentences. Never invent facts or calculate scores. Cite the numbers provided directly."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.2,
                    "max_tokens": 200
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
                    if res.status_code == 200:
                        json_data = res.json()
                        choices = json_data.get("choices", [])
                        if choices and "message" in choices[0]:
                            narration = choices[0]["message"]["content"].strip()
                            provider_used = f"OpenRouter ({model_name})"
                            break
            except Exception as e:
                logger.warning(f"OpenRouter narration failed for model {model_name}: {e}")

    # Fallback to local deterministic narration if LLM was unavailable
    if not narration:
        narration = generate_local_deterministic_explanation(
            name=pkg_name,
            version=pkg_ver,
            score=score,
            dependents_count=dependents_count,
            critical_count=critical_count,
            centrality=centrality,
            maintainer_risk=maintainer_risk,
            vulns=vulns
        )
        provider_used = "Deterministic Rule Engine (Offline)"

    return {
        "package_id": package_id,
        "package_name": pkg_name,
        "narration": narration,
        "prompt_used": prompt,
        "provider": provider_used
    }
