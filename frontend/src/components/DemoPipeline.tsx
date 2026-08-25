import { useEffect, useRef, useState } from "react";

/**
 * DemoPipeline
 * Self-drawing SVG demonstration of the AgentCart pipeline.
 * Each variant shows a different flow path with a distinct stroke weight.
 * On mount and on variant change: getTotalLength() → strokeDasharray/Offset → animate to 0.
 */

export type Variant = "standard" | "upsell" | "bundle";

interface VariantConfig {
  label: string;
  facts: [string, string, string];
  factLabels: [string, string, string];
  strokeWidth: number;
  // SVG path string
  path: string;
  // Node positions for labels [x, y]
  nodes: Array<{ x: number; y: number; label: string; sublabel: string }>;
}

// Viewbox: 0 0 900 280
const VARIANTS: Record<Variant, VariantConfig> = {
  standard: {
    label: "Standard Flow",
    strokeWidth: 2,
    facts: ["< 800ms", "1 rec.", "100%"],
    factLabels: ["End-to-end latency", "Primary recommendation", "Policy compliance"],
    // Single horizontal pipeline: User → Buyer Agent → Merchant Agent → Policy Engine → Checkout
    path: "M 60 140 C 100 140, 140 140, 200 140 C 260 140, 300 100, 360 100 C 420 100, 460 140, 520 140 C 580 140, 620 180, 680 180 C 740 180, 780 140, 840 140",
    nodes: [
      { x:  60, y: 140, label: "USER",    sublabel: "intent" },
      { x: 200, y: 140, label: "BUYER",   sublabel: "agent" },
      { x: 360, y: 100, label: "MERCHANT",sublabel: "agent" },
      { x: 520, y: 140, label: "POLICY",  sublabel: "engine" },
      { x: 680, y: 180, label: "PAYMENT", sublabel: "gateway" },
      { x: 840, y: 140, label: "CONFIRM", sublabel: "order" },
    ],
  },
  upsell: {
    label: "Upsell Path",
    strokeWidth: 2.5,
    facts: ["+ ₹1,200", "2 offers", "< ₹3,000"],
    factLabels: ["Average upsell value", "Offers evaluated", "Max price delta"],
    // Adds a branch up to a revenue optimiser node
    path: "M 60 160 C 100 160, 150 160, 200 160 C 250 160, 280 120, 340 100 C 400 80, 440 80, 500 80 C 540 80, 560 100, 590 130 C 620 160, 650 180, 700 180 C 750 180, 800 160, 840 160",
    nodes: [
      { x:  60, y: 160, label: "USER",    sublabel: "query" },
      { x: 200, y: 160, label: "BUYER",   sublabel: "agent" },
      { x: 340, y: 100, label: "REVENUE", sublabel: "optimizer" },
      { x: 500, y:  80, label: "UPSELL",  sublabel: "offer" },
      { x: 700, y: 180, label: "EVAL",    sublabel: "buyer" },
      { x: 840, y: 160, label: "ACCEPT",  sublabel: "or reject" },
    ],
  },
  bundle: {
    label: "Bundle Mode",
    strokeWidth: 3,
    facts: ["3 items", "≤ 10%", "₹ locked"],
    factLabels: ["Items in bundle", "Max bundle discount", "Amount source"],
    // Two merging paths converging on a bundle node
    path: "M 60 100 C 120 100, 160 110, 220 130 C 280 150, 320 155, 380 155 M 60 210 C 120 210, 160 200, 220 180 C 280 160, 320 155, 380 155 M 380 155 C 460 155, 520 140, 580 130 C 640 120, 680 120, 730 130 C 780 140, 810 150, 840 155",
    nodes: [
      { x:  60, y: 100, label: "ITEM A",  sublabel: "primary" },
      { x:  60, y: 210, label: "ITEM B",  sublabel: "cross-sell" },
      { x: 380, y: 155, label: "BUNDLE",  sublabel: "engine" },
      { x: 580, y: 130, label: "POLICY",  sublabel: "check" },
      { x: 730, y: 130, label: "RAZORPAY",sublabel: "order" },
      { x: 840, y: 155, label: "RECEIPT", sublabel: "audit log" },
    ],
  },
};

