from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config.settings import get_settings

settings = get_settings()

# PostgreSQL via Neon — pool_pre_ping detects stale connections (Neon scales to zero),
# pool_recycle prevents connections from aging past Neon's idle timeout.
engine = create_engine(
    settings.database_url,
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
