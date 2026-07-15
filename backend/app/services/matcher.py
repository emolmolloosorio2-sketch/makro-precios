import json
import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

from app.models import Product
from app.config import settings


_model = None


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def clean_product_name(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9áéíóúñü\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def compute_embedding(text: str) -> list[float]:
    model = get_model()
    cleaned = clean_product_name(text)
    embedding = model.encode(cleaned, convert_to_numpy=True)
    return embedding.tolist()


def update_product_embeddings(db: Session):
    products = db.query(Product).filter(Product.embedding.is_(None)).all()
    for p in products:
        text = f"{p.name} {p.brand or ''} {p.category or ''}"
        embedding = compute_embedding(text)
        p.embedding = json.dumps(embedding)
    db.commit()
    return len(products)


def find_similar_products(
    query: str,
    db: Session,
    store: str | None = None,
    threshold: float = 0.3,
    limit: int = 20,
):
    query_emb = np.array(compute_embedding(query)).reshape(1, -1)

    query_products = db.query(Product)
    if store:
        query_products = query_products.filter(Product.store == store)
    products = query_products.all()

    results = []
    for p in products:
        if not p.embedding:
            continue
        prod_emb = np.array(json.loads(p.embedding)).reshape(1, -1)
        sim = cosine_similarity(query_emb, prod_emb)[0][0]
        if sim >= threshold:
            latest_price = None
            if p.price_history:
                latest_price_entry = sorted(p.price_history, key=lambda x: x.recorded_at, reverse=True)[0]
                latest_price = latest_price_entry

            results.append({
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "image_url": p.image_url,
                "product_url": p.product_url,
                "store": p.store,
                "in_store_only": p.in_store_only or 0,
                "description": p.description,
                "promotion_data": p.promotion_data,
                "current_price": latest_price.price if latest_price else None,
                "original_price": latest_price.original_price if latest_price else None,
                "discount_percentage": latest_price.discount_percentage if latest_price else None,
                "similarity": round(float(sim), 4),
            })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]
