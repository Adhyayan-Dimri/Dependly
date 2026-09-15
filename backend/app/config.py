from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "Ripple Effect"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ripple_effect"
    
    # API Keys & Auth
    OPENROUTER_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None
    
    # AI Config
    AI_PROVIDER: str = "openrouter"
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    
    # Simulation & Calculation limits
    MAX_PATH_DEPTH: int = 15
    MAX_RESOLVED_NODES: int = 300
    COST_PER_AFFECTED_APP: float = 10000.0
    CUSTOMER_FACING_COST_MULTIPLIER: float = 2.5

settings = Settings()
