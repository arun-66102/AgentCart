import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { BuyerPage } from "./pages/BuyerPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LandingPage } from "./pages/LandingPage";

/* ============================================================
   Theme context — read from localStorage, synced with landing page
   ============================================================ */
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("ac-theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  const toggle = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      try { localStorage.setItem("ac-theme", next); } catch {}
      return next;
    });
  };

  return { theme, toggle };
}

/* ============================================================
   App-shell navbar — shown only on /app, /dashboard, /checkout
   Stationery design: parchment nav, serif wordmark, mono links
   ============================================================ */
const NAV_LINKS = [
  { to: "/app",       label: "AI Buyer",   exact: true },
  { to: "/dashboard", label: "Dashboard" },
];

const AppNavBar: React.FC<{ theme: "light" | "dark"; onToggle: () => void }> = ({ theme, onToggle }) => {
  const { pathname } = useLocation();
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        height: 58,
        background: theme === "dark" ? "rgba(20, 24, 15, 0.92)" : "rgba(239, 233, 221, 0.90)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Wordmark */}
        <Link
          to="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          AgentCart<span style={{ color: "var(--blue)" }}>.</span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {NAV_LINKS.map((link) => {
            const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "var(--blue)" : "var(--ink-2)",
                  textDecoration: "none",
                  borderBottom: active ? "1px solid var(--blue)" : "1px solid transparent",
                  paddingBottom: 2,
                  transition: "color 0.15s ease, border-color 0.15s ease",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions — theme toggle + live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              background: "transparent",
              border: "1px solid var(--hairline-bold)",
              padding: "5px 12px",
              cursor: "pointer",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--blue)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-bold)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-2)"; }}
          >
            {theme === "dark" ? "◑ Light" : "◐ Dark"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                background: "var(--green)",
              }}
            />
            TechStore
          </div>
        </div>
      </div>
    </nav>
  );
};

/* ============================================================
   App shell — wraps app pages (/app, /dashboard, /checkout)
   ============================================================ */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggle } = useTheme();

  return (
    <div
      className="app-shell"
      data-theme={theme}
      style={{
        minHeight: "100vh",
        background: "var(--ground)",
        color: "var(--ink)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <AppNavBar theme={theme} onToggle={toggle} />
      <main style={{ position: "relative" }}>{children}</main>
    </div>
  );
};

/* ============================================================
   Router
   ============================================================ */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — has its own nav and design system */}
        <Route path="/" element={<LandingPage />} />

        {/* App shell pages — stationery theme + AppNavBar */}
        <Route path="/app"       element={<AppShell><BuyerPage /></AppShell>} />
        <Route path="/dashboard" element={<AppShell><DashboardPage /></AppShell>} />
        <Route path="/checkout"  element={<AppShell><CheckoutPage /></AppShell>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
