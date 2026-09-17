import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "UPI Split Pay"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Financial constants
    # Default max chunk is ₹1,999 = 199,900 paise
    default_max_chunk_paise: int = 199900
    currency: str = "INR"
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./upi_split_pay.db")
    
    # CORS
    cors_origins: list[str] = ["*"]

settings = Settings()
