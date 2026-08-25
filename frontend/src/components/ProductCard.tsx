import React from "react";
import type { Product } from "../services/api";

interface ProductCardProps {
  product: Product;
  type?: "primary" | "cross_sell" | "upsell" | "bundle";
  onAdd?: () => void;
  onReject?: () => void;
  compact?: boolean;
}

const TYPE_CONFIG = {
  primary:    { label: "Best Match" },
  cross_sell: { label: "Add-On" },
  upsell:     { label: "Upgrade" },
  bundle:     { label: "Bundle" },
};

const TYPE_BADGE_CLASS = {
  primary:    "badge-blue",
  cross_sell: "badge-green",
  upsell:     "badge-yellow",
  bundle:     "badge-green",
};

const CATEGORY_ICONS: Record<string, string> = {
  headphones:  "🎧",
  earbuds:     "🎵",
  keyboard:    "⌨",
  mouse:       "⊙",
  laptop:      "▭",
  speakers:    "◈",
  webcam:      "◉",
  accessories: "◫",
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  type = "primary",
  onAdd,
  onReject,
  compact = false,
}) => {
  const cfg = TYPE_CONFIG[type];
  const badgeCls = TYPE_BADGE_CLASS[type];
  const icon = CATEGORY_ICONS[product.category] || "◦";
  const stars = Math.round(product.rating);

  return (
    <div
      className="animate-slide-up"
      style={{
        border: "1px solid var(--hairline)",
        background: "var(--ground-2)",
        padding: compact ? 14 : 20,
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--blue)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--hairline)")}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, lineHeight: 1, color: "var(--ink-2)", flexShrink: 0 }}>{icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className={badgeCls}>{cfg.label}</span>
              {!product.available && <span className="badge-red">Out of Stock</span>}
            </div>
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.5, letterSpacing: "0.04em" }}>
              {product.name}
            </h3>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>INR</div>
        </div>
      </div>

      {/* Rating */}
      {product.rating > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: 10, color: i < stars ? "var(--ink)" : "var(--hairline-bold)" }}>★</span>
          ))}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginLeft: 4 }}>{product.rating}</span>
        </div>
      )}

      {/* Description */}
      {!compact && product.description && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.8, letterSpacing: "0.04em", marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {product.description}
        </p>
      )}

      {/* Features */}
      {!compact && product.features.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {product.features.slice(0, 4).map((f) => (
            <span key={f} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--ink-2)", border: "1px solid var(--hairline)", padding: "2px 7px" }}>
              {f}
            </span>
          ))}
          {product.features.length > 4 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>+{product.features.length - 4} more</span>
          )}
        </div>
      )}

      {/* Bundle discount */}
      {product.bundle_discount > 0 && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", marginBottom: 10, letterSpacing: "0.06em" }}>
          {product.bundle_discount}% bundle discount available
        </div>
      )}

      {/* Actions */}
      {(onAdd || onReject) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
          {onAdd && (
            <button onClick={onAdd} className="btn-primary" style={{ flex: 1, textAlign: "center", padding: "8px 14px", fontSize: 10 }}>
              {type === "cross_sell" ? "Add to Cart" : type === "upsell" ? "Upgrade" : "Select"}
            </button>
          )}
          {onReject && (
            <button onClick={onReject} className="btn-ghost" style={{ padding: "8px 14px", fontSize: 10 }}>
              No thanks
            </button>
          )}
        </div>
      )}
    </div>
  );
};
