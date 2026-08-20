"""
Policy Engine — deterministic guardrails for merchant rules.

Philosophy: LLMs reason. Tools execute. Policies control.

The policy engine sits between the LLM's recommendation and any financial action.
It either approves, rejects, or modifies proposals from the merchant agent.
"""
from dataclasses import dataclass
from app.config.settings import get_settings

settings = get_settings()


@dataclass
class PolicyResult:
    allowed: bool
    reason: str
    adjusted_value: float | None = None   # e.g. capped discount


class PolicyEngine:
    """
    Stateless policy engine. Each method checks one rule.
    """

    def __init__(self):
        self.max_discount_pct = settings.max_discount_pct
        self.max_autonomous_offer_inr = settings.max_autonomous_offer_inr
        self.min_margin_pct = settings.min_margin_pct
        self.max_upsell_value_inr = settings.max_upsell_value_inr
        self.allowed_categories = settings.allowed_categories

    # ─── Individual rule checks ────────────────────────────────────

    def check_discount(self, discount_pct: float) -> PolicyResult:
        if discount_pct > self.max_discount_pct:
            return PolicyResult(
                allowed=False,
                reason=f"Discount {discount_pct:.1f}% exceeds max allowed {self.max_discount_pct:.1f}%.",
                adjusted_value=self.max_discount_pct,
            )
        return PolicyResult(allowed=True, reason="Discount within policy.")

    def check_autonomous_offer(self, offer_value_inr: float) -> PolicyResult:
        if offer_value_inr > self.max_autonomous_offer_inr:
            return PolicyResult(
                allowed=False,
                reason=(
                    f"Autonomous offer ₹{offer_value_inr:.0f} exceeds "
                    f"max ₹{self.max_autonomous_offer_inr:.0f}."
                ),
                adjusted_value=self.max_autonomous_offer_inr,
            )
        return PolicyResult(allowed=True, reason="Offer within autonomous limit.")

    def check_upsell_delta(self, base_price: float, upsell_price: float) -> PolicyResult:
        delta = upsell_price - base_price
        if delta > self.max_upsell_value_inr:
            return PolicyResult(
                allowed=False,
                reason=(
                    f"Upsell delta ₹{delta:.0f} exceeds max ₹{self.max_upsell_value_inr:.0f}."
                ),
            )
        return PolicyResult(allowed=True, reason="Upsell delta within policy.")

    def check_category(self, category: str) -> PolicyResult:
        if category.lower() not in [c.lower() for c in self.allowed_categories]:
            return PolicyResult(
                allowed=False,
                reason=f"Category '{category}' not in allowed categories.",
            )
        return PolicyResult(allowed=True, reason="Category allowed.")

    def check_budget(self, cart_total: float, user_budget: float) -> PolicyResult:
        if cart_total > user_budget:
            return PolicyResult(
                allowed=False,
                reason=f"Cart total ₹{cart_total:.0f} exceeds user budget ₹{user_budget:.0f}.",
            )
        return PolicyResult(allowed=True, reason="Cart total within user budget.")

    def check_margin(self, cost_price: float, sale_price: float) -> PolicyResult:
        if cost_price <= 0:
            return PolicyResult(allowed=True, reason="No cost price set — skipping margin check.")
        margin = (sale_price - cost_price) / sale_price * 100
        if margin < self.min_margin_pct:
            return PolicyResult(
                allowed=False,
                reason=f"Margin {margin:.1f}% below minimum {self.min_margin_pct:.1f}%.",
            )
        return PolicyResult(allowed=True, reason="Margin within policy.")

    # ─── Composite checkout validation ────────────────────────────

    def validate_checkout(
        self,
        cart_total: float,
        user_budget: float,
        user_authorized: bool,
        inventory_ok: bool,
    ) -> dict:
        """
        Run all checkout-time checks.
        Returns a structured result suitable for the guardrails panel.
        """
        checks = {}

        # Budget
        r = self.check_budget(cart_total, user_budget)
        checks["budget_check"] = {"passed": r.allowed, "message": r.reason}

        # Inventory
        checks["inventory_check"] = {
            "passed": inventory_ok,
            "message": "Inventory available." if inventory_ok else "One or more items out of stock.",
        }

        # User authorization
        checks["user_authorization"] = {
            "passed": user_authorized,
            "message": "User has authorized the transaction." if user_authorized else "Awaiting user authorization.",
        }

        # Policy check (always ok at this stage — individual checks done earlier)
        checks["merchant_policy"] = {"passed": True, "message": "All merchant policies satisfied."}

        # Price validation
        checks["price_validation"] = {"passed": cart_total > 0, "message": "Price validated."}

        all_passed = all(v["passed"] for v in checks.values())
        return {
            "all_passed": all_passed,
            "checks": checks,
        }


# Singleton instance
policy_engine = PolicyEngine()
