from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import (
    PosProduct, PosCategory, PosCustomer,
    PosSale, PosSaleItem, PosDebt, PosDebtPayment, PosDailyClose,
)

router = APIRouter(prefix="/api/pos", tags=["pos"])


# ── Schemas ──────────────────────────────────────────────────────────────

class CatIn(BaseModel):
    name: str

class CatOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    class Config:
        from_attributes = True

class ProdIn(BaseModel):
    name: str
    barcode: Optional[str] = None
    price: float = 0
    cost_price: Optional[float] = None
    stock: float = 0
    min_stock: Optional[float] = None
    unit: str = "unidad"
    category_id: Optional[int] = None

class ProdOut(BaseModel):
    id: int
    name: str
    barcode: Optional[str] = None
    price: float
    cost_price: Optional[float] = None
    stock: float
    min_stock: Optional[float] = None
    unit: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    is_active: int
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerIn(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    debt_balance: float = 0
    created_at: datetime
    class Config:
        from_attributes = True

class SaleItemIn(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float

class SaleIn(BaseModel):
    customer_id: Optional[int] = None
    items: list[SaleItemIn]
    discount: float = 0
    payment_method: str = "cash"
    notes: Optional[str] = None
    as_debt: bool = False
    cash_paid: float = 0

class SaleItemOut(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    quantity: float
    unit_price: float
    subtotal: float
    class Config:
        from_attributes = True

class SaleOut(BaseModel):
    id: int
    customer_id: Optional[int]
    total: float
    discount: float
    payment_method: str
    status: str
    notes: Optional[str]
    items: list[SaleItemOut] = []
    created_at: datetime
    class Config:
        from_attributes = True

class DebtPaymentIn(BaseModel):
    amount: float
    payment_method: str = "cash"
    notes: Optional[str] = None

class DebtOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    sale_id: Optional[int]
    total_amount: float
    paid_amount: float
    balance: float
    status: str
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class CloseIn(BaseModel):
    final_cash: float
    total_expenses: float = 0
    notes: Optional[str] = None

class TicketItemIn(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float


# ── Categories ───────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CatOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(PosCategory).order_by(PosCategory.name).all()

@router.post("/categories", response_model=CatOut)
def create_category(data: CatIn, db: Session = Depends(get_db)):
    cat = PosCategory(name=data.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ── Products ─────────────────────────────────────────────────────────────

@router.get("/products", response_model=list[ProdOut])
def list_products(search: str = "", category_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(PosProduct).filter(PosProduct.is_active == 1)
    if search:
        q = q.filter(PosProduct.name.ilike(f"%{search}%"))
    if category_id:
        q = q.filter(PosProduct.category_id == category_id)
    products = q.order_by(PosProduct.name).all()
    result = []
    for p in products:
        d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        d["category_name"] = p.category.name if p.category else None
        result.append(ProdOut(**d))
    return result

@router.get("/products/barcode/{barcode}", response_model=ProdOut)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    p = db.query(PosProduct).filter(PosProduct.barcode == barcode, PosProduct.is_active == 1).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["category_name"] = p.category.name if p.category else None
    return ProdOut(**d)

@router.post("/products", response_model=ProdOut)
def create_product(data: ProdIn, db: Session = Depends(get_db)):
    p = PosProduct(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["category_name"] = p.category.name if p.category else None
    return ProdOut(**d)

@router.put("/products/{product_id}", response_model=ProdOut)
def update_product(product_id: int, data: ProdIn, db: Session = Depends(get_db)):
    p = db.query(PosProduct).filter(PosProduct.id == product_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["category_name"] = p.category.name if p.category else None
    return ProdOut(**d)

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(PosProduct).filter(PosProduct.id == product_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    p.is_active = 0
    db.commit()
    return {"ok": True}


# ── Stock ────────────────────────────────────────────────────────────────

@router.post("/products/{product_id}/stock")
def update_stock(product_id: int, quantity: float, db: Session = Depends(get_db)):
    p = db.query(PosProduct).filter(PosProduct.id == product_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    p.stock += quantity
    db.commit()
    return {"stock": p.stock}


# ── Customers ────────────────────────────────────────────────────────────

@router.get("/customers", response_model=list[CustomerOut])
def list_customers(search: str = "", db: Session = Depends(get_db)):
    q = db.query(PosCustomer)
    if search:
        q = q.filter(PosCustomer.name.ilike(f"%{search}%"))
    customers = q.order_by(PosCustomer.name).all()
    result = []
    for c in customers:
        d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        d["debt_balance"] = sum(
            (debt.total_amount - debt.paid_amount)
            for debt in c.debts if debt.status == "active"
        )
        result.append(CustomerOut(**d))
    return result

@router.get("/customers/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(PosCustomer).filter(PosCustomer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d["debt_balance"] = sum(
        (debt.total_amount - debt.paid_amount)
        for debt in c.debts if debt.status == "active"
    )
    return CustomerOut(**d)

@router.post("/customers", response_model=CustomerOut)
def create_customer(data: CustomerIn, db: Session = Depends(get_db)):
    c = PosCustomer(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return get_customer(c.id, db)

@router.get("/customers/{customer_id}/history")
def customer_history(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(PosCustomer).filter(PosCustomer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    sales = db.query(PosSale).filter(PosSale.customer_id == customer_id).order_by(PosSale.id.desc()).all()
    result = []
    for s in sales:
        debt = db.query(PosDebt).filter(PosDebt.sale_id == s.id).first()
        cash_paid = 0
        debt_balance = 0
        if debt:
            total = s.total
            debt_balance = round(debt.total_amount - debt.paid_amount, 2)
            cash_paid = round(total - debt.total_amount, 2)
        result.append({
            "sale_id": s.id,
            "date": s.created_at.isoformat(),
            "total": s.total,
            "cash_paid": cash_paid,
            "debt_total": debt.total_amount if debt else 0,
            "debt_balance": debt_balance,
            "debt_status": debt.status if debt else None,
            "payment_method": s.payment_method,
            "items": [{"product_name": i.product_name, "quantity": i.quantity, "unit_price": i.unit_price, "subtotal": i.subtotal} for i in s.items],
        })
    return result


# ── Sales ────────────────────────────────────────────────────────────────

@router.post("/sales", response_model=SaleOut)
def create_sale(data: SaleIn, db: Session = Depends(get_db)):
    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    total = subtotal - data.discount

    sale = PosSale(
        customer_id=data.customer_id,
        total=total,
        discount=data.discount,
        payment_method="debt" if data.as_debt else data.payment_method,
        status="completed",
        notes=data.notes,
    )
    db.add(sale)
    db.flush()

    for item in data.items:
        si = PosSaleItem(
            sale_id=sale.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.quantity * item.unit_price,
        )
        db.add(si)

        if item.product_id:
            prod = db.query(PosProduct).filter(PosProduct.id == item.product_id).first()
            if prod:
                prod.stock -= item.quantity

    if data.as_debt and data.customer_id:
        paid_now = min(data.cash_paid, total) if data.cash_paid > 0 else 0
        debt_amount = total - paid_now
        debt = PosDebt(
            customer_id=data.customer_id,
            sale_id=sale.id,
            total_amount=debt_amount,
            paid_amount=0,
            status="active",
        )
        db.add(debt)

    db.commit()
    db.refresh(sale)
    return sale

@router.get("/sales", response_model=list[SaleOut])
def list_sales(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(PosSale).order_by(PosSale.id.desc()).limit(limit).all()

@router.get("/sales/today")
def today_sales(db: Session = Depends(get_db)):
    from datetime import date
    today = date.today()
    sales = db.query(PosSale).filter(
        PosSale.created_at >= str(today),
        PosSale.status == "completed",
    ).all()
    total = sum(s.total for s in sales)
    by_method = {}
    for s in sales:
        by_method[s.payment_method] = by_method.get(s.payment_method, 0) + s.total
    return {
        "count": len(sales),
        "total": round(total, 2),
        "by_method": by_method,
        "sales": sales,
    }


# ── Tickets (suspendidas) ────────────────────────────────────────────────

@router.post("/tickets/suspend")
def suspend_ticket(items: list[TicketItemIn], db: Session = Depends(get_db)):
    subtotal = sum(i.quantity * i.unit_price for i in items)
    sale = PosSale(total=subtotal, status="suspended", payment_method="suspended")
    db.add(sale)
    db.flush()
    for i in items:
        db.add(PosSaleItem(sale_id=sale.id, **i.model_dump(), subtotal=i.quantity * i.unit_price))
    db.commit()
    return {"ticket_id": sale.id}

@router.get("/tickets/suspended")
def list_suspended_tickets(db: Session = Depends(get_db)):
    sales = db.query(PosSale).filter(PosSale.status == "suspended").order_by(PosSale.id.desc()).all()
    result = []
    for s in sales:
        result.append({
            "ticket_id": s.id,
            "created_at": s.created_at.isoformat(),
            "items": [{"product_name": i.product_name, "quantity": i.quantity, "unit_price": i.unit_price} for i in s.items],
            "item_count": sum(i.quantity for i in s.items),
        })
    return result

@router.get("/tickets/{ticket_id}")
def get_suspended_ticket(ticket_id: int, db: Session = Depends(get_db)):
    s = db.query(PosSale).filter(PosSale.id == ticket_id, PosSale.status == "suspended").first()
    if not s:
        raise HTTPException(404, "Ticket no encontrado")
    return {
        "ticket_id": s.id,
        "created_at": s.created_at.isoformat(),
        "items": [{"product_id": i.product_id, "product_name": i.product_name, "quantity": i.quantity, "unit_price": i.unit_price} for i in s.items],
    }

@router.delete("/tickets/{ticket_id}")
def discard_ticket(ticket_id: int, db: Session = Depends(get_db)):
    s = db.query(PosSale).filter(PosSale.id == ticket_id, PosSale.status == "suspended").first()
    if not s:
        raise HTTPException(404, "Ticket no encontrado")
    s.status = "cancelled"
    db.commit()
    return {"ok": True}


# ── Debts ────────────────────────────────────────────────────────────────

@router.get("/debts", response_model=list[DebtOut])
def list_debts(status: str = "active", db: Session = Depends(get_db)):
    q = db.query(PosDebt).filter(PosDebt.status == status).order_by(PosDebt.created_at.desc())
    debts = q.all()
    result = []
    for d in debts:
        obj = {col.name: getattr(d, col.name) for col in d.__table__.columns}
        obj["balance"] = round(d.total_amount - d.paid_amount, 2)
        obj["customer_name"] = d.customer.name if d.customer else None
        result.append(DebtOut(**obj))
    return result

@router.post("/debts/{debt_id}/pay")
def pay_debt(debt_id: int, data: DebtPaymentIn, db: Session = Depends(get_db)):
    debt = db.query(PosDebt).filter(PosDebt.id == debt_id).first()
    if not debt:
        raise HTTPException(404, "Deuda no encontrada")
    payment = PosDebtPayment(debt_id=debt.id, **data.model_dump())
    db.add(payment)
    debt.paid_amount += data.amount
    if debt.paid_amount >= debt.total_amount:
        debt.status = "paid"
    db.commit()
    return {"paid": data.amount, "balance": round(debt.total_amount - debt.paid_amount, 2), "status": debt.status}


# ── Daily Close ──────────────────────────────────────────────────────────

@router.get("/close/status")
def close_status(db: Session = Depends(get_db)):
    last = db.query(PosDailyClose).order_by(PosDailyClose.id.desc()).first()
    if last and last.closed_at is None:
        return {"open": True, "close_id": last.id, "opened_at": last.opened_at, "initial_cash": last.initial_cash}
    return {"open": False}

@router.post("/close/open")
def open_close(initial_cash: float = 0, db: Session = Depends(get_db)):
    last = db.query(PosDailyClose).order_by(PosDailyClose.id.desc()).first()
    if last and last.closed_at is None:
        raise HTTPException(400, "Ya hay una caja abierta")
    c = PosDailyClose(opened_at=datetime.utcnow(), initial_cash=initial_cash)
    db.add(c)
    db.commit()
    return {"ok": True, "close_id": c.id}

@router.post("/close/{close_id}")
def close_caja(close_id: int, data: CloseIn, db: Session = Depends(get_db)):
    c = db.query(PosDailyClose).filter(PosDailyClose.id == close_id).first()
    if not c:
        raise HTTPException(404, "Cierre no encontrado")
    from datetime import date
    today = date.today()
    sales = db.query(PosSale).filter(
        PosSale.created_at >= str(today),
        PosSale.status == "completed",
    ).all()
    c.total_sales = round(sum(s.total for s in sales), 2)
    c.total_expenses = data.total_expenses
    c.final_cash = data.final_cash
    c.notes = data.notes
    c.closed_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