interface DemoPipelineProps {
  initialVariant?: Variant;
}

export function DemoPipeline({ initialVariant = "standard" }: DemoPipelineProps) {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const pathRef = useRef<SVGPathElement | null>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = VARIANTS[variant];

  // Draw animation
  const animatePath = (pathEl: SVGPathElement) => {
    // Reset
    const len = pathEl.getTotalLength();
    pathEl.style.transition = "none";
    pathEl.style.strokeDasharray = String(len);
    pathEl.style.strokeDashoffset = String(len);

    // Force reflow
    void pathEl.getBoundingClientRect();

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      pathEl.style.strokeDashoffset = "0";
      return;
    }

    // Animate
    pathEl.style.transition = "stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)";
    pathEl.style.strokeDashoffset = "0";
  };

  // Handle variant switch
  useEffect(() => {
    if (animRef.current) clearTimeout(animRef.current);
    // Brief delay so React can render the new path first
    animRef.current = setTimeout(() => {
      if (pathRef.current) animatePath(pathRef.current);
    }, 30);
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [variant]);

  // IntersectionObserver — fire once on entry
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasEnteredRef.current) {
          hasEnteredRef.current = true;
          if (animRef.current) clearTimeout(animRef.current);
          animRef.current = setTimeout(() => {
            if (pathRef.current) animatePath(pathRef.current);
          }, 200);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef}>
      {/* Variant picker */}
      <div className="lp-variant-row" role="group" aria-label="Pipeline variant">
        {(Object.keys(VARIANTS) as Variant[]).map((v) => (
          <button
            key={v}
            className="lp-variant-btn"
            aria-pressed={variant === v}
            onClick={() => setVariant(v)}
          >
            {VARIANTS[v].label}
          </button>
        ))}
      </div>

      {/* Drawing panel */}
      <div className="lp-demo__panel" style={{ marginTop: 32 }}>
        <svg
          className="lp-demo__svg"
          viewBox="0 0 900 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`${cfg.label} pipeline diagram`}
        >
          {/* Grid dots — subtle texture */}
          {Array.from({ length: 10 }, (_, col) =>
            Array.from({ length: 5 }, (_, row) => (
              <circle
                key={`${col}-${row}`}
                cx={col * 100 + 50}
                cy={row * 60 + 30}
                r="1.5"
                fill="rgba(20,28,43,0.08)"
              />
            ))
          )}

          {/* The pipeline path — this is what draws itself */}
          <path
            ref={pathRef}
            d={cfg.path}
            stroke="#2C4A8F"
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
            fill="none"
          />

          {/* Node markers */}
          {cfg.nodes.map((node, i) => (
            <g key={i} transform={`translate(${node.x}, ${node.y})`}>
              <rect x="-28" y="-14" width="56" height="28" fill="#EFE9DD" stroke="#141C2B" strokeWidth="1.5" />
              <text
                x="0" y="-2"
                textAnchor="middle"
                fontFamily="Courier Prime, monospace"
                fontSize="8"
                fontWeight="700"
                letterSpacing="0.08em"
                fill="#141C2B"
              >
                {node.label}
              </text>
              <text
                x="0" y="9"
                textAnchor="middle"
                fontFamily="Courier Prime, monospace"
                fontSize="7"
                letterSpacing="0.06em"
                fill="#767E8C"
              >
                {node.sublabel}
              </text>
            </g>
          ))}

          {/* Arrow head at the end of the path */}
          <path
            d={variant === "bundle"
              ? "M 826 148 L 840 155 L 826 162"
              : variant === "upsell"
                ? "M 826 153 L 840 160 L 826 167"
                : "M 826 133 L 840 140 L 826 147"
            }
            stroke="#2C4A8F"
            strokeWidth="2"
            strokeLinecap="square"
            fill="none"
          />
        </svg>
      </div>

      {/* Facts strip */}
      <div className="lp-demo__facts">
        {cfg.factLabels.map((label, i) => (
          <div key={i} className="lp-demo__fact">
            <div className="lp-demo__fact-label">{label}</div>
            <div className="lp-demo__fact-value">{cfg.facts[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
