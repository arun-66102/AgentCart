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
  primary: { label: "✦ Best Match", color: "badge-blue" },
  cross_sell: { label: "⊕ Add-On", color: "badge-green" },
  upsell: { label: "↑ Upgrade", color: "badge-yellow" },
  bundle: { label: "🎁 Bundle", color: "badge-green" },
};

const CATEGORY_ICONS: Record<string, string> = {
  headphones: "🎧",
  earbuds: "🎵",
  keyboard: "⌨️",
  mouse: "🖱️",
  laptop: "💻",
  speakers: "🔊",
  webcam: "📷",
  accessories: "🔌",
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  type = "primary",
  onAdd,
  onReject,
  compact = false,
}) => {
  const cfg = TYPE_CONFIG[type];
  const icon = CATEGORY_ICONS[product.category] || "📦";
  const stars = Math.round(product.rating);

  return (
    <div
      className={`glass rounded-2xl p-4 animate-slide-up transition-all duration-200 hover:border-brand-500/40 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cfg.color}>{cfg.label}</span>
              {!product.available && (
                <span className="badge-red">Out of Stock</span>
              )}
            </div>
            <h3 className="font-semibold text-white text-sm leading-snug">
              {product.name}
            </h3>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-white">
            ₹{product.price.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500">INR</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={i < stars ? "text-yellow-400" : "text-slate-700"}
            style={{ fontSize: "11px" }}
          >
            ★
          </span>
        ))}
        <span className="text-xs text-slate-500 ml-1">{product.rating}</span>
      </div>

      {/* Description */}
      {!compact && (
        <p className="text-slate-400 text-xs mb-3 leading-relaxed line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Features */}
      {!compact && product.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.features.slice(0, 4).map((f) => (
            <span
              key={f}
              className="bg-surface-700 text-slate-300 text-xs px-2 py-0.5 rounded-lg border border-surface-600"
            >
              {f}
            </span>
          ))}
          {product.features.length > 4 && (
            <span className="text-xs text-slate-500">
              +{product.features.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Bundle discount badge */}
      {product.bundle_discount > 0 && (
        <div className="mb-3 text-xs text-emerald-400 font-medium">
          🎁 {product.bundle_discount}% bundle discount available
        </div>
      )}

      {/* Actions */}
      {(onAdd || onReject) && (
        <div className="flex gap-2 mt-3">
          {onAdd && (
            <button onClick={onAdd} className="btn-primary flex-1 text-sm py-2">
              {type === "cross_sell" ? "Add to Cart" : type === "upsell" ? "Upgrade" : "Select"}
            </button>
          )}
          {onReject && (
            <button onClick={onReject} className="btn-ghost text-sm py-2 px-3">
              No thanks
            </button>
          )}
        </div>
      )}
    </div>
  );
};
