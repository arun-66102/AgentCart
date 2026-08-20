import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { BuyerPage } from "./pages/BuyerPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CheckoutPage } from "./pages/CheckoutPage";

const NAV_LINKS = [
  { to: "/", label: "🤖 AI Buyer", exact: true },
  { to: "/dashboard", label: "📊 Dashboard" },
];

const NavBar: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="border-b border-surface-700 bg-surface-900/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-sm font-bold text-white group-hover:bg-brand-500 transition-colors">
            AC
          </div>
          <span className="font-bold text-white">AgentCart</span>
          <span className="badge-blue text-[9px] hidden sm:inline-block">AI Commerce</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-brand-600/30 text-brand-300 border border-brand-500/30"
                    : "text-slate-400 hover:text-white hover:bg-surface-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* TechStore badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          TechStore
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0f]">
        <NavBar />
        {/* Ambient glow */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 60%)",
          }}
        />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<BuyerPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
