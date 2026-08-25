import { useEffect, useRef } from "react";

/**
 * TravellingProduct
 * A single position:fixed cut-out that follows a scroll-driven path
 * across the opening sections of the page.
 *
 * Waypoints: { scrollY, x (vw%), y (vh%), rotation (deg), scale, opacity }
 * Between waypoints the values are linearly interpolated.
 *
 * Hidden entirely when prefers-reduced-motion is set.
 */

interface Waypoint {
  scrollY: number;
  x: number;   // % of viewport width
  y: number;   // % of viewport height
  rotation: number;
  scale: number;
  opacity: number;
}

const WAYPOINTS: Waypoint[] = [
  // Start — hero, right side, at rest
  { scrollY:    0, x: 58,  y: 18,  rotation:  0,   scale: 1,    opacity: 1 },
  // Scrolled a little — begins to drift right and descend
  { scrollY:  200, x: 64,  y: 26,  rotation:  6,   scale: 0.95, opacity: 1 },
  // Mid-hero — arcs across, tilts
  { scrollY:  500, x: 72,  y: 34,  rotation: 14,   scale: 0.88, opacity: 0.92 },
  // Entering argument section — moves toward centre-right
  { scrollY:  900, x: 60,  y: 48,  rotation: -4,   scale: 0.80, opacity: 0.80 },
  // Demo section entry — scales down, still visible
  { scrollY: 1400, x: 52,  y: 58,  rotation: -10,  scale: 0.68, opacity: 0.50 },
  // Exit — fade out below demo section
  { scrollY: 1800, x: 44,  y: 66,  rotation: -16,  scale: 0.55, opacity: 0 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolate(scroll: number): Omit<Waypoint, "scrollY"> {
  // Clamp to first/last
  if (scroll <= WAYPOINTS[0].scrollY) return WAYPOINTS[0];
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  if (scroll >= last.scrollY) return last;

  // Find surrounding pair
  let i = 0;
  while (i < WAYPOINTS.length - 2 && WAYPOINTS[i + 1].scrollY < scroll) i++;
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const t = (scroll - a.scrollY) / (b.scrollY - a.scrollY);

  return {
    x:        lerp(a.x,        b.x,        t),
    y:        lerp(a.y,        b.y,        t),
    rotation: lerp(a.rotation, b.rotation, t),
    scale:    lerp(a.scale,    b.scale,    t),
    opacity:  lerp(a.opacity,  b.opacity,  t),
  };
}

export function TravellingProduct() {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = elRef.current;
    if (!el) return;

    function applyState() {
      if (!el) return;
      const { x, y, rotation, scale, opacity } = interpolate(scrollRef.current);
      el.style.transform = `translate(${x}vw, ${y}vh) rotate(${rotation}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      rafRef.current = null;
    }

    function onScroll() {
      scrollRef.current = window.scrollY;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyState);
      }
    }

    // Initial position
    applyState();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={elRef}
      className="lp-product"
      aria-hidden="true"
      style={{ transform: `translate(58vw, 18vh) rotate(0deg) scale(1)`, opacity: 1 }}
    >
      {/* SVG cut-out: stylised intelligent-cart / node-network icon */}
      <svg
        className="lp-product__img"
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Drop shadow filter — only allowed shadow per spec */}
        <defs>
          <filter id="product-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#141C2B" floodOpacity="0.18" />
          </filter>
        </defs>

        <g filter="url(#product-shadow)">
          {/* Cart body */}
          <rect x="52" y="110" width="160" height="90" stroke="#141C2B" strokeWidth="2.5" fill="#EFE9DD" />
          
          {/* Cart handle / rail */}
          <path d="M 52 110 L 38 68 L 20 68" stroke="#141C2B" strokeWidth="2.5" strokeLinecap="square" fill="none" />
          
          {/* Cart wheels */}
          <circle cx="90"  cy="214" r="12" stroke="#141C2B" strokeWidth="2.5" fill="#EFE9DD" />
          <circle cx="174" cy="214" r="12" stroke="#141C2B" strokeWidth="2.5" fill="#EFE9DD" />
          
          {/* Wheel spokes */}
          <line x1="90"  y1="202" x2="90"  y2="226" stroke="#141C2B" strokeWidth="1.5" />
          <line x1="78"  y1="214" x2="102" y2="214" stroke="#141C2B" strokeWidth="1.5" />
          <line x1="174" y1="202" x2="174" y2="226" stroke="#141C2B" strokeWidth="1.5" />
          <line x1="162" y1="214" x2="186" y2="214" stroke="#141C2B" strokeWidth="1.5" />

          {/* Agent nodes inside cart */}
          {/* Buyer node */}
          <circle cx="96"  cy="148" r="16" stroke="#2C4A8F" strokeWidth="2" fill="#EFE9DD" />
          <text x="96" y="153" textAnchor="middle" fontFamily="Courier Prime, monospace" fontSize="10" fontWeight="700" fill="#2C4A8F">B</text>

          {/* Merchant node */}
          <circle cx="164" cy="148" r="16" stroke="#2C4A8F" strokeWidth="2" fill="#EFE9DD" />
          <text x="164" y="153" textAnchor="middle" fontFamily="Courier Prime, monospace" fontSize="10" fontWeight="700" fill="#2C4A8F">M</text>

          {/* Connection line between nodes */}
          <line x1="112" y1="148" x2="148" y2="148" stroke="#2C4A8F" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Signal dots on line */}
          <circle cx="130" cy="148" r="3" fill="#2C4A8F" />

          {/* Top antenna lines */}
          <line x1="96"  y1="132" x2="96"  y2="112" stroke="#141C2B" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="164" y1="132" x2="164" y2="112" stroke="#141C2B" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="96"  cy="108" r="4" fill="#141C2B" />
          <circle cx="164" cy="108" r="4" fill="#141C2B" />

          {/* Checkmark / verify mark top right */}
          <polyline points="210,68 218,78 232,58" stroke="#2C4A8F" strokeWidth="2.5" strokeLinecap="square" fill="none" />
        </g>
      </svg>
    </div>
  );
}
