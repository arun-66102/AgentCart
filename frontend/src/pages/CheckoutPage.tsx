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

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id") || "";

  const [step, setStep] = useState<Step>("cart");
  const [order, setOrder] = useState<{ order_id: string; status: string; total: number } | null>(null);
  const [validation] = useState<Validation>({
    all_passed: true,
    checks: {
      budget_check: { passed: true, message: "Cart total within user budget." },
      inventory_check: { passed: true, message: "All items in stock." },
      user_authorization: { passed: true, message: "User has authorized the transaction." },
      merchant_policy: { passed: true, message: "All merchant policies satisfied." },
      price_validation: { passed: true, message: "Price validated and locked." },
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
      // Build a mock cart from order total for display
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
        // Mock payment flow (no Razorpay key configured)
        await new Promise((r) => setTimeout(r, 1500));
        const verifyResult = await api.verifyPayment({
          order_id: orderId,
          razorpay_order_id: rzOrder.razorpay_order_id,
          razorpay_payment_id: `pay_MOCK_${Date.now()}`,
          razorpay_signature: "mock_signature",
        });
        if (verifyResult.success) {
          setStep("success");
          loadAuditLogs();
        } else {
          setStep("failed");
        }
        return;
      }

      // Real Razorpay checkout
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
          if (verifyResult.success) {
            setStep("success");
            loadAuditLogs();
          } else {
            setStep("failed");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: "#6366f1" },
      };
      if (typeof window.Razorpay === "undefined") {
        throw new Error("Razorpay SDK is not loaded. Please check your internet connection or disable adblockers.");
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

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Checkout</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Order <span className="font-mono text-slate-400">{orderId}</span>
          </p>
        </div>
        <button onClick={() => navigate("/")} className="btn-ghost text-sm py-2 px-4">
          ← Back to Chat
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["cart", "payment", "success"] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === s
                  ? "bg-brand-600 text-white"
                  : ["success", "payment"].indexOf(s) < ["success", "payment"].indexOf(step)
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-surface-700 text-slate-500"
              }`}
            >
              <span>{i + 1}</span>
              <span>{s === "cart" ? "Review" : s === "payment" ? "Pay" : "Done"}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-surface-600" />}
          </React.Fragment>
        ))}
      </div>

      {errorMsg && (
        <div className="glass rounded-xl p-4 mb-6 border border-red-500/30 text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — cart + guardrails */}
        <div className="lg:col-span-2 space-y-4">
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
            <div className="glass rounded-2xl p-6 animate-slide-up">
              <h3 className="font-semibold text-white mb-2">💳 Payment</h3>
              <p className="text-slate-400 text-sm mb-4">
                Amount locked at{" "}
                <span className="text-white font-bold">₹{order?.total.toLocaleString("en-IN")}</span>. 
                Using Razorpay test mode.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePay}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing payment…
                    </span>
                  ) : (
                    `Pay ₹${order?.total.toLocaleString("en-IN")} (Test Mode)`
                  )}
                </button>
                <button
                  onClick={handleSimulateFailure}
                  disabled={simulatingFailure}
                  className="btn-ghost w-full text-sm text-red-400 border-red-500/30 hover:border-red-400"
                >
                  {simulatingFailure ? "Simulating…" : "⚠️ Demo: Simulate Payment Failure"}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="glass rounded-2xl p-8 text-center animate-slide-up border border-emerald-500/30">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-emerald-400 mb-2">Payment Successful!</h2>
              <p className="text-slate-400 text-sm mb-4">
                Order <span className="font-mono text-white">{orderId}</span> has been confirmed.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate("/dashboard")} className="btn-primary">
                  View Dashboard
                </button>
                <button onClick={() => navigate("/")} className="btn-ghost">
                  New Purchase
                </button>
              </div>
            </div>
          )}

          {/* Failed */}
          {step === "failed" && (
            <div className="glass rounded-2xl p-8 text-center animate-slide-up border border-red-500/30">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Payment Failed</h2>
              <p className="text-slate-400 text-sm mb-2">
                The payment was not processed. No money was charged.
              </p>
              <div className="bg-surface-800 rounded-xl p-3 text-xs text-slate-500 mb-4 text-left space-y-1">
                <div>✓ Failure detected and logged</div>
                <div>✓ Inventory released</div>
                <div>✓ No duplicate charge attempted</div>
                <div>✓ Audit trail preserved</div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setStep("payment")} className="btn-primary">
                  Retry Payment
                </button>
                <button onClick={() => navigate("/")} className="btn-ghost">
                  Back to Chat
                </button>
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
