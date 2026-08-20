import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import type { AgentChatResponse } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { CartPanel } from "../components/CartPanel";
import { GuardrailsPanel } from "../components/GuardrailsPanel";
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
  user: { label: "You", color: "text-white", bg: "chat-user" },
  buyer: { label: "🤖 AI Buyer Agent", color: "text-brand-400", bg: "chat-agent" },
  merchant: { label: "🏪 AI Merchant Agent", color: "text-emerald-400", bg: "chat-agent" },
  system: { label: "⚡ System", color: "text-slate-400", bg: "chat-agent" },
};

export const BuyerPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [latestResponse, setLatestResponse] = useState<AgentChatResponse | null>(null);
  const [cartItems, setCartItems] = useState<Array<{ product_id: string; qty: number }>>([]);
  const [userBudget, setUserBudget] = useState(50000);
  const [authState, setAuthState] = useState<{
    authorized?: boolean;
    orderId?: string;
    validation?: AgentChatResponse["merchant_response"] extends undefined ? never : Parameters<typeof GuardrailsPanel>[0]["validation"];
    cart?: Parameters<typeof CartPanel>[0]["cart"];
  }>({});
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
    setAuthState({});
    setCartItems([]);

    addMessage({ role: "user", content: text });

    try {
      addMessage({ role: "buyer", content: "Analyzing your request and extracting purchase intent…" });

      const response = await api.chat(text, sessionId || undefined);
      setSessionId(response.session_id);

      if (response.error) {
        addMessage({ role: "system", content: `❌ ${response.error}` });
        return;
      }

      const intent = response.intent;
      addMessage({
        role: "buyer",
        content: `I understood your request:\n📦 Category: **${intent.category}**\n💰 Budget: ₹${intent.max_price.toLocaleString("en-IN")}\n✨ Requirements: ${intent.requirements.join(", ")}\n\nSearching the TechStore catalog…`,
      });

      const merchant = response.merchant_response;
      if (merchant?.primary_recommendation) {
        const primary = merchant.primary_recommendation;
        let merchantMsg = `I found the best match for you!\n\n**${primary.name}** — ₹${primary.price.toLocaleString("en-IN")}\n\n*${primary.reason}*`;

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
          content: evaluation.buyer_message + `\n\n**Final cart total: ₹${evaluation.final_total.toLocaleString("en-IN")}**\n${evaluation.within_budget ? "✅ Within your budget." : "⚠️ Exceeds budget."}`,
        });
        setCartItems(evaluation.final_items || []);
        setUserBudget(intent.max_price);
      }

      setLatestResponse(response);
    } catch (err) {
      addMessage({ role: "system", content: `❌ Error: ${(err as Error).message}. Is the backend running?` });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!cartItems.length || !sessionId) return;
    setCheckoutLoading(true);

    try {
      const result = await api.authorize(sessionId, cartItems, userBudget, true);
      setAuthState({
        authorized: result.authorized,
        orderId: result.order_id,
        validation: result.validation as Parameters<typeof GuardrailsPanel>[0]["validation"],
        cart: result.cart,
      });

      if (result.authorized && result.order_id) {
        addMessage({
          role: "system",
          content: `✅ All guardrails passed! Order **${result.order_id}** created.\n\nProceeding to payment…`,
        });
        navigate(`/checkout?order_id=${result.order_id}`);
      }
    } catch (err) {
      addMessage({ role: "system", content: `❌ Authorization failed: ${(err as Error).message}` });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI Buyer Agent</h1>
          <p className="text-slate-500 text-sm mt-0.5">AI-to-AI commerce — just tell me what you need</p>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span className="badge-blue font-mono text-[10px]">
              Session: {sessionId.slice(0, 8)}…
            </span>
          )}
          <button
            onClick={() => { setMessages([]); setLatestResponse(null); setSessionId(""); setCartItems([]); setAuthState({}); }}
            className="btn-ghost text-sm py-2 px-3"
          >
            New Chat
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1">
        {/* Chat Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Example queries */}
          {!messages.length && (
            <div className="glass rounded-2xl p-6 mb-4 animate-fade-in">
              <p className="text-slate-400 text-sm mb-4 font-medium">Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm bg-surface-700 hover:bg-surface-600 border border-surface-600 hover:border-brand-500/50 text-slate-300 hover:text-white rounded-xl px-4 py-3 transition-all duration-200"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[600px] pr-1">
            {messages.map((msg) => {
              const cfg = ROLE_CONFIG[msg.role];
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
                >
                  <div className="max-w-2xl">
                    {!isUser && (
                      <div className={`text-xs font-semibold mb-1 ml-1 ${cfg.color}`}>
                        {cfg.label}
                      </div>
                    )}
                    <div className={cfg.bg}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                    <div className={`text-[10px] text-slate-600 mt-1 ${isUser ? "text-right mr-1" : "ml-1"}`}>
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="chat-agent flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-slate-500 text-xs">Agents working…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="glass rounded-2xl p-3 flex gap-2">
            <input
              className="input-primary flex-1"
              placeholder="Tell me what you want to buy… (e.g. wireless headphones under ₹5,000)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                "→"
              )}
            </button>
          </div>
        </div>

        {/* Sidebar — products + cart */}
        {latestResponse && (
          <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-[800px] pr-1">
            {/* Primary product */}
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

            {/* Cross-sell */}
            {latestResponse.merchant_response?.cross_sell_offers?.map((offer) => (
              <ProductCard
                key={offer.addon.product_id}
                product={offer.addon}
                type="cross_sell"
              />
            ))}

            {/* Cart + Authorize */}
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
