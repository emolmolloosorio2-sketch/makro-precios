from sqlalchemy.orm import Session

from app.models import Alert, Product, PriceHistory


def check_alerts(db: Session):
    active_alerts = db.query(Alert).filter(Alert.is_active == 1).all()
    triggered = []

    for alert in active_alerts:
        product = db.query(Product).filter(Product.id == alert.product_id).first()
        if not product:
            continue

        latest_price = (
            db.query(PriceHistory)
            .filter(PriceHistory.product_id == alert.product_id)
            .order_by(PriceHistory.recorded_at.desc())
            .first()
        )

        if latest_price and latest_price.price <= alert.target_price:
            triggered.append({
                "email": alert.email,
                "product_name": product.name,
                "product_url": product.product_url,
                "current_price": latest_price.price,
                "target_price": alert.target_price,
                "store": product.store,
            })

            alert.is_active = 0

    if triggered:
        db.commit()

    return triggered


def create_alert(db: Session, product_id: int, email: str, target_price: float):
    alert = Alert(
        product_id=product_id,
        email=email,
        target_price=target_price,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
