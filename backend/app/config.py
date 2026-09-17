import os
from pydantic import BaseModel

def get_database_url() -> str:
    raw = (os.getenv("DATABASE_URL") or "").strip()
    # If DATABASE_URL is empty, whitespace, or not a recognized scheme, use safe sqlite fallback
    if not raw or not (raw.startswith("sqlite") or raw.startswith("postgres")):
        if os.getenv("VERCEL"):
            return "sqlite:////tmp/upi_split_pay.db"
        return "sqlite:///./upi_split_pay.db"
    
    # Fix Heroku/Render/Supabase 'postgres://' for SQLAlchemy 2
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    return raw

class Settings(BaseModel):
    app_name: str = "UPI Split Pay"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Financial constants
    default_max_chunk_paise: int = 199900
    currency: str = "INR"
    
    # Database
    database_url: str = get_database_url()
    
    # CORS
    cors_origins: list[str] = ["*"]

settings = Settings()
