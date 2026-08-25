import React from "react";
import type { DashboardMetrics } from "../services/api";

interface DashboardMetricsProps {
  metrics: DashboardMetrics;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, accent = "var(--ink)" }) => (
  <div
    className="metric-card"
    style={{ position: "relative" }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--blue)")}
    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--hairline)")}
  >
    {/* Accent rule */}
    <div style={{ width: 24, height: 1, background: accent, marginBottom: 14 }} />
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", marginBottom: 4 }}>
      {value}
    </div>
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
      {label}
    </div>
    {sub && (
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--hairline-bold)", marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

export const DashboardMetricsPanel: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${n.toLocaleString("en-IN")}`;

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--blue)" }} />
      {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

      {/* Revenue */}
      <section>
        {sectionLabel("Revenue")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1, border: "1px solid var(--hairline)", background: "var(--hairline)" }}>
          <KpiCard label="Total GMV"        value={fmt(metrics.revenue.total_gmv)}              accent="var(--blue)" />
          <KpiCard label="Upsell Revenue"   value={fmt(metrics.revenue.upsell_revenue)}          accent="var(--ink)" />
          <KpiCard label="Cross-sell Rev."  value={fmt(metrics.revenue.cross_sell_revenue)}      accent="var(--ink)" />
          <KpiCard label="AI-attributed"    value={fmt(metrics.revenue.ai_attributed_revenue)}   accent="var(--blue)" />
          <KpiCard label="Avg Order Value"  value={fmt(metrics.revenue.avg_order_value)}         accent="var(--ink)" />
        </div>
      </section>

      {/* Commerce */}
      <section>
        {sectionLabel("Commerce")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1, border: "1px solid var(--hairline)", background: "var(--hairline)" }}>
          <KpiCard label="Buyer Requests"   value={metrics.commerce.buyer_requests.toLocaleString()}   accent="var(--blue)" />
          <KpiCard label="Product Searches" value={metrics.commerce.product_searches.toLocaleString()}  accent="var(--ink)" />
          <KpiCard label="Successful Orders" value={metrics.commerce.successful_orders.toLocaleString()} accent="var(--green)" />
          <KpiCard label="Conversion Rate"  value={`${metrics.commerce.conversion_rate}%`}             accent="var(--ink)" />
        </div>
      </section>

      {/* Agent + Safety — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <section>
          {sectionLabel("Agent Performance")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--hairline)", background: "var(--hairline)" }}>
            <KpiCard label="Upsell Offers"    value={metrics.agent.upsell_offers}   accent="var(--ink)" />
            <KpiCard label="Cross-sell Offers" value={metrics.agent.cross_sell_offers} accent="var(--ink)" />
            <KpiCard
              label="Policy Violations"
              value={metrics.agent.policy_violations}
              accent={metrics.agent.policy_violations === 0 ? "var(--green)" : "var(--red)"}
            />
            <KpiCard
              label="Unauthorized Payments"
              value={metrics.agent.unauthorized_payments}
              accent={metrics.agent.unauthorized_payments === 0 ? "var(--green)" : "var(--red)"}
            />
          </div>
        </section>

        <section>
          {sectionLabel("Safety")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--hairline)", background: "var(--hairline)" }}>
            <KpiCard label="Financial Actions"  value={metrics.safety.financial_actions}  accent="var(--blue)" />
            <KpiCard label="Authorized Actions" value={metrics.safety.authorized_actions} accent="var(--green)" />
            <KpiCard
              label="Blocked Actions"
              value={metrics.safety.blocked_actions}
              accent={metrics.safety.blocked_actions === 0 ? "var(--green)" : "var(--yellow)"}
            />
            <KpiCard label="Audit Coverage"    value={`${metrics.safety.audit_coverage}%`} accent="var(--green)" />
          </div>
        </section>
      </div>
    </div>
  );
};
