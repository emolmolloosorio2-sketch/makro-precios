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


# ── POS / Valis ──────────────────────────────────────────────────────────

class PosCategory(Base):
    __tablename__ = "pos_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("PosProduct", back_populates="category")


class PosProduct(Base):
    __tablename__ = "pos_products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    barcode = Column(String(100), unique=True, index=True)
    price = Column(Float, nullable=False, default=0)
    cost_price = Column(Float, nullable=True)
    stock = Column(Float, nullable=False, default=0)
    min_stock = Column(Float, nullable=True)
    unit = Column(String(20), default="unidad")
    category_id = Column(Integer, ForeignKey("pos_categories.id"), nullable=True)
    image_url = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("PosCategory", back_populates="products")


class PosCustomer(Base):
    __tablename__ = "pos_customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sales = relationship("PosSale", back_populates="customer")
    debts = relationship("PosDebt", back_populates="customer")


class PosSale(Base):
    __tablename__ = "pos_sales"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("pos_customers.id"), nullable=True)
    total = Column(Float, nullable=False)
    discount = Column(Float, default=0)
    payment_method = Column(String(50), nullable=False)  # cash, card, yape, plin, transfer, debt
    status = Column(String(20), default="completed")  # completed, cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("PosCustomer", back_populates="sales")
    items = relationship("PosSaleItem", back_populates="sale", cascade="all, delete-orphan")


class PosSaleItem(Base):
    __tablename__ = "pos_sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("pos_sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("pos_products.id"), nullable=True)
    product_name = Column(String(500), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    sale = relationship("PosSale", back_populates="items")
    product = relationship("PosProduct")


class PosDebt(Base):
    __tablename__ = "pos_debts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("pos_customers.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("pos_sales.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0)
    status = Column(String(20), default="active")  # active, paid
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("PosCustomer", back_populates="debts")
    payments = relationship("PosDebtPayment", back_populates="debt", cascade="all, delete-orphan")


class PosDebtPayment(Base):
    __tablename__ = "pos_debt_payments"

    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, ForeignKey("pos_debts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="cash")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    debt = relationship("PosDebt", back_populates="payments")


class PosDailyClose(Base):
    __tablename__ = "pos_daily_close"

    id = Column(Integer, primary_key=True, index=True)
    opened_at = Column(DateTime, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    initial_cash = Column(Float, default=0)
    final_cash = Column(Float, nullable=True)
    total_sales = Column(Float, default=0)
    total_debts = Column(Float, default=0)
    total_expenses = Column(Float, default=0)
    notes = Column(Text, nullable=True)
