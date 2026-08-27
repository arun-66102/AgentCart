"""
AI Merchant Agent — represents the TechStore merchant.

Responsibilities:
  - Search the product catalog based on buyer intent
  - Rank and recommend products
  - Apply revenue optimizer (upsell / cross-sell / bundle)
  - Return a structured offer to the buyer agent
  - Enforce merchant guardrails via the policy engine

Uses Groq API (llama3-70b-8192) for reasoning.
"""
import json
import re
from sqlalchemy.orm import Session
from groq import Groq
from app.config.settings import get_settings
from app.tools.catalog_tools import search_products, get_product, calculate_cart
from app.tools.inventory_tools import check_inventory_bulk
from app.agents.revenue_agent import compute_upsell, compute_cross_sell, compute_bundle
from app.policies.policy_engine import policy_engine

settings = get_settings()

MERCHANT_SYSTEM_PROMPT = """You are the AI Merchant Agent for TechStore, an AI-native electronics store.

Your role:
1. Receive a structured buyer intent (category, budget, requirements).
2. Analyze the products provided to you.
3. Recommend the BEST matching product(s).
4. Identify relevant upsells or cross-sells (only if they fit the user's budget).
5. Return a structured JSON response.

Rules:
- NEVER recommend out-of-stock products.
- NEVER exceed the user's stated budget in the primary recommendation.
- Respect all merchant policies (discounts, margins, category limits).
- Be concise and helpful. Explain WHY you recommend each product.
- Always return valid JSON.

Your response MUST be a JSON object with this structure:
{
  "primary_recommendation": {
    "product_id": "...",
    "name": "...",
    "price": 0,
    "reason": "Why this product best matches the buyer's needs"
  },
  "additional_items": [
    {
      "product_id": "...",
      "name": "...",
      "price": 0,
      "type": "cross_sell|bundle",
      "reason": "Why this adds value"
    }
  ],
  "offer_message": "Natural language offer to present to the buyer",
  "cart_total": 0,
  "within_budget": true
}
"""


def run_merchant_agent(
    db: Session,
    intent: dict,
    session_id: str,
) -> dict:
    """
    Main entry point for the merchant agent.

    intent: {
      "category": str,
      "max_price": float,
      "requirements": list[str],
      "user_message": str,
    }
    """
    category = intent.get("category", "")
    max_price = intent.get("max_price", 100000)
    requirements = intent.get("requirements", [])
    user_message = intent.get("user_message", "")

    # Step 1: Search catalog (deterministic tool)
    products = search_products(
        db,
        category=category,
        max_price=max_price,
        limit=8,
    )

    if not products:
        # Try a broader search
        products = search_products(db, query=user_message, max_price=max_price, limit=8)

    if not products:
        return {
            "error": True,
            "message": "No products found matching your requirements. Please try a different search.",
            "products": [],
        }

    # Step 2: Check inventory in bulk (deterministic)
    product_ids = [p["product_id"] for p in products]
    inv_results = check_inventory_bulk(db, product_ids)
    inv_map = {r["product_id"]: r["available"] for r in inv_results}

    # Filter only available products
    available_products = [p for p in products if inv_map.get(p["product_id"], False)]
    if not available_products:
        available_products = products  # fallback: show all even if low stock

    # Step 3: Ask Groq to reason about the best recommendation
    product_context = json.dumps(available_products, indent=2)
    user_context = (
        f"Buyer requirements:\n"
        f"- Category: {category}\n"
        f"- Max budget: ₹{max_price:,.0f}\n"
        f"- Requirements: {', '.join(requirements)}\n"
        f"- Original message: {user_message}\n\n"
        f"Available products:\n{product_context}"
    )

    groq_response = _call_groq(MERCHANT_SYSTEM_PROMPT, user_context)

    if groq_response.get("error"):
        # Fallback: pick the best-rated product deterministically
        best = max(available_products, key=lambda p: p["rating"])
        groq_response = {
            "primary_recommendation": {
                "product_id": best["product_id"],
                "name": best["name"],
                "price": best["price"],
                "reason": f"Highest rated product in category ({best['rating']}★)",
            },
            "additional_items": [],
            "offer_message": f"I recommend the {best['name']} at ₹{best['price']:,.0f}.",
            "cart_total": best["price"],
            "within_budget": best["price"] <= max_price,
        }

    # Step 4: Run revenue optimizer on the primary recommendation
    primary_id = groq_response.get("primary_recommendation", {}).get("product_id")
    primary_price = groq_response.get("primary_recommendation", {}).get("price", 0)
    offers = []

    if primary_id:
        # Try cross-sell
        cross = compute_cross_sell(db, primary_id, primary_price, max_price)
        if cross:
            offers.append(cross)

        # Try upsell (replaces primary if accepted)
        upsell = compute_upsell(db, primary_id, max_price)
        if upsell:
            groq_response["upsell_offer"] = upsell

        # Try bundle if additional items already exist
        existing_ids = [primary_id] + [
            i.get("product_id") for i in groq_response.get("additional_items", [])
        ]
        bundle = compute_bundle(db, existing_ids, max_price)
        if bundle:
            groq_response["bundle_offer"] = bundle

    groq_response["cross_sell_offers"] = offers
    groq_response["session_id"] = session_id
    groq_response["products_searched"] = len(products)

    return groq_response


def _call_groq(system_prompt: str, user_content: str) -> dict:
    """Call Groq API and parse JSON response."""
    if not settings.groq_api_key:
        return {"error": "GROQ_API_KEY not configured"}

    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            client = Groq(api_key=settings.groq_api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
                max_tokens=1500,
            )
            content = response.choices[0].message.content.strip()

            # Extract JSON from response (handles markdown code fences)
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
            if json_match:
                content = json_match.group(1)

            return json.loads(content)
        except json.JSONDecodeError:
            return {"error": "Failed to parse LLM response as JSON", "raw": content}
        except Exception as e:
            print(f"[WARN] Groq model {model} failed in _call_groq: {e}")
            continue

    return {"error": "All Groq model attempts failed"}
