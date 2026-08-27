"""
Checkout API — user authorization and cart validation before payment.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.tools.catalog_tools import calculate_cart
from app.tools.inventory_tools import check_inventory_bulk, reserve_inventory, release_inventory
from app.tools.audit_tools import write_audit_log
from app.policies.policy_engine import policy_engine
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


class AuthorizeRequest(BaseModel):
    session_id: str
    items: list[dict]        # [{"product_id": str, "qty": int}]
    user_budget: float
    user_authorized: bool = False


class ConfirmRequest(BaseModel):
    order_id: str
    user_authorized: bool = True


@router.post("/authorize")
def authorize_checkout(req: AuthorizeRequest, db: Session = Depends(get_db)):
    """
    Pre-payment authorization step.
    Runs all policy and guardrail checks BEFORE Razorpay is touched.
    """
    write_audit_log(db, "system", "checkout_initiated",
                    {"items": req.items}, session_id=req.session_id)

    # Step 1: Calculate cart
    cart = calculate_cart(db, req.items)
    write_audit_log(db, "system", "cart_calculated",
                    cart, session_id=req.session_id)

    # Step 2: Inventory check
    product_ids = [i["product_id"] for i in req.items]
    inv_results = check_inventory_bulk(db, product_ids)
    inv_ok = all(r["available"] for r in inv_results)
    write_audit_log(db, "system", "inventory_checked",
                    {"ok": inv_ok, "details": inv_results}, session_id=req.session_id)

    # Step 3: Policy engine validation
    validation = policy_engine.validate_checkout(
        cart_total=cart["total"],
        user_budget=req.user_budget,
        user_authorized=req.user_authorized,
        inventory_ok=inv_ok,
    )
    write_audit_log(db, "policy_engine", "policy_validated",
                    validation, session_id=req.session_id,
                    status="ok" if validation["all_passed"] else "blocked")

    if not validation["all_passed"]:
        return {
            "authorized": False,
            "validation": validation,
            "cart": cart,
        }

    # Step 4: Reserve inventory
    for item in req.items:
        reserve_inventory(db, item["product_id"], item.get("qty", 1))
    write_audit_log(db, "system", "inventory_reserved",
                    {"items": req.items}, session_id=req.session_id)

    # Step 5: Create pending order
    order_id = f"ORD-{uuid.uuid4().hex[:10].upper()}"
    order = Order(
        order_id=order_id,
        session_id=req.session_id,
        status=OrderStatus.AUTHORIZED,
        items=req.items,
        subtotal=cart["subtotal"],
        discount=cart["discount"],
        total=cart["total"],
        user_authorized="yes",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    write_audit_log(db, "system", "order_created",
                    {"order_id": order_id, "total": cart["total"]},
                    session_id=req.session_id, order_id=order_id)

    return {
        "authorized": True,
        "order_id": order_id,
        "validation": validation,
        "cart": cart,
    }


@router.post("/cancel")
def cancel_checkout(order_id: str, db: Session = Depends(get_db)):
    """Cancel a pending checkout and release inventory."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    for item in (order.items or []):
        release_inventory(db, item["product_id"], item.get("qty", 1))

    order.status = OrderStatus.CANCELLED
    db.commit()

    write_audit_log(db, "system", "checkout_cancelled",
                    {"order_id": order_id}, order_id=order_id)

    return {"cancelled": True, "order_id": order_id}
