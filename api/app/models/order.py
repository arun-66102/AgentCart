from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Enum
from sqlalchemy.sql import func
from app.database.db import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, unique=True, index=True, nullable=False)
    session_id = Column(String, index=True)
    status = Column(String, default=OrderStatus.PENDING)
    items = Column(JSON, default=list)          # list of {product_id, qty, price}
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    currency = Column(String, default="INR")
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    user_authorized = Column(String, nullable=True)  # "yes" / "no"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
