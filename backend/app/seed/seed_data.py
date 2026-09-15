import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.services.graph_engine import graph_engine
from app.services.risk_scorer import calculate_and_store_risk_score

logger = logging.getLogger(__name__)

async def seed_demo_data(db: AsyncIOMotorDatabase, force: bool = False):
    """
    Hardcodes 3 pre-resolved seeded demo applications with real, citable CVEs (§3.1).
    Offline-safe fallback: fully caches graphs so demo works with zero live network calls.
    """
    app_count = await db.applications.count_documents({"source": "seeded"})
    if app_count >= 3 and not force:
        logger.info("Demo applications already seeded in database.")
        await graph_engine.rebuild_graph_from_db(db)
        return

    logger.info("Seeding 3 offline-safe demo applications with real CVE graphs...")

    # Clear previous seeded apps if force
    if force:
        await db.applications.delete_many({"source": "seeded"})

    # --- 1. DEFINING PACKAGES ---
    packages_data = [
        # NPM Packages
        {"name": "lodash", "version": "4.17.15", "ecosystem": "npm", "scorecard_score": 4.8, "maintainers": ["jdalton"]},
        {"name": "express", "version": "4.18.2", "ecosystem": "npm", "scorecard_score": 7.5, "maintainers": ["dougwilson", "wesleytodd"]},
        {"name": "axios", "version": "0.21.1", "ecosystem": "npm", "scorecard_score": 6.8, "maintainers": ["jasonsaayman"]},
        {"name": "cors", "version": "2.8.5", "ecosystem": "npm", "scorecard_score": 6.0, "maintainers": ["dougwilson"]},
        {"name": "dotenv", "version": "16.0.3", "ecosystem": "npm", "scorecard_score": 8.0, "maintainers": ["motdotla"]},
        {"name": "qs", "version": "6.10.3", "ecosystem": "npm", "scorecard_score": 6.2, "maintainers": ["ljharb"]},
        {"name": "body-parser", "version": "1.20.1", "ecosystem": "npm", "scorecard_score": 7.1, "maintainers": ["dougwilson"]},
        {"name": "bytes", "version": "3.1.2", "ecosystem": "npm", "scorecard_score": 7.0, "maintainers": ["dougwilson"]},
        {"name": "raw-body", "version": "2.5.1", "ecosystem": "npm", "scorecard_score": 6.9, "maintainers": ["dougwilson"]},
        {"name": "debug", "version": "2.6.9", "ecosystem": "npm", "scorecard_score": 5.2, "maintainers": ["qix"]},
        {"name": "ms", "version": "2.0.0", "ecosystem": "npm", "scorecard_score": 7.2, "maintainers": ["zeit"]},
        {"name": "follow-redirects", "version": "1.14.8", "ecosystem": "npm", "scorecard_score": 6.4, "maintainers": ["rubenverborgh"]},
        
        # Auth Packages
        {"name": "jsonwebtoken", "version": "8.5.1", "ecosystem": "npm", "scorecard_score": 5.4, "maintainers": ["auth0"]},
        {"name": "bcrypt", "version": "5.1.0", "ecosystem": "npm", "scorecard_score": 7.4, "maintainers": ["kelektiv"]},
        {"name": "redis", "version": "4.6.7", "ecosystem": "npm", "scorecard_score": 8.1, "maintainers": ["leibale"]},
        {"name": "helmet", "version": "7.0.0", "ecosystem": "npm", "scorecard_score": 8.7, "maintainers": ["evanshortiss"]},
        {"name": "cookie-parser", "version": "1.4.6", "ecosystem": "npm", "scorecard_score": 6.5, "maintainers": ["dougwilson"]},
        {"name": "jws", "version": "3.2.2", "ecosystem": "npm", "scorecard_score": 5.1, "maintainers": ["brianloveswords"]},
        {"name": "jwa", "version": "1.4.1", "ecosystem": "npm", "scorecard_score": 5.0, "maintainers": ["brianloveswords"]},
        {"name": "buffer-equal-constant-time", "version": "1.0.1", "ecosystem": "npm", "scorecard_score": 4.0, "maintainers": ["goInstant"]},
        {"name": "safe-buffer", "version": "5.2.1", "ecosystem": "npm", "scorecard_score": 6.2, "maintainers": ["feross"]},
        
        # PyPI Packages
        {"name": "urllib3", "version": "1.26.4", "ecosystem": "pypi", "scorecard_score": 6.1, "maintainers": ["sethmichael"]},
        {"name": "requests", "version": "2.28.1", "ecosystem": "pypi", "scorecard_score": 7.8, "maintainers": ["kennethreitz"]},
        {"name": "pandas", "version": "2.0.3", "ecosystem": "pypi", "scorecard_score": 8.4, "maintainers": ["wesm"]},
        {"name": "pydantic", "version": "2.4.2", "ecosystem": "pypi", "scorecard_score": 8.9, "maintainers": ["samuelcolvin"]},
        {"name": "celery", "version": "5.3.1", "ecosystem": "pypi", "scorecard_score": 7.2, "maintainers": ["ask"]},
        {"name": "certifi", "version": "2022.12.7", "ecosystem": "pypi", "scorecard_score": 8.5, "maintainers": ["glyph"]},
        {"name": "charset-normalizer", "version": "2.1.1", "ecosystem": "pypi", "scorecard_score": 7.0, "maintainers": ["ousret"]},
        {"name": "idna", "version": "3.4", "ecosystem": "pypi", "scorecard_score": 8.0, "maintainers": ["kjd"]},
        {"name": "kombu", "version": "5.3.1", "ecosystem": "pypi", "scorecard_score": 7.1, "maintainers": ["ask"]},
        {"name": "vine", "version": "5.0.0", "ecosystem": "pypi", "scorecard_score": 6.0, "maintainers": ["ask"]}
    ]

    pkg_id_map = {}
    for p in packages_data:
        existing = await db.packages.find_one({"ecosystem": p["ecosystem"], "name": p["name"], "version": p["version"]})
        if existing:
            p_id = existing["_id"]
        else:
            doc = {
                "ecosystem": p["ecosystem"],
                "name": p["name"],
                "version": p["version"],
                "maintainers": p.get("maintainers", []),
                "last_release_date": datetime(2023, 1, 15, tzinfo=timezone.utc),
                "scorecard_score": p.get("scorecard_score"),
                "download_rank": 100
            }
            res = await db.packages.insert_one(doc)
            p_id = res.inserted_id
        
        pkg_id_map[f"{p['ecosystem']}:{p['name']}@{p['version']}"] = p_id

    # --- 2. VULNERABILITIES WITH REAL CITABLE CVEs ---
    vulns_to_seed = [
        {
            "pkg_key": "npm:lodash@4.17.15",
            "cve_id": "CVE-2019-10744",
            "severity": "critical",
            "is_actively_exploited": True,
            "summary": "Prototype Pollution in lodash via defaultsDeep allows arbitrary property injection and RCE.",
            "disclosed_date": datetime(2019, 7, 15, tzinfo=timezone.utc)
        },
        {
            "pkg_key": "npm:lodash@4.17.15",
            "cve_id": "CVE-2020-8203",
            "severity": "high",
            "is_actively_exploited": True,
            "summary": "Prototype pollution via zipObjectDeep function in lodash versions < 4.17.19.",
            "disclosed_date": datetime(2020, 7, 15, tzinfo=timezone.utc)
        },
        {
            "pkg_key": "npm:jsonwebtoken@8.5.1",
            "cve_id": "CVE-2022-23529",
            "severity": "critical",
            "is_actively_exploited": True,
            "summary": "Insecure key retrieval in jsonwebtoken allows remote code execution when secretOrPublicKey is crafted.",
            "disclosed_date": datetime(2022, 12, 21, tzinfo=timezone.utc)
        },
        {
            "pkg_key": "npm:axios@0.21.1",
            "cve_id": "CVE-2021-3749",
            "severity": "high",
            "is_actively_exploited": False,
            "summary": "Regular Expression Denial of Service in trim function.",
            "disclosed_date": datetime(2021, 8, 30, tzinfo=timezone.utc)
        },
        {
            "pkg_key": "pypi:urllib3@1.26.4",
            "cve_id": "CVE-2021-33503",
            "severity": "high",
            "is_actively_exploited": True,
            "summary": "Catastrophic ReDoS in authority parsing in urllib3.",
            "disclosed_date": datetime(2021, 6, 4, tzinfo=timezone.utc)
        }
    ]

    for v in vulns_to_seed:
        p_id = pkg_id_map.get(v["pkg_key"])
        if p_id:
            await db.vulnerabilities.update_one(
                {"package_id": p_id, "cve_id": v["cve_id"]},
                {"$set": {
                    "package_id": p_id,
                    "cve_id": v["cve_id"],
                    "severity": v["severity"],
                    "is_actively_exploited": v["is_actively_exploited"],
                    "summary": v["summary"],
                    "disclosed_date": v["disclosed_date"]
                }},
                upsert=True
            )

    # --- 3. TRANSITIVE DEPENDENCY EDGES ---
    edges_to_seed = [
        # express -> body-parser, qs, debug (debug as dev)
        ("npm:express@4.18.2", "npm:body-parser@1.20.1", "^1.20.1", False),
        ("npm:express@4.18.2", "npm:qs@6.10.3", "6.10.3", False),
        ("npm:express@4.18.2", "npm:debug@2.6.9", "2.6.9", True),
        
        # body-parser -> bytes, raw-body, qs
        ("npm:body-parser@1.20.1", "npm:bytes@3.1.2", "3.1.2", False),
        ("npm:body-parser@1.20.1", "npm:raw-body@2.5.1", "2.5.1", False),
        ("npm:body-parser@1.20.1", "npm:qs@6.10.3", "6.10.3", False),

        # debug -> ms (ms as dev since debug is dev)
        ("npm:debug@2.6.9", "npm:ms@2.0.0", "2.0.0", True),

        # axios -> follow-redirects
        ("npm:axios@0.21.1", "npm:follow-redirects@1.14.8", "^1.14.0", False),

        # jsonwebtoken -> jws, lodash (lodash as dev)
        ("npm:jsonwebtoken@8.5.1", "npm:jws@3.2.2", "^3.2.2", False),
        ("npm:jsonwebtoken@8.5.1", "npm:lodash@4.17.15", "^4.17.15", True),

        # jws -> jwa, safe-buffer
        ("npm:jws@3.2.2", "npm:jwa@1.4.1", "^1.4.1", False),
        ("npm:jws@3.2.2", "npm:safe-buffer@5.2.1", "^5.0.1", False),

        # jwa -> buffer-equal-constant-time
        ("npm:jwa@1.4.1", "npm:buffer-equal-constant-time@1.0.1", "1.0.1", False),

        # requests -> urllib3, certifi, charset-normalizer, idna
        ("pypi:requests@2.28.1", "pypi:urllib3@1.26.4", ">=1.21.1,<1.27", False),
        ("pypi:requests@2.28.1", "pypi:certifi@2022.12.7", ">=2017.4.17", False),
        ("pypi:requests@2.28.1", "pypi:charset-normalizer@2.1.1", ">=2,<3", False),
        ("pypi:requests@2.28.1", "pypi:idna@3.4", ">=2.5,<4", False),

        # celery -> kombu (kombu as dev)
        ("pypi:celery@5.3.1", "pypi:kombu@5.3.1", ">=5.3.1,<6.0", True),
        # kombu -> vine
        ("pypi:kombu@5.3.1", "pypi:vine@5.0.0", ">=5.0.0,<6.0", True)
    ]

    for from_k, to_k, vrange, is_dev in edges_to_seed:
        f_id = pkg_id_map.get(from_k)
        t_id = pkg_id_map.get(to_k)
        if f_id and t_id:
            await db.dependencies.update_one(
                {"from_package_id": f_id, "to_package_id": t_id},
                {"$set": {
                    "from_package_id": f_id,
                    "to_package_id": t_id,
                    "version_range": vrange,
                    "is_dev_dependency": is_dev
                }},
                upsert=True
            )

    # --- 4. SEEDED APPLICATIONS ---
    demo_apps = [
        {
            "name": "ShopSphere E-Commerce Backend",
            "criticality_tag": "customer_facing",
            "source": "seeded",
            "source_ref": "demo/ecommerce-backend",
            "direct_deps": [
                pkg_id_map["npm:express@4.18.2"],
                pkg_id_map["npm:lodash@4.17.15"],
                pkg_id_map["npm:axios@0.21.1"],
                pkg_id_map["npm:cors@2.8.5"],
                pkg_id_map["npm:dotenv@16.0.3"]
            ]
        },
        {
            "name": "CloudAuth Identity Gateway",
            "criticality_tag": "customer_facing",
            "source": "seeded",
            "source_ref": "demo/auth-gateway",
            "direct_deps": [
                pkg_id_map["npm:jsonwebtoken@8.5.1"],
                pkg_id_map["npm:bcrypt@5.1.0"],
                pkg_id_map["npm:redis@4.6.7"],
                pkg_id_map["npm:helmet@7.0.0"],
                pkg_id_map["npm:cookie-parser@1.4.6"]
            ]
        },
        {
            "name": "Telemetry Data Pipeline",
            "criticality_tag": "internal",
            "source": "seeded",
            "source_ref": "demo/data-pipeline",
            "direct_deps": [
                pkg_id_map["pypi:urllib3@1.26.4"],
                pkg_id_map["pypi:requests@2.28.1"],
                pkg_id_map["pypi:pandas@2.0.3"],
                pkg_id_map["pypi:pydantic@2.4.2"],
                pkg_id_map["pypi:celery@5.3.1"]
            ]
        }
    ]

    for app_info in demo_apps:
        await db.applications.update_one(
            {"name": app_info["name"], "source": "seeded"},
            {"$set": {
                "name": app_info["name"],
                "criticality_tag": app_info["criticality_tag"],
                "source": app_info["source"],
                "source_ref": app_info["source_ref"],
                "direct_deps": app_info["direct_deps"],
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )

    # --- 5. REBUILD GRAPH & COMPUTE RISK SCORES ---
    await graph_engine.rebuild_graph_from_db(db)

    async for pkg in db.packages.find({}):
        await calculate_and_store_risk_score(db, str(pkg["_id"]), package_doc=pkg)

    logger.info("Demo applications seed complete. In-memory graph and risk scores fully initialized.")
