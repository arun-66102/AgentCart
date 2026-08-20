import React from "react";
import type { DashboardMetrics } from "../services/api";

interface DashboardMetricsProps {
  metrics: DashboardMetrics;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "blue" | "yellow" | "red" | "purple";
  icon: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, color = "blue", icon }) => {
  const colorMap = {
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-brand-400 bg-brand-500/10 border-brand-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`metric-card border ${colorMap[color].split(" ").slice(2).join(" ")}`}>
      <div className={`w-10 h-10 rounded-xl ${colorMap[color].split(" ").slice(1, 2).join("")} border ${colorMap[color].split(" ").slice(2).join(" ")} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold mb-0.5 ${colorMap[color].split(" ")[0]}`}>{value}</div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
};

export const DashboardMetricsPanel: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* Revenue */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span>💰</span> Revenue
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon="📊" label="Total GMV" value={fmt(metrics.revenue.total_gmv)} color="green" />
          <KpiCard icon="⬆️" label="Upsell Revenue" value={fmt(metrics.revenue.upsell_revenue)} color="blue" />
          <KpiCard icon="↔️" label="Cross-sell Revenue" value={fmt(metrics.revenue.cross_sell_revenue)} color="purple" />
          <KpiCard icon="🤖" label="AI-attributed" value={fmt(metrics.revenue.ai_attributed_revenue)} color="blue" />
          <KpiCard icon="🎯" label="Avg Order Value" value={fmt(metrics.revenue.avg_order_value)} color="yellow" />
        </div>
      </section>

      {/* Commerce */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span>🛒</span> Commerce
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard icon="💬" label="Buyer Requests" value={metrics.commerce.buyer_requests.toLocaleString()} color="blue" />
          <KpiCard icon="🔍" label="Product Searches" value={metrics.commerce.product_searches.toLocaleString()} color="purple" />
          <KpiCard icon="✅" label="Successful Orders" value={metrics.commerce.successful_orders.toLocaleString()} color="green" />
          <KpiCard icon="📈" label="Conversion Rate" value={`${metrics.commerce.conversion_rate}%`} color="yellow" />
        </div>
      </section>

      {/* Agent + Safety */}
      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>🤖</span> Agent Performance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon="⬆️" label="Upsell Offers" value={metrics.agent.upsell_offers} color="purple" />
            <KpiCard icon="↔️" label="Cross-sell Offers" value={metrics.agent.cross_sell_offers} color="blue" />
            <KpiCard icon="🚫" label="Policy Violations" value={metrics.agent.policy_violations} color={metrics.agent.policy_violations === 0 ? "green" : "red"} />
            <KpiCard icon="🔒" label="Unauthorized Payments" value={metrics.agent.unauthorized_payments} color={metrics.agent.unauthorized_payments === 0 ? "green" : "red"} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>🛡️</span> Safety
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon="💳" label="Financial Actions" value={metrics.safety.financial_actions} color="blue" />
            <KpiCard icon="✓" label="Authorized Actions" value={metrics.safety.authorized_actions} color="green" />
            <KpiCard icon="⛔" label="Blocked Actions" value={metrics.safety.blocked_actions} color={metrics.safety.blocked_actions === 0 ? "green" : "yellow"} />
            <KpiCard icon="📜" label="Audit Coverage" value={`${metrics.safety.audit_coverage}%`} color="green" />
          </div>
        </section>
      </div>
    </div>
  );
};
