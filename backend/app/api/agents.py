"""
Agent Commerce API — the main AI-to-AI pipeline.

POST /api/agent/chat    → Full buyer→merchant→evaluation pipeline
POST /api/agent/intent  → Extract intent only (for debugging)
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.agents.buyer_agent import extract_intent, evaluate_offer
from app.agents.merchant_agent import run_merchant_agent
from app.tools.audit_tools import write_audit_log

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class IntentRequest(BaseModel):
    message: str


@router.post("/chat")
def agent_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Full AI-to-AI commerce pipeline:
    1. Buyer Agent extracts intent
    2. Merchant Agent searches catalog and generates offer
    3. Buyer Agent evaluates offer
    4. Returns complete commerce state for the frontend
    """
    session_id = req.session_id or str(uuid.uuid4())

    try:
        # Step 1 — Buyer Agent: extract intent
        write_audit_log(db, "user", "message_received",
                        {"message": req.message}, session_id=session_id)

        intent = extract_intent(req.message)
        write_audit_log(db, "buyer_agent", "intent_extracted",
                        intent, session_id=session_id)

        # Step 2 — Merchant Agent: search + recommend + revenue optimize
        merchant_response = run_merchant_agent(db, intent, session_id)

        if merchant_response.get("error"):
            write_audit_log(db, "merchant_agent", "search_failed",
                            {"error": merchant_response.get("message")},
                            session_id=session_id, status="failed")
            return {
                "session_id": session_id,
                "intent": intent,
                "error": merchant_response.get("message"),
            }

        primary = merchant_response.get("primary_recommendation", {})
        write_audit_log(db, "merchant_agent", "recommendation_generated",
                        {"primary": primary.get("product_id"), "products_searched": merchant_response.get("products_searched")},
                        session_id=session_id)

        # Log cross-sell offer if any
        cross_offers = merchant_response.get("cross_sell_offers", [])
        if cross_offers:
            write_audit_log(db, "merchant_agent", "cross_sell_offered",
                            {"addon": cross_offers[0].get("addon", {}).get("product_id")},
                            session_id=session_id)

        # Log upsell offer if any
        upsell = merchant_response.get("upsell_offer")
        if upsell:
            write_audit_log(db, "merchant_agent", "upsell_offered",
                            {"upsell_to": upsell.get("to_product", {}).get("product_id")},
                            session_id=session_id)

        # Step 3 — Buyer Agent: evaluate offer
        buyer_evaluation = evaluate_offer(intent, merchant_response)
        write_audit_log(db, "buyer_agent", "offer_evaluated",
                        {
                            "primary_accepted": buyer_evaluation.get("primary_accepted"),
                            "cross_sell_accepted": buyer_evaluation.get("cross_sell_accepted"),
                            "final_total": buyer_evaluation.get("final_total"),
                        },
                        session_id=session_id)

        return {
            "session_id": session_id,
            "intent": intent,
            "merchant_response": merchant_response,
            "buyer_evaluation": buyer_evaluation,
        }
    except Exception as e:
        print(f"[ERROR] agent_chat exception: {e}")
        return {
            "session_id": session_id,
            "intent": {"category": "general", "max_price": 50000, "requirements": [], "user_message": req.message},
            "error": f"Agent pipeline encountered an issue: {str(e)}",
        }


@router.post("/intent")
def extract_intent_only(req: IntentRequest):
    """Debug endpoint — extract buyer intent without running full pipeline."""
    intent = extract_intent(req.message)
    return {"intent": intent}
