import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_manager = DatabaseManager()

async def get_db() -> AsyncIOMotorDatabase:
    return db_manager.db

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
    db_manager.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_manager.db = db_manager.client[settings.DATABASE_NAME]
    
    # Initialize indexes
    try:
        # packages: unique (ecosystem, name, version)
        await db_manager.db.packages.create_index(
            [("ecosystem", 1), ("name", 1), ("version", 1)],
            unique=True,
            name="ecosystem_name_version_unique"
        )
        await db_manager.db.packages.create_index("name")
        
        # dependencies: from_package_id, to_package_id
        await db_manager.db.dependencies.create_index("from_package_id")
        await db_manager.db.dependencies.create_index("to_package_id")
        
        # applications: name, criticality_tag
        await db_manager.db.applications.create_index("name")
        await db_manager.db.applications.create_index("criticality_tag")
        
        # vulnerabilities: package_id, cve_id
        await db_manager.db.vulnerabilities.create_index("package_id")
        await db_manager.db.vulnerabilities.create_index("cve_id")
        
        # risk_scores: package_id
        await db_manager.db.risk_scores.create_index("package_id")
        
        # typosquat_flags: package_id
        await db_manager.db.typosquat_flags.create_index("package_id")
        
        logger.info("MongoDB connection and indexes established successfully.")
    except Exception as e:
        logger.warning(f"Index initialization warning: {e}")

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()
        logger.info("MongoDB connection closed.")
