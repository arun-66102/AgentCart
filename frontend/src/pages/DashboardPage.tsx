import React, { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import type { DashboardMetrics, AuditLog } from "../services/api";
import { DashboardMetricsPanel } from "../components/DashboardMetrics";
import { AuditTimeline } from "../components/AuditTimeline";

type Tab = "metrics" | "audit" | "orders";

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
    const interval = setInterval(loadData, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [loadData]);

  const STATUS_COLORS: Record<string, string> = {
    paid: "badge-green",
    authorized: "badge-blue",
    pending: "badge-yellow",
    failed: "badge-red",
    cancelled: "badge-red",
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Merchant Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">TechStore — AI Commerce Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 font-mono">
            Last refresh: {lastRefresh.toLocaleTimeString("en-IN")}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost text-sm py-2 px-4 flex items-center gap-2"
          >
            <span className={loading ? "animate-spin-slow" : ""}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 mb-6 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-xs text-slate-500">Live • Auto-refreshes every 15s</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-800 rounded-xl p-1 w-fit">
        {([["metrics", "📊 Metrics"], ["audit", "📋 Audit Trail"], ["orders", "📦 Orders"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-brand-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && !metrics ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading dashboard…</p>
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
            <div className="animate-fade-in glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-600">
                    <th className="text-left text-slate-400 font-medium px-5 py-3">Order ID</th>
                    <th className="text-left text-slate-400 font-medium px-5 py-3">Status</th>
                    <th className="text-left text-slate-400 font-medium px-5 py-3">Items</th>
                    <th className="text-right text-slate-400 font-medium px-5 py-3">Total</th>
                    <th className="text-right text-slate-400 font-medium px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-500 py-12 text-sm">
                        No orders yet. Start a conversation to create orders.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr
                        key={o.order_id}
                        className="border-b border-surface-700 hover:bg-surface-800/50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{o.order_id}</td>
                        <td className="px-5 py-3">
                          <span className={STATUS_COLORS[o.status] || "badge-blue"}>{o.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{o.items_count} item(s)</td>
                        <td className="px-5 py-3 text-right font-semibold text-white">
                          ₹{o.total.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500 font-mono">
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
