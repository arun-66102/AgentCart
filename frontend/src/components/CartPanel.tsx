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
    <div className="glass rounded-2xl p-5 animate-slide-up">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-lg">🛒</span>
        Your Cart
      </h3>

      {/* Line Items */}
      <div className="space-y-2 mb-4">
        {cart.line_items.map((item) => (
          <div
            key={item.product_id}
            className="flex justify-between items-center py-2 border-b border-surface-600 last:border-0"
          >
            <div>
              <div className="text-sm text-white font-medium">{item.name}</div>
              <div className="text-xs text-slate-500">
                ₹{item.price.toLocaleString("en-IN")} × {item.qty}
              </div>
            </div>
            <div className="text-sm font-semibold text-white">
              ₹{item.line_total.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Subtotal</span>
          <span>₹{cart.subtotal.toLocaleString("en-IN")}</span>
        </div>
        {cart.discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Bundle Discount</span>
            <span>− ₹{cart.discount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-surface-600">
          <span>Total</span>
          <span className="gradient-text">₹{cart.total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Guardrails summary */}
      {validation && (
        <div className="mb-4 space-y-1.5">
          {Object.entries(validation.checks).map(([key, check]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={check.passed ? "text-emerald-400" : "text-red-400"}>
                {check.passed ? "✓" : "✗"}
              </span>
              <span className={check.passed ? "text-slate-300" : "text-red-300"}>
                {key.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(onAuthorize || onCancel) && (
        <div className="flex gap-2">
          {onAuthorize && (
            <button
              onClick={onAuthorize}
              disabled={loading || (validation && !validation.all_passed)}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                "✓ Authorize & Pay"
              )}
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="btn-ghost text-sm">
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
