import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";
import { TravellingProduct } from "../components/TravellingProduct";
import { SpreadWordmark } from "../components/SpreadWordmark";
import { DemoPipeline } from "../components/DemoPipeline";
import "./LandingPage.css";

/* ============================================================
   Reveal hook — fires once on intersection, never un-reveals
   ============================================================ */
function useReveal(rootMargin = "0px 0px -60px 0px") {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      document.documentElement.classList.add("lp-motion-ok");
    }

    const targets = document.querySelectorAll<HTMLElement>(".lp-reveal");
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target); // fire once
          }
        });
      },
      { rootMargin }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ============================================================
   Navigation
   ============================================================ */
function Nav({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <nav className="lp-nav" role="navigation" aria-label="Main navigation">
      <div className="lp-nav__inner">
        <a href="#top" className="lp-nav__wordmark">
          AgentCart<span className="period">.</span>
        </a>

        <div className="lp-nav__links">
          <a href="#argument" className="lp-nav__link">Platform</a>
          <a href="#demo"     className="lp-nav__link">Demo</a>
          <a href="#stack"    className="lp-nav__link">Stack</a>
          <a href="#specs"    className="lp-nav__link">Specs</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Dark / light toggle */}
          <button
            className="lp-theme-toggle"
            onClick={onToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "◑ Light" : "◐ Dark"}
          </button>

          <Link to="/app" className="lp-nav__cta" id="nav-enter-app">
            Enter App →
          </Link>
        </div>
      </div>
    </nav>
  );
}


/* ============================================================
   Hero
   ============================================================ */
