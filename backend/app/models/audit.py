from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True, nullable=True)
    order_id = Column(String, index=True, nullable=True)
    actor = Column(String, nullable=False)          # "buyer_agent" | "merchant_agent" | "system" | "user"
    action = Column(String, nullable=False)          # e.g. "intent_received", "product_searched"
    detail = Column(JSON, nullable=True)             # arbitrary structured data
    status = Column(String, default="ok")            # "ok" | "blocked" | "failed"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
