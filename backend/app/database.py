from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

db_url = settings.database_url
if not db_url or not (db_url.startswith("sqlite") or db_url.startswith("postgres")):
    db_url = "sqlite:////tmp/upi_split_pay.db"

# SQLite specific connect args for thread safety
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
