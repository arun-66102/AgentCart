"""
Payments API — Razorpay test-mode order creation and verification.

Financial Safety Rules enforced here:
  1. Only authorized orders can create a Razorpay order.
  2. Amount is taken from the DB order — cannot be overridden by client.
  3. Payment must be verified before order is marked PAID.
  4. Every financial action is logged.
  5. Failed payments are handled gracefully — no blind retries.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.tools.razorpay_tools import create_razorpay_order, verify_payment
from app.tools.inventory_tools import deduct_inventory, release_inventory
from app.tools.audit_tools import write_audit_log
from app.models.order import Order, OrderStatus
from app.config.settings import get_settings

router = APIRouter(prefix="/api/payments", tags=["payments"])
settings = get_settings()


class CreateOrderRequest(BaseModel):
    order_id: str


class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class SimulateFailureRequest(BaseModel):
    order_id: str


@router.post("/create-order")
def create_payment_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    """
    Create a Razorpay order for an authorized checkout.
    Amount is ALWAYS sourced from the DB — never from client input.
    """
    order = db.query(Order).filter(Order.order_id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.AUTHORIZED:
        raise HTTPException(
            status_code=400,
            detail=f"Order is not in authorized state (current: {order.status})",
        )

    write_audit_log(db, "system", "payment_order_creating",
                    {"order_id": req.order_id, "amount": order.total},
                    order_id=req.order_id)

    rz_order = create_razorpay_order(
        amount_inr=order.total,
        order_id=req.order_id,
        notes={"agentcart_order_id": req.order_id},
    )

    if rz_order.get("error"):
        write_audit_log(db, "system", "payment_order_failed",
                        {"error": rz_order.get("error")},
                        order_id=req.order_id, status="failed")
        raise HTTPException(status_code=502, detail="Failed to create Razorpay order")

    order.razorpay_order_id = rz_order["id"]
    db.commit()

    write_audit_log(db, "system", "payment_order_created",
                    {"razorpay_order_id": rz_order["id"], "amount_paise": rz_order["amount"]},
                    order_id=req.order_id)

    return {
        "razorpay_order_id": rz_order["id"],
        "amount": rz_order["amount"],
        "currency": "INR",
        "key_id": settings.razorpay_key_id or "rzp_test_MOCK",
        "order_id": req.order_id,
        "mock": rz_order.get("mock", False),
    }


@router.post("/verify")
def verify_payment_endpoint(req: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """
    Verify Razorpay payment signature.
    MANDATORY — never mark an order as paid without verification.
    """
    order = db.query(Order).filter(Order.order_id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    write_audit_log(db, "system", "payment_verification_started",
                    {"razorpay_payment_id": req.razorpay_payment_id},
                    order_id=req.order_id)

    result = verify_payment(
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature,
    )

    if not result.get("verified"):
        # Payment failed — release inventory
        for item in (order.items or []):
            release_inventory(db, item["product_id"], item.get("qty", 1))

        order.status = OrderStatus.FAILED
        order.razorpay_payment_id = req.razorpay_payment_id
        db.commit()

        write_audit_log(db, "system", "payment_verification_failed",
                        {"result": result}, order_id=req.order_id, status="failed")

        return {
            "success": False,
            "order_id": req.order_id,
            "message": "Payment verification failed. Inventory has been released.",
        }

    # Payment verified — deduct inventory and mark order as PAID
    for item in (order.items or []):
        deduct_inventory(db, item["product_id"], item.get("qty", 1))

    order.status = OrderStatus.PAID
    order.razorpay_order_id = req.razorpay_order_id
    order.razorpay_payment_id = req.razorpay_payment_id
    order.razorpay_signature = req.razorpay_signature
    db.commit()

    write_audit_log(db, "system", "payment_verified_order_complete",
                    {
                        "razorpay_payment_id": req.razorpay_payment_id,
                        "total": order.total,
                        "mock": result.get("mock", False),
                    },
                    order_id=req.order_id)

    return {
        "success": True,
        "order_id": req.order_id,
        "status": "paid",
        "total": order.total,
        "message": "✅ Payment verified. Order confirmed!",
    }


@router.post("/simulate-failure")
def simulate_payment_failure(req: SimulateFailureRequest, db: Session = Depends(get_db)):
    """
    Demo: intentionally simulate a payment failure.
    Shows graceful failure handling.
    """
    order = db.query(Order).filter(Order.order_id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    write_audit_log(db, "system", "payment_failure_simulated",
                    {"order_id": req.order_id},
                    order_id=req.order_id, status="failed")

    # Release inventory
    for item in (order.items or []):
        release_inventory(db, item["product_id"], item.get("qty", 1))

    order.status = OrderStatus.FAILED
    db.commit()

    write_audit_log(db, "system", "inventory_released_after_failure",
                    {"items": order.items}, order_id=req.order_id, status="failed")

    return {
        "success": False,
        "order_id": req.order_id,
        "status": "failed",
        "error_code": "PAYMENT_FAILED_DEMO",
        "error_description": "Payment failed (simulated). Inventory released. No charge made.",
        "alternatives": ["Try a different payment method", "Retry the same payment"],
        "message": "⚠️ Payment failed gracefully. No money was charged. Inventory released.",
    }


@router.get("/order/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db)):
    """Retrieve order details."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "order_id": order.order_id,
        "status": order.status,
        "items": order.items,
        "subtotal": order.subtotal,
        "discount": order.discount,
        "total": order.total,
        "razorpay_order_id": order.razorpay_order_id,
        "razorpay_payment_id": order.razorpay_payment_id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }
