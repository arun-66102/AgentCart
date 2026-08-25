import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import type { AgentChatResponse } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { CartPanel } from "../components/CartPanel";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "buyer" | "merchant" | "system";
  content: string;
  timestamp: Date;
  data?: AgentChatResponse;
}

const EXAMPLE_QUERIES = [
  "I need wireless headphones under ₹5,000 with good battery life",
  "Looking for a keyboard and mouse combo under ₹3,000",
  "Best laptop under ₹60,000 for programming",
  "Bluetooth speakers for outdoor use under ₹4,000",
];

const ROLE_CONFIG = {
  user:     { label: "You",                  color: "var(--ground)", bg: "chat-user" },
  buyer:    { label: "AI Buyer Agent",        color: "var(--blue)",   bg: "chat-agent" },
  merchant: { label: "AI Merchant Agent",     color: "var(--green)",  bg: "chat-agent" },
  system:   { label: "System",               color: "var(--muted)",  bg: "chat-agent" },
};

export const BuyerPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [latestResponse, setLatestResponse] = useState<AgentChatResponse | null>(null);
  const [cartItems, setCartItems] = useState<Array<{ product_id: string; qty: number }>>([]);
  const [userBudget, setUserBudget] = useState(50000);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() },
    ]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setInput("");
    setLatestResponse(null);
    setCartItems([]);

    addMessage({ role: "user", content: text });

    try {
      addMessage({ role: "buyer", content: "Analyzing your request and extracting purchase intent…" });

      const response = await api.chat(text, sessionId || undefined);
      setSessionId(response.session_id);

      if (response.error) {
        addMessage({ role: "system", content: `Error — ${response.error}` });
        return;
      }

      const intent = response.intent;
      addMessage({
        role: "buyer",
        content: `Understood your request:\nCategory: ${intent.category}\nBudget: ₹${intent.max_price.toLocaleString("en-IN")}\nRequirements: ${intent.requirements.join(", ")}\n\nSearching the TechStore catalog…`,
      });

      const merchant = response.merchant_response;
      if (merchant?.primary_recommendation) {
        const primary = merchant.primary_recommendation;
        let merchantMsg = `Best match found:\n\n${primary.name} — ₹${primary.price.toLocaleString("en-IN")}\n\n${primary.reason}`;

        if (merchant.cross_sell_offers?.length) {
          merchantMsg += `\n\n${merchant.cross_sell_offers[0].message}`;
        }
        if (merchant.upsell_offer) {
          merchantMsg += `\n\n${merchant.upsell_offer.message}`;
        }
        if (merchant.bundle_offer) {
          merchantMsg += `\n\n${merchant.bundle_offer.message}`;
        }

        addMessage({ role: "merchant", content: merchantMsg });
      }

      const evaluation = response.buyer_evaluation;
      if (evaluation) {
        addMessage({
          role: "buyer",
          content: evaluation.buyer_message + `\n\nFinal cart total: ₹${evaluation.final_total.toLocaleString("en-IN")}\n${evaluation.within_budget ? "Within budget." : "Exceeds budget."}`,
        });
        setCartItems(evaluation.final_items || []);
        setUserBudget(intent.max_price);
      }

      setLatestResponse(response);
    } catch (err) {
      addMessage({ role: "system", content: `Error: ${(err as Error).message}. Is the backend running?` });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!cartItems.length || !sessionId) return;
    setCheckoutLoading(true);

    try {
      const result = await api.authorize(sessionId, cartItems, userBudget, true);

      if (result.authorized && result.order_id) {
        addMessage({
          role: "system",
          content: `All guardrails passed. Order ${result.order_id} created.\n\nProceeding to payment…`,
        });
        navigate(`/checkout?order_id=${result.order_id}`);
      }
    } catch (err) {
      addMessage({ role: "system", content: `Authorization failed: ${(err as Error).message}` });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", maxWidth: 1400, margin: "0 auto", padding: "40px 40px" }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", display: "block", marginBottom: 6 }}>
            Platform / Buyer
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)", margin: 0 }}>
            AI Buyer Agent
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", margin: "6px 0 0", letterSpacing: "0.05em" }}>
            AI-to-AI commerce — tell me what you need
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {sessionId && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--muted)", border: "1px solid var(--hairline)", padding: "4px 10px" }}>
              Session: {sessionId.slice(0, 8)}…
            </span>
          )}
          <button
            onClick={() => { setMessages([]); setLatestResponse(null); setSessionId(""); setCartItems([]); }}
            className="btn-ghost"
            style={{ padding: "8px 16px", fontSize: 10 }}
          >
            New Chat
          </button>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "flex-start" }}>

        {/* Chat column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Example queries */}
          {!messages.length && (
            <div className="animate-fade-in" style={{ border: "1px solid var(--hairline)", background: "var(--ground-2)", padding: 24, marginBottom: 20 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
                Try asking:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      lineHeight: 1.7,
                      letterSpacing: "0.04em",
                      color: "var(--ink-2)",
                      background: "var(--ground)",
                      border: "1px solid var(--hairline-bold)",
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease, color 0.15s ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--blue)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-bold)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-2)"; }}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, overflowY: "auto", maxHeight: 560, paddingRight: 4 }}>
            {messages.map((msg) => {
              const cfg = ROLE_CONFIG[msg.role];
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }} className="animate-slide-up">
                  <div style={{ maxWidth: "72%" }}>
                    {!isUser && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: cfg.color, marginBottom: 4 }}>
                        {cfg.label}
                      </div>
                    )}
                    <div className={cfg.bg}>
                      <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--muted)", marginTop: 3, textAlign: isUser ? "right" : "left" }}>
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }} className="animate-fade-in">
                <div className="chat-agent" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{ width: 6, height: 6, background: "var(--ink)", animation: "bounce 1s ease infinite", animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>Agents working…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ border: "1px solid var(--hairline-bold)", background: "var(--ground-2)", padding: 8, display: "flex", gap: 8 }}>
            <input
              className="input-primary"
              style={{ flex: 1, border: "none", background: "transparent", padding: "10px 12px" }}
              placeholder="Tell me what you want to buy… (e.g. wireless headphones under ₹5,000)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="btn-primary"
              style={{ padding: "10px 20px", fontSize: 14, letterSpacing: 0, textTransform: "none" }}
            >
              {loading ? "…" : "→"}
            </button>
          </div>
        </div>

        {/* Sidebar — products + cart */}
        {latestResponse && (
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 800, paddingRight: 2 }}>
            {latestResponse.merchant_response?.primary_recommendation && (
              <ProductCard
                product={{
                  ...latestResponse.merchant_response.primary_recommendation,
                  description: "",
                  currency: "INR",
                  category: latestResponse.intent.category,
                  features: [],
                  rating: 0,
                  available: true,
                  inventory: 1,
                  related_products: [],
                  upsell_products: [],
                  cross_sell_products: [],
                  bundle_products: [],
                  bundle_discount: 0,
                }}
                type="primary"
              />
            )}

            {latestResponse.merchant_response?.cross_sell_offers?.map((offer) => (
              <ProductCard
                key={offer.addon.product_id}
                product={offer.addon}
                type="cross_sell"
              />
            ))}

            {cartItems.length > 0 && latestResponse.buyer_evaluation && (
              <CartPanel
                cart={{
                  subtotal: latestResponse.buyer_evaluation.final_total,
                  discount: 0,
                  total: latestResponse.buyer_evaluation.final_total,
                  line_items: cartItems.map((item) => ({
                    product_id: item.product_id,
                    name: item.product_id,
                    price: 0,
                    qty: item.qty,
                    line_total: 0,
                  })),
                  currency: "INR",
                }}
                onAuthorize={handleAuthorize}
                loading={checkoutLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
