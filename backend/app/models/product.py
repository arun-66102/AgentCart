from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class Product(Base):
    __tablename__ = "products"

    product_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    category = Column(String, nullable=False, index=True)
    features = Column(JSON, default=list)
    rating = Column(Float, default=0.0)
    related_products = Column(JSON, default=list)
    upsell_products = Column(JSON, default=list)
    cross_sell_products = Column(JSON, default=list)
    bundle_products = Column(JSON, default=list)
    bundle_discount = Column(Float, default=0.0)   # % discount when bundled
    available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String, index=True, nullable=False)
    quantity = Column(Integer, default=0)
    reserved = Column(Integer, default=0)   # held during checkout
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    @property
    def available_qty(self) -> int:
        return max(0, self.quantity - self.reserved)
