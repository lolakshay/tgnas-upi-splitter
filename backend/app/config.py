import os
from pydantic import BaseModel

def get_database_url() -> str:
    raw = (os.getenv("DATABASE_URL") or "").strip()
    is_vercel = bool(os.getenv("VERCEL"))

    # On Vercel / AWS Lambda serverless: filesystem is READ-ONLY except /tmp/
    # Any SQLite database MUST be in /tmp/
    if is_vercel:
        if not raw or raw.startswith("sqlite"):
            return "sqlite:////tmp/upi_split_pay.db"
        if raw.startswith("postgres://"):
            return raw.replace("postgres://", "postgresql://", 1)
        return raw

    # Local development
    if not raw or not (raw.startswith("sqlite") or raw.startswith("postgres")):
        return "sqlite:///./upi_split_pay.db"

    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql://", 1)
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
