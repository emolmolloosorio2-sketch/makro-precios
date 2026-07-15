from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    brand = Column(String(200), nullable=True)
    category = Column(String(200), nullable=True)
    image_url = Column(Text, nullable=True)
    product_url = Column(Text, nullable=True)
    sku = Column(String(200), nullable=True)
    store = Column(String(100), nullable=False)
    in_store_only = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    promotion_data = Column(JSON, nullable=True)
    embedding = Column(Text, nullable=True)

    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan", order_by=lambda: PriceHistory.recorded_at.desc())
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    discount_percentage = Column(Float, nullable=True)
    currency = Column(String(10), default="PEN")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="price_history")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    email = Column(String(200), nullable=False)
    target_price = Column(Float, nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="alerts")
