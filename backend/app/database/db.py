from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config.settings import get_settings

settings = get_settings()

db_url = (settings.database_url or "").strip()
if not db_url:
    # Fallback to tmp SQLite for serverless environment if DATABASE_URL is not set
    db_url = "sqlite:////tmp/agentcart.db"

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL via Neon — pool_pre_ping detects stale connections (Neon scales to zero),
    # pool_recycle prevents connections from aging past Neon's idle timeout.
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables (called on startup)."""
    Base.metadata.create_all(bind=engine)
