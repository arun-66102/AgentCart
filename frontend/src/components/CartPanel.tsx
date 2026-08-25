import React from "react";
import type { CartSummary, Validation } from "../services/api";

interface CartPanelProps {
  cart: CartSummary;
  validation?: Validation;
  onAuthorize?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  validation,
  onAuthorize,
  onCancel,
  loading = false,
}) => {
  return (
    <div style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)" }} className="animate-slide-up">

      {/* Title row */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)" }}>
          Your Cart
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>
          {cart.line_items.length} item{cart.line_items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Line items */}
      <div>
        {cart.line_items.map((item) => (
          <div
            key={item.product_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "12px 20px",
              borderBottom: "1px solid var(--hairline)",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{item.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                ₹{item.price.toLocaleString("en-IN")} × {item.qty}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              ₹{item.line_total.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)", marginBottom: 6 }}>
          <span>Subtotal</span>
          <span>₹{cart.subtotal.toLocaleString("en-IN")}</span>
        </div>
        {cart.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)", marginBottom: 6 }}>
            <span>Bundle Discount</span>
            <span>− ₹{cart.discount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--ink)", paddingTop: 8, borderTop: "1px solid var(--hairline)", fontVariantNumeric: "tabular-nums" }}>
          <span>Total</span>
          <span style={{ color: "var(--blue)" }}>₹{cart.total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Guardrails mini-list */}
      {validation && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--hairline)" }}>
          {Object.entries(validation.checks).map(([key, check]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: 2, color: check.passed ? "var(--ink-2)" : "var(--red)" }}>
              <span style={{ color: check.passed ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                {check.passed ? "✓" : "✗"}
              </span>
              {key.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(onAuthorize || onCancel) && (
        <div style={{ padding: "16px 20px", display: "flex", gap: 10 }}>
          {onAuthorize && (
            <button
              onClick={onAuthorize}
              disabled={loading || (validation ? !validation.all_passed : false)}
              className="btn-primary"
              style={{ flex: 1, textAlign: "center", opacity: (loading || (validation && !validation.all_passed)) ? 0.45 : 1 }}
            >
              {loading ? "Processing…" : "Authorize & Pay"}
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="btn-ghost">
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
