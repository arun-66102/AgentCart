"""
AI Buyer Agent — represents the customer's purchase intent.

Responsibilities:
  - Parse natural language user message into structured intent
  - Evaluate merchant offers (accept/reject/negotiate)
  - Check if offers fit the user's budget
  - Produce a final authorized basket

Uses Groq API (openai/gpt-oss-20b) for reasoning.
"""
import json
import re
from groq import Groq
from app.config.settings import get_settings

settings = get_settings()

BUYER_INTENT_PROMPT = """You are the AI Buyer Agent. Your job is to understand what the user wants to buy and extract structured purchase intent.

Extract the following from the user's message:
- category: product category (e.g. "headphones", "keyboard", "laptop", "mouse", "speakers")
- max_price: maximum budget in INR (number only, no currency symbol). If not mentioned, use 50000.
- requirements: list of key requirements (e.g. ["wireless", "good battery life", "noise cancellation"])
- priority: the most important requirement

Respond ONLY with valid JSON:
{
  "category": "...",
  "max_price": 0,
  "requirements": ["...", "..."],
  "priority": "...",
  "user_message": "original message"
}
"""

BUYER_EVALUATION_PROMPT = """You are the AI Buyer Agent evaluating a merchant's offer.

Your job:
1. Check if the recommended product meets the buyer's requirements.
2. Check if the total is within the buyer's budget.
3. Evaluate any cross-sell or upsell offers.
4. Make a decision.

Respond ONLY with valid JSON:
{
  "primary_accepted": true,
  "primary_reason": "Why you accept or reject the primary product",
  "cross_sell_accepted": false,
  "cross_sell_reason": "Why you accept or reject the cross-sell",
  "upsell_accepted": false,
  "upsell_reason": "Why you accept or reject the upsell",
  "final_items": [{"product_id": "...", "qty": 1}],
  "final_total": 0,
  "within_budget": true,
  "buyer_message": "Natural language summary of buyer's decision"
}
"""


def extract_intent(user_message: str) -> dict:
    """
    Step 1: Parse user's natural language into structured purchase intent.
    """
    if not settings.groq_api_key:
        return _heuristic_intent(user_message)

    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            client = Groq(api_key=settings.groq_api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": BUYER_INTENT_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_tokens=500,
            )
            content = response.choices[0].message.content.strip()

            # Extract JSON
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
            if json_match:
                content = json_match.group(1)

            intent = json.loads(content)
            intent["user_message"] = user_message
            return intent
        except Exception as e:
            print(f"[WARN] Groq model {model} failed in extract_intent: {e}")
            continue

    return _heuristic_intent(user_message)


def evaluate_offer(intent: dict, merchant_response: dict) -> dict:
    """
    Step 2: Buyer evaluates the merchant's offer.
    Checks budget, requirements, and decides on cross-sells/upsells.
    """
    if not settings.groq_api_key:
        return _heuristic_evaluation(intent, merchant_response)

    user_budget = intent.get("max_price", 50000)
    requirements = intent.get("requirements", [])

    evaluation_context = (
        f"Buyer requirements:\n"
        f"- Budget: ₹{user_budget:,.0f}\n"
        f"- Requirements: {', '.join(requirements)}\n"
        f"- Priority: {intent.get('priority', 'value for money')}\n\n"
        f"Merchant offer:\n{json.dumps(merchant_response, indent=2)}"
    )

    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            client = Groq(api_key=settings.groq_api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": BUYER_EVALUATION_PROMPT},
                    {"role": "user", "content": evaluation_context},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            content = response.choices[0].message.content.strip()

            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
            if json_match:
                content = json_match.group(1)

            evaluation = json.loads(content)
            return evaluation
        except Exception as e:
            print(f"[WARN] Groq model {model} failed in evaluate_offer: {e}")
            continue

    return _heuristic_evaluation(intent, merchant_response)


def _heuristic_intent(user_message: str) -> dict:
    """Fallback intent extraction without LLM."""
    msg = user_message.lower()
    category = "electronics"

    category_keywords = {
        "headphones": ["headphone", "headset", "over-ear", "on-ear"],
        "earbuds": ["earbud", "earphone", "tws", "in-ear", "airpod"],
        "keyboard": ["keyboard"],
        "mouse": ["mouse"],
        "laptop": ["laptop", "notebook", "macbook"],
        "speakers": ["speaker", "bluetooth speaker"],
        "webcam": ["webcam", "camera", "web cam"],
    }
    for cat, keywords in category_keywords.items():
        if any(kw in msg for kw in keywords):
            category = cat
            break

    # Extract budget
    import re
    price_match = re.search(r"[₹rs.]*\s*(\d[\d,]*)", msg)
    max_price = 50000
    if price_match:
        max_price = int(price_match.group(1).replace(",", ""))

    requirements = []
    if "wireless" in msg:
        requirements.append("wireless")
    if "battery" in msg:
        requirements.append("good battery life")
    if "noise" in msg or "anc" in msg:
        requirements.append("noise cancellation")
    if "gaming" in msg:
        requirements.append("gaming")
    if "portable" in msg:
        requirements.append("portable")

    return {
        "category": category,
        "max_price": max_price,
        "requirements": requirements or ["good value"],
        "priority": requirements[0] if requirements else "good value",
        "user_message": user_message,
    }


def _heuristic_evaluation(intent: dict, merchant_response: dict) -> dict:
    """Fallback offer evaluation without LLM."""
    user_budget = intent.get("max_price", 50000)

    primary = merchant_response.get("primary_recommendation", {})
    primary_price = primary.get("price", 0)
    primary_accepted = primary_price <= user_budget

    final_items = []
    final_total = 0.0

    if primary_accepted and primary.get("product_id"):
        final_items.append({"product_id": primary["product_id"], "qty": 1})
        final_total = primary_price

    # Evaluate cross-sell
    cross_accepted = False
    cross_reason = "Cross-sell not offered."
    cross_offers = merchant_response.get("cross_sell_offers", [])
    if cross_offers:
        offer = cross_offers[0]
        addon = offer.get("addon", {})
        addon_price = addon.get("price", 0)
        if final_total + addon_price <= user_budget:
            cross_accepted = True
            cross_reason = f"Within budget (₹{final_total + addon_price:,.0f} ≤ ₹{user_budget:,.0f})."
            if addon.get("product_id"):
                final_items.append({"product_id": addon["product_id"], "qty": 1})
                final_total += addon_price
        else:
            cross_reason = f"Exceeds budget (₹{final_total + addon_price:,.0f} > ₹{user_budget:,.0f})."

    return {
        "primary_accepted": primary_accepted,
        "primary_reason": f"Price ₹{primary_price:,.0f} is {'within' if primary_accepted else 'over'} budget ₹{user_budget:,.0f}.",
        "cross_sell_accepted": cross_accepted,
        "cross_sell_reason": cross_reason,
        "upsell_accepted": False,
        "upsell_reason": "Upsell not evaluated in fallback mode.",
        "final_items": final_items,
        "final_total": final_total,
        "within_budget": final_total <= user_budget,
        "buyer_message": (
            f"I'll go with the {primary.get('name', 'selected product')} at ₹{primary_price:,.0f}."
            + (f" Adding the cross-sell too — total ₹{final_total:,.0f}." if cross_accepted else "")
        ),
    }