function HeroSection() {
  return (
    <section id="top" className="lp-hero" aria-label="Hero">
      <div className="lp-hero__inner">
        <div className="lp-hero__copy">
          <p className="lp-hero__kicker lp-reveal is-visible">
            Agentic Commerce Platform
          </p>

          <h1 className="lp-hero__headline lp-reveal is-visible lp-reveal-delay-1">
            Where AI buyers{" "}
            <em>discover</em>
            {" "}and buy.
          </h1>

          <p className="lp-hero__lede lp-reveal is-visible lp-reveal-delay-2">
            Two intelligent agents collaborate in real time. The buyer extracts
            your intent and enforces your budget. The merchant searches, recommends,
            and optimises. Every decision is policy-gated and audited.
          </p>

          <div className="lp-hero__actions lp-reveal is-visible lp-reveal-delay-3">
            <Link to="/app" className="lp-btn lp-btn--primary" id="hero-enter-app">
              Enter Platform →
            </Link>
            <a href="#demo" className="lp-btn lp-btn--ghost" id="hero-watch-demo">
              Watch it draw
            </a>
          </div>
        </div>

        {/* Spec strip */}
        <div className="lp-hero__specs lp-reveal is-visible lp-reveal-delay-4">
          {[
            { label: "Protocol",  value: "REST / JSON" },
            { label: "Model",     value: "Groq · openai/gpt-oss-20b" },
            { label: "Payments",  value: "Razorpay test mode" },
            { label: "Guardrails", value: "5 deterministic checks" },
            { label: "Latency",   value: "< 800 ms E2E" },
          ].map(({ label, value }) => (
            <div key={label} className="lp-spec-item">
              <span className="lp-spec-item__label">{label}</span>
              <span className="lp-spec-item__value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full-width spread wordmark — cropped by page edge */}
      <div className="lp-wordmark-bar" aria-hidden="true">
        <SpreadWordmark />
      </div>
    </section>
  );
}

/* ============================================================
   Argument section
   ============================================================ */
const ARGUMENT_ROWS = [
  {
    label: "Autonomous\nNegotiation",
    desc: "The buyer agent interprets natural-language intent, extracts budget constraints, and evaluates merchant offers — all without human input.",
    value: "AI → AI",
  },
  {
    label: "Policy-Gated\nSafety",
    desc: "Every transaction passes five deterministic guardrails before a Razorpay order is created. The LLM proposes; the policy engine decides.",
    value: "5 checks",
  },
  {
    label: "Revenue\nOptimizer",
    desc: "The merchant agent applies upsell, cross-sell, and bundle strategies within merchant-configured limits — no manual campaigns required.",
    value: "≤ 10% disc.",
  },
  {
    label: "Audit Trail",
    desc: "Every agent decision — intent extraction, offer generation, policy evaluation, payment attempt — is written to an immutable audit log.",
    value: "100% logged",
  },
];

function ArgumentSection() {
  return (
    <section id="argument" className="lp-section" aria-label="Platform argument">
      <div className="lp-two-col">
        <div className="lp-two-col__left lp-reveal">
          <span className="lp-section-label">Why it works</span>
          <h2 className="lp-section-heading">
            Commerce that<br />
            <em>reasons</em> about itself.
          </h2>
          <p className="lp-section-lede">
            Traditional checkouts are passive. AgentCart makes every purchase
            a collaboration between two intelligent agents, bound by rules you
            set and enforced by code, not intention.
          </p>
        </div>

        <div className="lp-two-col__right">
          {ARGUMENT_ROWS.map((row) => (
            <div key={row.label} className="lp-row lp-reveal">
              <span className="lp-row__label" style={{ whiteSpace: "pre-line" }}>
                {row.label}
              </span>
              <span className="lp-row__desc">{row.desc}</span>
              <span className="lp-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Demo section
   ============================================================ */
function DemoSection() {
  return (
    <section id="demo" className="lp-demo" aria-label="Live pipeline demonstration">
      <div className="lp-demo__inner">
        <div className="lp-demo__header">
          <div className="lp-demo__title-block lp-reveal">
            <span className="lp-section-label">The demonstration</span>
            <h2 className="lp-section-heading">
              The pipeline,{" "}
              <em>drawing itself.</em>
            </h2>
            <p className="lp-section-lede">
              This is the actual route an intent travels through AgentCart. Select a
              variant to see how the path — and the facts beneath it — change.
            </p>
          </div>
        </div>

        <DemoPipeline />
      </div>
    </section>
  );
}

/* ============================================================
   Material / Stack section
   ============================================================ */
const STACK_ROWS = [
  {
    label: "Inference",
    desc: "Groq API with the openai/gpt-oss-20b model handles intent extraction, catalog search reasoning, and offer evaluation.",
    value: "Groq",
  },
  {
    label: "API Layer",
    desc: "FastAPI (Python 3.12) serves all agent endpoints with async request handling and Pydantic-validated schemas.",
    value: "FastAPI",
  },
  {
    label: "Persistence",
    desc: "SQLite via SQLAlchemy stores products, orders, inventory, and the full audit trail with zero infrastructure overhead.",
    value: "SQLite",
  },
  {
    label: "Payments",
    desc: "Razorpay test-mode integration. Order amounts are sourced from the database — never the client. Signatures verified server-side.",
    value: "Razorpay",
  },
  {
    label: "Frontend",
    desc: "React 18 + TypeScript on Vite. The buyer chat, checkout flow, and merchant dashboard all run on a typed API client.",
    value: "React · TS",
  },
];

function MaterialSection() {
  return (
    <section id="stack" className="lp-section" aria-label="Technology stack">
      <div className="lp-two-col">
        <div className="lp-two-col__left lp-reveal">
          <span className="lp-section-label">The material</span>
          <h2 className="lp-section-heading">
            Chosen for<br />
            <em>reliability</em>{" "}at each layer.
          </h2>
          <p className="lp-section-lede">
            Each component was selected to match the trust required at its position
            in the financial pipeline — from fast inference to tamper-evident audit logs.
          </p>
        </div>

        <div className="lp-two-col__right">
          {STACK_ROWS.map((row) => (
            <div key={row.label} className="lp-row lp-reveal">
              <span className="lp-row__label">{row.label}</span>
              <span className="lp-row__desc">{row.desc}</span>
              <span className="lp-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Measurements section
   ============================================================ */
const MEASUREMENT_ROWS = [
  {
    label:  "API latency",
    desc:   "End-to-end agent chat pipeline — intent extraction through offer evaluation",
    value:  "< 800 ms",
  },
  {
    label:  "Catalog size",
    desc:   "TechStore product catalog seeded into SQLite at startup",
    value:  "20 items",
  },
  {
    label:  "Policy rules",
    desc:   "Deterministic guardrails applied before every Razorpay order creation",
    value:  "5 rules",
  },
  {
    label:  "Max offer",
    desc:   "Maximum value the merchant agent may propose autonomously without override",
    value:  "₹ 1,000",
  },
  {
    label:  "Discount cap",
    desc:   "Upper bound on any bundle or upsell discount the revenue optimizer may apply",
    value:  "10 %",
  },
  {
    label:  "Profit floor",
    desc:   "Minimum margin the policy engine requires before authorising any transaction",
    value:  "15 %",
  },
];

function MeasurementsSection() {
  return (
    <section id="specs" className="lp-section lp-measurements" aria-label="Specifications and measurements">
      <div style={{ marginBottom: 48 }} className="lp-reveal">
        <span className="lp-section-label">Measurements</span>
        <h2 className="lp-section-heading">Numbers that hold.</h2>
      </div>

      {MEASUREMENT_ROWS.map((row) => (
        <div key={row.label} className="lp-row lp-reveal">
          <span className="lp-row__label">{row.label}</span>
          <span className="lp-row__desc">{row.desc}</span>
          <span className="lp-row__value">{row.value}</span>
        </div>
      ))}
    </section>
  );
}

/* ============================================================
   Close section
   ============================================================ */
function CloseSection() {
  return (
    <section className="lp-close" aria-label="Call to action">
      <div className="lp-close__inner">
        <h2 className="lp-close__headline lp-reveal">
          Ready to enter the{" "}
          <em>platform.</em>
        </h2>
        <p className="lp-close__sub lp-reveal lp-reveal-delay-1">
          No keys required for demo mode. Full AI reasoning available with a Groq key.
        </p>

        <div className="lp-close__actions lp-reveal lp-reveal-delay-2">
          <Link to="/app" className="lp-btn lp-btn--primary" id="close-enter-app">
            Enter Platform →
          </Link>
          <Link to="/dashboard" className="lp-btn lp-btn--ghost" id="close-dashboard">
            View Dashboard
          </Link>
        </div>

        {/* Footer strip */}
        <div className="lp-close__footer lp-reveal lp-reveal-delay-3">
          <span className="lp-close__footer-copy">
            AgentCart © 2026 — AI-to-AI Commerce. Test mode only.
          </span>
          <div className="lp-close__footer-links">
            <a href="https://console.groq.com" className="lp-close__footer-link" target="_blank" rel="noopener noreferrer">Groq API</a>
            <a href="https://dashboard.razorpay.com" className="lp-close__footer-link" target="_blank" rel="noopener noreferrer">Razorpay</a>
            <Link to="/app" className="lp-close__footer-link">App →</Link>
          </div>
        </div>
      </div>

    </section>
  );
}


/* ============================================================
   Page root
   ============================================================ */
export function LandingPage() {
  useReveal();

  // Theme state — persisted to localStorage
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("ac-theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      try { localStorage.setItem("ac-theme", next); } catch {}
      return next;
    });
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lp-root" id="lp-root" data-theme={theme}>
      <Nav theme={theme} onToggle={toggleTheme} />
      <TravellingProduct />
      <HeroSection />
      <ArgumentSection />
      <DemoSection />
      <MaterialSection />
      <MeasurementsSection />
      <CloseSection />
    </div>
  );
}
