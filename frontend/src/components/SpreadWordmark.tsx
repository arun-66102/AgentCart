import { useEffect, useRef } from "react";

/**
 * SpreadWordmark
 * The brand name set letter-by-letter, centered inside the container.
 * On scroll, letters fan outward smoothly from the centre towards the outer margin,
 * staying 100% within the container boundaries at all times.
 */

const BRAND = "AGENTCART";

interface SpreadWordmarkProps {
  fontSize?: string;
  className?: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function SpreadWordmark({ fontSize = "clamp(42px, 8.5vw, 140px)", className = "" }: SpreadWordmarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    const n = letters.length;
    const centre = (n - 1) / 2;

    const SCROLL_START = 0;
    const SCROLL_END = 500;
    const MAX_SINK_EM = 0.10;

    function update() {
      const scroll = window.scrollY;
      const t = Math.min(Math.max((scroll - SCROLL_START) / (SCROLL_END - SCROLL_START), 0), 1);

      const containerW = containerRef.current?.offsetWidth ?? window.innerWidth;
      // Controlled expansion that begins grouped and expands outwards comfortably within padding
      const maxLetterGap = Math.min((containerW * 0.72) / (n - 1), 70);

      letters.forEach((el, i) => {
        if (!el) return;
        const distFromCentre = i - centre;
        const spreadX = lerp(0, distFromCentre * maxLetterGap, t);
        const sinkY = lerp(0, MAX_SINK_EM, t);
        el.style.transform = `translateX(${spreadX}px) translateY(${sinkY}em)`;
      });

      rafRef.current = null;
    }

    function onScroll() {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`lp-wordmark ${className}`}
      style={{ fontSize }}
      aria-label={BRAND}
      role="img"
    >
      {BRAND.split("").map((char, i) => (
        <span
          key={i}
          ref={(el) => { lettersRef.current[i] = el; }}
          className="lp-wordmark__letter"
        >
          {char}
        </span>
      ))}
    </div>
  );
}


