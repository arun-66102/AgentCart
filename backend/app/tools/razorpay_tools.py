"""
Razorpay Tools — test-mode order creation and payment verification.
The LLM NEVER directly calls Razorpay. Only this module does.
"""
import hashlib
import hmac
import razorpay
from app.config.settings import get_settings

settings = get_settings()


def _get_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
    )


def create_razorpay_order(amount_inr: float, order_id: str, notes: dict | None = None) -> dict:
    """
    Create a Razorpay test order.
    amount_inr: amount in INR (will be converted to paise).
    Returns razorpay order data or error dict.
    """
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        # Mock response when keys are not configured (for development)
        return {
            "id": f"order_MOCK_{order_id}",
            "amount": int(amount_inr * 100),
            "currency": "INR",
            "status": "created",
            "mock": True,
        }

    try:
        client = _get_client()
        data = {
            "amount": int(amount_inr * 100),   # paise
            "currency": "INR",
            "receipt": order_id,
            "notes": notes or {},
        }
        rz_order = client.order.create(data=data)
        return {
            "id": rz_order["id"],
            "amount": rz_order["amount"],
            "currency": rz_order["currency"],
            "status": rz_order["status"],
            "mock": False,
        }
    except Exception as e:
        return {"error": str(e), "success": False}


def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict:
    """
    Verify Razorpay payment signature.
    This is a MANDATORY step — payment is only confirmed after verification.
    """
    if not settings.razorpay_key_secret:
        # Mock verification for development
        return {"verified": True, "mock": True}

    try:
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected = hmac.new(
            key=settings.razorpay_key_secret.encode("utf-8"),
            msg=msg.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).hexdigest()
        verified = hmac.compare_digest(expected, razorpay_signature)
        return {"verified": verified, "mock": False}
    except Exception as e:
        return {"verified": False, "error": str(e), "mock": False}


def simulate_payment_failure() -> dict:
    """Simulate a failed payment for demo purposes."""
    return {
        "status": "failed",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment failed due to insufficient funds.",
        "mock": True,
    }
