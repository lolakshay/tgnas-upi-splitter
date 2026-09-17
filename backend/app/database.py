from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

db_url = settings.database_url
if not db_url or not (db_url.startswith("sqlite") or db_url.startswith("postgres")):
    db_url = "sqlite:////tmp/upi_split_pay.db"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_tables_initialized = False

def init_db():
    global _tables_initialized
    if not _tables_initialized:
        Base.metadata.create_all(bind=engine)
        _tables_initialized = True

def get_db():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
