from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Any


class PriceHistoryOut(BaseModel):
    id: int
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    sku: Optional[str] = None
    store: str
    in_store_only: int = 0
    description: Optional[str] = None
    promotion_data: Optional[dict[str, Any]] = None
    created_at: datetime
    price_history: list[PriceHistoryOut] = []

    class Config:
        from_attributes = True


class ProductSearchResult(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    store: str
    in_store_only: int = 0
    description: Optional[str] = None
    promotion_data: Optional[dict[str, Any]] = None
    current_price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    similarity: Optional[float] = None


class AlertCreate(BaseModel):
    product_id: int
    email: str
    target_price: float


class AlertOut(BaseModel):
    id: int
    product_id: int
    email: str
    target_price: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
