import re
import base64
import httpx
import logging
from typing import Tuple, Optional
from app.config import settings
from app.services.manifest_parser import parse_manifest_content, DirectDependencyRef

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"

def extract_owner_repo(repo_url: str) -> Tuple[str, str]:
    """
    Extracts owner and repo from standard GitHub URLs:
    e.g. https://github.com/expressjs/express or github.com/pallets/flask
    """
    clean_url = repo_url.strip().rstrip("/")
    pattern = r"(?:https?://)?(?:www\.)?github\.com/([^/]+)/([^/]+)"
    match = re.search(pattern, clean_url)
    if not match:
        raise ValueError(
            f"Invalid GitHub repository URL format '{repo_url}'. Expected format: https://github.com/{{owner}}/{{repo}}"
        )
    owner = match.group(1)
    repo = match.group(2).replace(".git", "")
    return owner, repo

async def fetch_github_manifest(repo_url: str) -> Tuple[str, str, str]:
    """
    Attempts to fetch package.json, falling back to requirements.txt from the repo's default branch.
    Returns (filename, decoded_content, app_name)
    """
    owner, repo = extract_owner_repo(repo_url)
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "RippleEffect-RiskAnalyzer/1.0"
    }
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    manifest_candidates = ["package.json", "requirements.txt"]

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        # First try GitHub REST API
        for filename in manifest_candidates:
            url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{filename}"
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if "content" in data and data.get("encoding") == "base64":
                        raw_bytes = base64.b64decode(data["content"])
                        content = raw_bytes.decode("utf-8", errors="replace")
                        return filename, content, f"{owner}/{repo}"
            except Exception as e:
                logger.warning(f"API fetch error for {filename}: {e}")

        # Fallback to direct raw.githubusercontent.com (No API rate limits)
        branches = ["main", "master", "HEAD"]
        for filename in manifest_candidates:
            for branch in branches:
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{filename}"
                try:
                    resp = await client.get(raw_url)
                    if resp.status_code == 200 and resp.text.strip():
                        return filename, resp.text, f"{owner}/{repo}"
                except Exception as e:
                    logger.warning(f"Raw fetch error for {raw_url}: {e}")

    raise FileNotFoundError(
        f"Neither 'package.json' nor 'requirements.txt' was found in the root directory of repository '{owner}/{repo}'."
    )
