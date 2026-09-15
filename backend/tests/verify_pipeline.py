import asyncio
import logging
from app.database import connect_to_mongo, get_db, close_mongo_connection
from app.seed.seed_data import seed_demo_data
from app.services.graph_engine import graph_engine
from app.services.simulator import compromise_simulator
from app.services.mitigations import get_ranked_mitigations
from app.services.explain_ai import explain_package_risk

logging.basicConfig(level=logging.INFO)

async def test_full_pipeline():
    await connect_to_mongo()
    db = await get_db()
    
    # 1. Seed demo data
    await seed_demo_data(db, force=True)
    
    # 2. Check applications in DB
    apps = []
    async for a in db.applications.find({}):
        apps.append(a)
    print(f"\n[OK] Seeded {len(apps)} applications successfully:")
    for a in apps:
        print(f"  - {a['name']} ({a['criticality_tag']}) - {len(a['direct_deps'])} direct deps")

    # 3. Find lodash package
    lodash_pkg = await db.packages.find_one({"name": "lodash", "version": "4.17.15"})
    assert lodash_pkg is not None
    lodash_id = str(lodash_pkg["_id"])
    print(f"\n[OK] Found lodash@4.17.15 (ID: {lodash_id})")

    # 4. Test compromise simulation on lodash
    sim_res = compromise_simulator.simulate_compromise(lodash_id, execution_type="install_time")
    print(f"\n[OK] Simulation result for lodash@4.17.15:")
    print(f"  - Blast radius: {sim_res['blast_radius']}")
    print(f"  - Affected apps: {[a['name'] for a in sim_res['affected_applications']]}")
    print(f"  - Customer facing apps: {sim_res['customer_facing_apps_count']}")
    print(f"  - Estimated cost: ${sim_res['estimated_cost']:,.2f}")
    print(f"  - Max depth: {sim_res['max_depth']}")
    print(f"  - Propagation paths count: {len(sim_res['propagation_paths'])}")

    # 5. Test mitigations
    mitig_res = await get_ranked_mitigations(db, lodash_id)
    print(f"\n[OK] Mitigations for lodash@4.17.15:")
    for m in mitig_res["mitigations"]:
        print(f"  - Rank {m['rank']}: {m['title']} | Effort: {m['effort']} ({m['effort_label']}) | Risk: {m['current_score']} -> {m['projected_score']} (Diff: -{m['risk_reduction']}) | Priority: {m['priority_score']}")

    # 6. Test explain AI
    explain_res = await explain_package_risk(db, lodash_id)
    print(f"\n[OK] Explain AI narration (Provider: {explain_res['provider']}):")
    print(f"  {explain_res['narration']}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
