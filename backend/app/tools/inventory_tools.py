"""
Inventory Tools — check, reserve and release stock.
"""
from sqlalchemy.orm import Session
from app.models.product import Inventory, Product


def check_inventory(db: Session, product_id: str) -> dict:
    """Return available quantity for a product."""
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    product = db.query(Product).filter(Product.product_id == product_id).first()

    if not inv or not product:
        return {"product_id": product_id, "available": False, "quantity": 0}

    avail = inv.available_qty
    return {
        "product_id": product_id,
        "product_name": product.name,
        "quantity": inv.quantity,
        "reserved": inv.reserved,
        "available_qty": avail,
        "available": avail > 0,
    }


def check_inventory_bulk(db: Session, product_ids: list[str]) -> list[dict]:
    """Check inventory for multiple products at once."""
    return [check_inventory(db, pid) for pid in product_ids]


def reserve_inventory(db: Session, product_id: str, qty: int = 1) -> dict:
    """
    Temporarily reserve stock during checkout.
    Returns success flag.
    """
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv or inv.available_qty < qty:
        return {"success": False, "reason": "Insufficient stock"}

    inv.reserved += qty
    db.commit()
    return {"success": True, "reserved": qty, "product_id": product_id}


def release_inventory(db: Session, product_id: str, qty: int = 1) -> dict:
    """Release a reservation (on payment failure / cancellation)."""
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        return {"success": False}
    inv.reserved = max(0, inv.reserved - qty)
    db.commit()
    return {"success": True}


def deduct_inventory(db: Session, product_id: str, qty: int = 1) -> dict:
    """Permanently deduct stock after successful payment."""
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        return {"success": False}
    inv.quantity = max(0, inv.quantity - qty)
    inv.reserved = max(0, inv.reserved - qty)
    db.commit()

    # Mark product unavailable if out of stock
    if inv.quantity == 0:
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if product:
            product.available = False
            db.commit()

    return {"success": True, "remaining_stock": inv.quantity}
