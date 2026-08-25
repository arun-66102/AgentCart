import React from "react";
import type { Validation } from "../services/api";

interface GuardrailsPanelProps {
  validation: Validation;
}

const CHECK_LABELS: Record<string, string> = {
  budget_check:       "Budget Check",
  inventory_check:    "Inventory Check",
  user_authorization: "User Authorization",
  merchant_policy:    "Merchant Policy",
  price_validation:   "Price Validation",
};

export const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({ validation }) => {
  const allPassed = validation.all_passed;
  const checks = Object.entries(validation.checks);
  const passedCount = checks.filter(([, c]) => c.passed).length;
  const pct = Math.round((passedCount / checks.length) * 100);

  return (
    <div style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)" }} className="animate-slide-up">

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)" }}>
          Guardrails Check
        </span>
        <span className={allPassed ? "badge-green" : "badge-red"}>
          {allPassed ? "All Passed" : "Check Failed"}
        </span>
      </div>

      {/* Check rows */}
      <div>
        {checks.map(([key, check], idx) => (
          <div
            key={key}
            className="animate-fade-in"
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: "0 16px",
              alignItems: "start",
              padding: "14px 20px",
              borderBottom: idx < checks.length - 1 ? "1px solid var(--hairline)" : "none",
              animationDelay: `${idx * 80}ms`,
            }}
          >
            {/* Pass/fail marker — rectangular */}
            <div style={{
              width: 24,
              height: 24,
              border: `1px solid ${check.passed ? "rgba(26, 77, 46, 0.30)" : "rgba(122, 32, 32, 0.30)"}`,
              background: check.passed ? "rgba(26, 77, 46, 0.06)" : "rgba(122, 32, 32, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 700,
              color: check.passed ? "var(--green)" : "var(--red)",
              flexShrink: 0,
              marginTop: 1,
            }}>
              {check.passed ? "✓" : "✗"}
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: check.passed ? "var(--ink)" : "var(--red)", letterSpacing: "0.04em", marginBottom: 2 }}>
                {CHECK_LABELS[key] || key.replace(/_/g, " ")}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", lineHeight: 1.7, letterSpacing: "0.04em" }}>
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security score bar */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
          <span>Security Score</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }}>{passedCount}/{checks.length}</span>
        </div>
        {/* Hairline progress track */}
        <div style={{ height: 2, background: "var(--hairline)", width: "100%" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: allPassed ? "var(--green)" : "var(--red)",
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};
