import React from "react";
import type { AuditLog } from "../services/api";

interface AuditTimelineProps {
  logs: AuditLog[];
}

const ACTOR_CONFIG: Record<string, { color: string; label: string; dotColor: string }> = {
  buyer_agent:    { color: "var(--blue)",   label: "Buyer Agent",    dotColor: "var(--blue)" },
  merchant_agent: { color: "var(--green)",  label: "Merchant Agent", dotColor: "var(--green)" },
  system:         { color: "var(--muted)",  label: "System",         dotColor: "var(--muted)" },
  user:           { color: "var(--yellow)", label: "User",           dotColor: "var(--yellow)" },
  policy_engine:  { color: "var(--ink)",    label: "Policy Engine",  dotColor: "var(--ink)" },
};

const STATUS_BADGE: Record<string, string> = {
  ok:      "badge-green",
  blocked: "badge-yellow",
  failed:  "badge-red",
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs }) => {
  if (!logs.length) {
    return (
      <div style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)", padding: 32, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 8 }}>
          Audit Trail
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
          No audit logs yet.<br />Start a conversation to see the agent trail.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)" }}>
          Audit Trail
        </span>
        <span className="badge-blue">{logs.length} events</span>
      </div>

      {/* Timeline */}
      <div style={{ maxHeight: 520, overflowY: "auto", padding: "8px 0", position: "relative" }}>
        {/* Vertical hairline */}
        <div style={{ position: "absolute", left: 28, top: 0, bottom: 0, width: 1, background: "var(--hairline)" }} />

        {logs.map((log, idx) => {
          const actor = ACTOR_CONFIG[log.actor] || {
            color: "var(--muted)",
            label: log.actor,
            dotColor: "var(--muted)",
          };
          return (
            <div
              key={log.id}
              className="animate-fade-in"
              style={{ display: "flex", gap: 16, padding: "10px 20px", animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              {/* Dot — small square */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  marginTop: 5,
                  background: actor.dotColor,
                  zIndex: 1,
                  position: "relative",
                }}
              />

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: actor.color }}>
                    {actor.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", fontWeight: 700 }}>
                    {formatAction(log.action)}
                  </span>
                  {log.status !== "ok" && (
                    <span className={STATUS_BADGE[log.status] || "badge-blue"}>{log.status}</span>
                  )}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginLeft: "auto", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>
                    {log.created_at ? formatTime(log.created_at) : ""}
                  </span>
                </div>

                {log.detail && Object.keys(log.detail).length > 0 && (
                  <details style={{ marginTop: 2 }}>
                    <summary style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Details
                    </summary>
                    <pre style={{ marginTop: 4, background: "var(--ground)", border: "1px solid var(--hairline)", padding: "8px 12px", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", lineHeight: 1.7 }}>
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
