import React from "react";
import type { Validation } from "../services/api";

interface GuardrailsPanelProps {
  validation: Validation;
}

const CHECK_LABELS: Record<string, string> = {
  budget_check: "Budget Check",
  inventory_check: "Inventory Check",
  user_authorization: "User Authorization",
  merchant_policy: "Merchant Policy",
  price_validation: "Price Validation",
};

export const GuardrailsPanel: React.FC<GuardrailsPanelProps> = ({ validation }) => {
  const allPassed = validation.all_passed;

  return (
    <div className="glass rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          Guardrails Check
        </h3>
        <span className={allPassed ? "badge-green" : "badge-red"}>
          {allPassed ? "All Passed" : "Check Failed"}
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(validation.checks).map(([key, check], idx) => (
          <div
            key={key}
            className="flex items-start gap-3 animate-fade-in"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300 ${
                check.passed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {check.passed ? "✓" : "✗"}
            </div>

            {/* Label + message */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${check.passed ? "text-white" : "text-red-300"}`}
              >
                {CHECK_LABELS[key] || key.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Security Score</span>
          <span>
            {Object.values(validation.checks).filter((c) => c.passed).length}/
            {Object.keys(validation.checks).length}
          </span>
        </div>
        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              allPassed ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{
              width: `${
                (Object.values(validation.checks).filter((c) => c.passed).length /
                  Object.keys(validation.checks).length) *
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
