import React from "react";
import type { AuditLog } from "../services/api";

interface AuditTimelineProps {
  logs: AuditLog[];
}

const ACTOR_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  buyer_agent: { color: "text-brand-400", label: "Buyer Agent", dot: "bg-brand-500 border-brand-400" },
  merchant_agent: { color: "text-emerald-400", label: "Merchant Agent", dot: "bg-emerald-500 border-emerald-400" },
  system: { color: "text-slate-400", label: "System", dot: "bg-slate-500 border-slate-400" },
  user: { color: "text-yellow-400", label: "User", dot: "bg-yellow-500 border-yellow-400" },
  policy_engine: { color: "text-orange-400", label: "Policy Engine", dot: "bg-orange-500 border-orange-400" },
};

const STATUS_BADGE: Record<string, string> = {
  ok: "badge-green",
  blocked: "badge-yellow",
  failed: "badge-red",
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
      <div className="glass rounded-2xl p-6 text-center text-slate-500">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm">No audit logs yet. Start a conversation to see the agent trail.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-lg">📋</span>
        Audit Trail
        <span className="badge-blue ml-auto">{logs.length} events</span>
      </h3>

      <div className="relative max-h-[520px] overflow-y-auto pr-1">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-surface-600" />

        <div className="space-y-4">
          {logs.map((log, idx) => {
            const actor = ACTOR_CONFIG[log.actor] || {
              color: "text-slate-400",
              label: log.actor,
              dot: "bg-slate-500 border-slate-400",
            };
            return (
              <div
                key={log.id}
                className="flex gap-4 animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                {/* Dot */}
                <div className={`timeline-dot ${actor.dot} z-10`} />

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-semibold ${actor.color}`}>
                      {actor.label}
                    </span>
                    <span className="text-xs text-white font-medium">
                      {formatAction(log.action)}
                    </span>
                    {log.status !== "ok" && (
                      <span className={STATUS_BADGE[log.status] || "badge-blue"}>
                        {log.status}
                      </span>
                    )}
                    <span className="text-xs text-slate-600 ml-auto font-mono">
                      {log.created_at ? formatTime(log.created_at) : ""}
                    </span>
                  </div>

                  {/* Detail */}
                  {log.detail && Object.keys(log.detail).length > 0 && (
                    <details className="text-xs text-slate-500 mt-1">
                      <summary className="cursor-pointer hover:text-slate-400 transition-colors">
                        Details
                      </summary>
                      <pre className="mt-1 bg-surface-900 rounded-lg p-2 overflow-x-auto text-slate-400 text-[10px] font-mono">
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
    </div>
  );
};
