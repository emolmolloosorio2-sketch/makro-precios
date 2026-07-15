from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Product, PriceHistory
from app.schemas import ProductOut, ProductSearchResult
from app.services.matcher import find_similar_products, update_product_embeddings

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/", response_model=list[ProductOut])
def list_products(
    store: str | None = None,
    category: str | None = None,
    q: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if store:
        query = query.filter(Product.store == store)
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if q:
        STOP = {"de", "del", "en", "por", "y", "e", "a", "el", "la", "los", "las", "con", "sin", "su", "para", "x", "un", "una", "u", "al"}
        words = [w for w in q.split() if len(w) > 1 and w.lower() not in STOP]
        if not words:
            words = [w for w in q.split() if len(w) > 1]
        for w in words:
            stem = w[:5] if len(w) > 5 else w
            query = query.filter(Product.name.ilike(f"%{stem}%"))
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/count")
def count_products(
    store: str | None = None,
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if store:
        query = query.filter(Product.store == store)
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if q:
        STOP = {"de", "del", "en", "por", "y", "e", "a", "el", "la", "los", "las", "con", "sin", "su", "para", "x", "un", "una", "u", "al"}
        words = [w for w in q.split() if len(w) > 1 and w.lower() not in STOP]
        if not words:
            words = [w for w in q.split() if len(w) > 1]
        for w in words:
            stem = w[:5] if len(w) > 5 else w
            query = query.filter(Product.name.ilike(f"%{stem}%"))
    return {"count": query.count()}


@router.get("/updates", response_model=list[ProductOut])
def recent_updates(
    store: str | None = None,
    only_changed: bool = False,
    limit: int = 100,
    hours: int = 24,
    sort_by: str = "absolute",
    db: Session = Depends(get_db),
):
    from datetime import datetime, timedelta
    from sqlalchemy import text
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    if sort_by == "absolute":
        order_expr = "ABS(ph1.price - ph2.price)"
    else:
        order_expr = "ABS((ph1.price - ph2.price) / NULLIF(CAST(ph2.price AS REAL), 0))"
    product_ids = db.execute(text(f"""
        SELECT p.id FROM products p
        JOIN price_history ph1 ON ph1.id = (
            SELECT id FROM price_history WHERE product_id = p.id ORDER BY id DESC LIMIT 1
        )
        LEFT JOIN price_history ph2 ON ph2.id = (
            SELECT id FROM price_history WHERE product_id = p.id ORDER BY id DESC LIMIT 1 OFFSET 1
        )
        WHERE ph1.recorded_at >= :cut
          AND (:only = 0 OR (ph2.id IS NOT NULL AND ph1.price != ph2.price))
          AND (:store IS NULL OR p.store = :store)
        ORDER BY CASE WHEN :only = 1 THEN {order_expr} ELSE 0 END DESC, ph1.recorded_at DESC
        LIMIT :lim
    """), {"cut": cutoff, "only": 1 if only_changed else 0, "store": store, "lim": limit}).fetchall()
    ids = [r[0] for r in product_ids]
    if not ids:
        return []
    from sqlalchemy.orm import subqueryload
    products = db.query(Product).options(subqueryload(Product.price_history)).filter(Product.id.in_(ids)).all()
    id_order = {pid: i for i, pid in enumerate(ids)}
    products.sort(key=lambda p: id_order.get(p.id, 0))
    return products


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/{product_id}/history")
def get_price_history(product_id: int, db: Session = Depends(get_db)):
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )
    return history


@router.get("/search/", response_model=list[ProductSearchResult])
def search_products(
    q: str = Query(min_length=1),
    store: str | None = None,
    threshold: float = 0.3,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return find_similar_products(q, db, store=store, threshold=threshold, limit=limit)


@router.post("/embeddings/update")
def update_embeddings(db: Session = Depends(get_db)):
    count = update_product_embeddings(db)
    return {"updated": count}
