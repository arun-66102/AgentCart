"""
Revenue Agent — computes upsell, cross-sell and bundle offers.
This is called by the merchant agent to enrich recommendations.
"""
from sqlalchemy.orm import Session
from app.tools.catalog_tools import get_product, get_upsell_products, get_related_products
from app.policies.policy_engine import policy_engine


def compute_upsell(db: Session, product_id: str, user_budget: float) -> dict | None:
    """
    Find a valid upsell product for the given product.
    Only returns if:
    - The upsell is within user_budget
    - The price delta is within policy
    """
    base = get_product(db, product_id)
    if not base:
        return None

    upsells = get_upsell_products(db, product_id)
    for upsell in upsells:
        if not upsell["available"]:
            continue
        if upsell["price"] > user_budget:
            continue
        delta_check = policy_engine.check_upsell_delta(base["price"], upsell["price"])
        if not delta_check.allowed:
            continue
        return {
            "type": "upsell",
            "from_product": base,
            "to_product": upsell,
            "price_delta": upsell["price"] - base["price"],
            "message": (
                f"Upgrade to **{upsell['name']}** for just "
                f"₹{upsell['price'] - base['price']:,.0f} more. "
                f"You get: {', '.join(upsell['features'][:3])}."
            ),
        }
    return None


def compute_cross_sell(
    db: Session,
    product_id: str,
    cart_total: float,
    user_budget: float,
) -> dict | None:
    """
    Find a valid cross-sell add-on within user's remaining budget.
    Only returns one offer at a time.
    """
    related = get_related_products(db, product_id)
    remaining_budget = user_budget - cart_total

    for addon in related:
        if not addon["available"]:
            continue
        if addon["price"] > remaining_budget:
            continue
        offer_check = policy_engine.check_autonomous_offer(addon["price"])
        if not offer_check.allowed:
            continue
        return {
            "type": "cross_sell",
            "addon": addon,
            "cart_total_after": cart_total + addon["price"],
            "message": (
                f"Customers who bought this also got **{addon['name']}** for ₹{addon['price']:,.0f}. "
                f"Would you like to add it? Your total would be ₹{cart_total + addon['price']:,.0f} "
                f"(within your ₹{user_budget:,.0f} budget)."
            ),
        }
    return None


def compute_bundle(db: Session, items: list[str], user_budget: float) -> dict | None:
    """
    Check if items in cart qualify for a bundle discount.
    """
    discounts = []
    for product_id in items:
        product = get_product(db, product_id)
        if not product or not product.get("bundle_products"):
            continue
        for bp_id in product["bundle_products"]:
            if bp_id in items and product["bundle_discount"] > 0:
                bp = get_product(db, bp_id)
                if bp:
                    disc_amount = bp["price"] * product["bundle_discount"] / 100
                    discounts.append({
                        "product": product["name"],
                        "addon": bp["name"],
                        "discount_pct": product["bundle_discount"],
                        "discount_amount": round(disc_amount, 2),
                    })

    if not discounts:
        return None

    total_discount = sum(d["discount_amount"] for d in discounts)
    disc_check = policy_engine.check_discount(
        sum(d["discount_pct"] for d in discounts) / len(discounts)
    )
    if not disc_check.allowed:
        total_discount = total_discount * (disc_check.adjusted_value or 0) / (
            sum(d["discount_pct"] for d in discounts) / len(discounts)
        )

    return {
        "type": "bundle",
        "discounts": discounts,
        "total_discount": round(total_discount, 2),
        "message": (
            f"🎁 Bundle deal! You're saving ₹{total_discount:,.0f} by buying these together."
        ),
    }
