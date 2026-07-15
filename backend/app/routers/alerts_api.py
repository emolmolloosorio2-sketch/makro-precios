from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Product
from app.schemas import AlertCreate, AlertOut
from app.services.alerts import create_alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.post("/", response_model=AlertOut)
def create_alert_endpoint(alert_data: AlertCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == alert_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return create_alert(db, alert_data.product_id, alert_data.email, alert_data.target_price)


@router.get("/", response_model=list[AlertOut])
def list_alerts(email: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if email:
        query = query.filter(Alert.email == email)
    return query.all()


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"ok": True}
