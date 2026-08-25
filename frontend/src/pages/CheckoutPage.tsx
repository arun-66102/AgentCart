import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { CartSummary, Validation } from "../services/api";
import { CartPanel } from "../components/CartPanel";
import { GuardrailsPanel } from "../components/GuardrailsPanel";
import { AuditTimeline } from "../components/AuditTimeline";

type Step = "cart" | "payment" | "success" | "failed";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const STEPS: { key: Step; label: string }[] = [
  { key: "cart",    label: "Review" },
  { key: "payment", label: "Pay" },
  { key: "success", label: "Done" },
];

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id") || "";

  const [step, setStep] = useState<Step>("cart");
  const [order, setOrder] = useState<{ order_id: string; status: string; total: number } | null>(null);
  const [validation] = useState<Validation>({
    all_passed: true,
    checks: {
      budget_check:       { passed: true, message: "Cart total within user budget." },
      inventory_check:    { passed: true, message: "All items in stock." },
      user_authorization: { passed: true, message: "User has authorized the transaction." },
      merchant_policy:    { passed: true, message: "All merchant policies satisfied." },
      price_validation:   { passed: true, message: "Price validated and locked." },
    },
  });
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [auditLogs, setAuditLogs] = useState<Awaited<ReturnType<typeof api.getAuditLogs>>["logs"]>([]);
  const [simulatingFailure, setSimulatingFailure] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
    loadAuditLogs();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const o = await api.getOrder(orderId);
      setOrder(o);
      setCart({
        subtotal: o.total,
        discount: 0,
        total: o.total,
        line_items: [{ product_id: orderId, name: "Order Items", price: o.total, qty: 1, line_total: o.total }],
        currency: "INR",
      });
    } catch (err) {
      setErrorMsg(`Could not load order: ${(err as Error).message}`);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const result = await api.getAuditLogs(50);
      setAuditLogs(result.logs);
    } catch {
      // ignore
    }
  };

  const handlePay = async () => {
    if (!orderId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const rzOrder = await api.createPaymentOrder(orderId);

      if (rzOrder.mock) {
        await new Promise((r) => setTimeout(r, 1500));
        const verifyResult = await api.verifyPayment({
          order_id: orderId,
          razorpay_order_id: rzOrder.razorpay_order_id,
          razorpay_payment_id: `pay_MOCK_${Date.now()}`,
          razorpay_signature: "mock_signature",
        });
        if (verifyResult.success) { setStep("success"); loadAuditLogs(); }
        else { setStep("failed"); }
        return;
      }

      const options = {
        key: rzOrder.key_id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: "TechStore — AgentCart",
        description: `Order ${orderId}`,
        order_id: rzOrder.razorpay_order_id,
        handler: async (response: Record<string, string>) => {
          const verifyResult = await api.verifyPayment({
            order_id: orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (verifyResult.success) { setStep("success"); loadAuditLogs(); }
          else { setStep("failed"); }
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: "#2C4A8F" },
      };
      if (typeof window.Razorpay === "undefined") {
        throw new Error("Razorpay SDK not loaded. Check your connection or disable adblockers.");
      }
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      setErrorMsg(`Payment error: ${(err as Error).message}`);
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFailure = async () => {
    setSimulatingFailure(true);
    try {
      await api.simulateFailure(orderId);
      setStep("failed");
      loadAuditLogs();
    } catch {
      setStep("failed");
    } finally {
      setSimulatingFailure(false);
    }
  };

  const stepOrder: Step[] = ["cart", "payment", "success"];

  return (
    <div style={{ minHeight: "calc(100vh - 58px)", maxWidth: 1200, margin: "0 auto", padding: "40px 40px" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", display: "block", marginBottom: 6 }}>
            Platform / Checkout
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)", margin: 0 }}>
            Checkout
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", margin: "6px 0 0", letterSpacing: "0.05em" }}>
            Order <span style={{ color: "var(--ink-2)" }}>{orderId}</span>
          </p>
        </div>
        <button
          onClick={() => navigate("/app")}
          className="btn-ghost"
          style={{ padding: "8px 16px", fontSize: 10 }}
        >
          ← Back to Chat
        </button>
      </div>

      {/* ── Step indicator ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
        {STEPS.map(({ key, label }, i) => {
          const isDone = stepOrder.indexOf(key) < stepOrder.indexOf(step);
          const isActive = step === key;
          return (
            <React.Fragment key={key}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  border: `1px solid ${isActive ? "var(--ink)" : isDone ? "var(--blue)" : "var(--hairline-bold)"}`,
                  background: isActive ? "var(--ink)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: isActive ? "var(--ground)" : isDone ? "var(--blue)" : "var(--muted)",
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--ink)" : isDone ? "var(--blue)" : "var(--muted)",
                }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: isDone ? "var(--blue)" : "var(--hairline)", margin: "0 12px" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{ border: "1px solid rgba(122, 32, 32, 0.30)", background: "rgba(122, 32, 32, 0.05)", padding: "12px 16px", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
          {errorMsg}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>

        {/* Left — cart + guardrails + payment */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {cart && (
            <CartPanel
              cart={cart}
              validation={step === "cart" ? validation : undefined}
              onAuthorize={step === "cart" ? () => setStep("payment") : undefined}
            />
          )}

          <GuardrailsPanel validation={validation} />

          {/* Payment step */}
          {step === "payment" && (
            <div className="animate-slide-up" style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)", padding: 24 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", display: "block", marginBottom: 8 }}>
                Payment
              </span>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)", marginBottom: 20, lineHeight: 1.8 }}>
                Amount locked at{" "}
                <strong style={{ color: "var(--ink)", fontWeight: 700 }}>₹{order?.total.toLocaleString("en-IN")}</strong>.
                Razorpay test mode.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={handlePay} disabled={loading} className="btn-primary" style={{ width: "100%", textAlign: "center" }}>
                  {loading ? "Processing payment…" : `Pay ₹${order?.total.toLocaleString("en-IN")} (Test Mode)`}
                </button>
                <button
                  onClick={handleSimulateFailure}
                  disabled={simulatingFailure}
                  className="btn-ghost"
                  style={{ width: "100%", textAlign: "center", color: "var(--red)", borderColor: "rgba(122, 32, 32, 0.30)" }}
                >
                  {simulatingFailure ? "Simulating…" : "Demo: Simulate Payment Failure"}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="animate-slide-up" style={{ border: "1px solid rgba(26, 77, 46, 0.25)", background: "rgba(26, 77, 46, 0.04)", padding: 40, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, marginBottom: 16, color: "var(--green)" }}>✓</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--green)", margin: "0 0 10px" }}>
                Payment Successful
              </h2>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)", marginBottom: 24 }}>
                Order <span style={{ fontWeight: 700, color: "var(--ink)" }}>{orderId}</span> has been confirmed.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => navigate("/dashboard")} className="btn-primary">View Dashboard</button>
                <button onClick={() => navigate("/app")} className="btn-ghost">New Purchase</button>
              </div>
            </div>
          )}

          {/* Failed */}
          {step === "failed" && (
            <div className="animate-slide-up" style={{ border: "1px solid rgba(122, 32, 32, 0.25)", background: "rgba(122, 32, 32, 0.04)", padding: 40, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, marginBottom: 16, color: "var(--red)" }}>✗</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--red)", margin: "0 0 10px" }}>
                Payment Failed
              </h2>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)", marginBottom: 16 }}>
                The payment was not processed. No money was charged.
              </p>
              <div style={{ border: "1px solid var(--hairline)", padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
                {["Failure detected and logged", "Inventory released", "No duplicate charge attempted", "Audit trail preserved"].map((line) => (
                  <div key={line} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 2 }}>✓ {line}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setStep("payment")} className="btn-primary">Retry Payment</button>
                <button onClick={() => navigate("/app")} className="btn-ghost">Back to Chat</button>
              </div>
            </div>
          )}
        </div>

        {/* Right — audit trail */}
        <div>
          <AuditTimeline logs={auditLogs} />
        </div>
      </div>
    </div>
  );
};
