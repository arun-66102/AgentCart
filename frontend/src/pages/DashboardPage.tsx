import React, { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import type { DashboardMetrics, AuditLog } from "../services/api";
import { DashboardMetricsPanel } from "../components/DashboardMetrics";
import { AuditTimeline } from "../components/AuditTimeline";

type Tab = "metrics" | "audit" | "orders";

const TABS: [Tab, string][] = [
  ["metrics", "Metrics"],
  ["audit",   "Audit Trail"],
  ["orders",  "Orders"],
];

const STATUS_LABELS: Record<string, string> = {
  paid:       "badge-green",
  authorized: "badge-blue",
  pending:    "badge-yellow",
  failed:     "badge-red",
  cancelled:  "badge-red",
};

export const DashboardPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("metrics");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orders, setOrders] = useState<Array<{
    order_id: string;
    status: string;
    total: number;
    items_count: number;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, a, o] = await Promise.all([
        api.getDashboardMetrics(),
        api.getAuditLogs(200),
        api.getOrders(),
      ]);
      setMetrics(m);
      setAuditLogs(a.logs);
      setOrders(o.orders as typeof orders);
      setLastRefresh(new Date());
    } catch (err) {
      setError(`Failed to load dashboard: ${(err as Error).message}. Is the backend running?`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div style={{ minHeight: "calc(100vh - 58px)", maxWidth: 1400, margin: "0 auto", padding: "40px 40px" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", display: "block", marginBottom: 6 }}>
            Platform / Dashboard
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)", margin: 0 }}>
            Merchant Dashboard
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", margin: "6px 0 0", letterSpacing: "0.05em" }}>
            TechStore — AI Commerce Analytics
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
            {lastRefresh.toLocaleTimeString("en-IN")}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: "8px 16px", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ display: "inline-block", transform: loading ? "none" : undefined, animation: loading ? "spin 1s linear infinite" : undefined }}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Live strip ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
          Live — auto-refreshes every 15 s
        </span>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div style={{ border: "1px solid rgba(122, 32, 32, 0.30)", background: "rgba(122, 32, 32, 0.05)", padding: "12px 16px", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
          {error}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--hairline)", marginBottom: 32 }}>
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              padding: "12px 24px",
              background: tab === t ? "var(--ink)" : "transparent",
              color: tab === t ? "var(--ground)" : "var(--ink-2)",
              border: "none",
              borderRight: "1px solid var(--hairline)",
              borderBottom: tab === t ? "1px solid var(--ink)" : "none",
              marginBottom: tab === t ? -1 : 0,
              cursor: "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading && !metrics ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 24, height: 24, border: "1px solid var(--ink)", borderTop: "1px solid transparent", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>Loading dashboard…</p>
          </div>
        </div>
      ) : (
        <>
          {tab === "metrics" && metrics && (
            <div className="animate-fade-in">
              <DashboardMetricsPanel metrics={metrics} />
            </div>
          )}

          {tab === "audit" && (
            <div className="animate-fade-in">
              <AuditTimeline logs={auditLogs} />
            </div>
          )}

          {tab === "orders" && (
            <div className="animate-fade-in" style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                    {["Order ID", "Status", "Items", "Total", "Created"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          padding: "12px 20px",
                          textAlign: i >= 3 ? "right" : "left",
                          borderRight: i < 4 ? "1px solid var(--hairline)" : "none",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                        No orders yet. Start a conversation to create orders.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                        <td style={{ padding: "10px 20px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", borderRight: "1px solid var(--hairline)" }}>
                          {o.order_id}
                        </td>
                        <td style={{ padding: "10px 20px", borderRight: "1px solid var(--hairline)" }}>
                          <span className={STATUS_LABELS[o.status] || "badge-blue"}>{o.status}</span>
                        </td>
                        <td style={{ padding: "10px 20px", color: "var(--ink-2)", borderRight: "1px solid var(--hairline)" }}>
                          {o.items_count} item{o.items_count !== 1 ? "s" : ""}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, color: "var(--ink)", borderRight: "1px solid var(--hairline)" }}>
                          ₹{o.total.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "right", color: "var(--muted)", fontSize: 10 }}>
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
