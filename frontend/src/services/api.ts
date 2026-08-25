// API service — all backend calls in one place.
// BASE_URL is intentionally empty: the Vite dev proxy forwards /api/* to
// http://127.0.0.1:8000, making all requests same-origin and eliminating
// CORS preflight failures. In production, configure a reverse proxy similarly.
const BASE_URL = "";

export interface Intent {
  category: string;
  max_price: number;
  requirements: string[];
  priority: string;
  user_message: string;
}

export interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  features: string[];
  rating: number;
  available: boolean;
  inventory: number;
  related_products: string[];
  upsell_products: string[];
  cross_sell_products: string[];
  bundle_products: string[];
  bundle_discount: number;
}

export interface CartItem {
  product_id: string;
  qty: number;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  total: number;
  line_items: Array<{
    product_id: string;
    name: string;
    price: number;
    qty: number;
    line_total: number;
  }>;
  currency: string;
}

export interface Validation {
  all_passed: boolean;
  checks: Record<string, { passed: boolean; message: string }>;
}

export interface AgentChatResponse {
  session_id: string;
  intent: Intent;
  merchant_response: {
    primary_recommendation: {
      product_id: string;
      name: string;
      price: number;
      reason: string;
    };
    additional_items: Array<{
      product_id: string;
      name: string;
      price: number;
      type: string;
      reason: string;
    }>;
    offer_message: string;
    cart_total: number;
    within_budget: boolean;
    cross_sell_offers: Array<{
      type: string;
      addon: Product;
      cart_total_after: number;
      message: string;
    }>;
    upsell_offer?: {
      type: string;
      from_product: Product;
      to_product: Product;
      price_delta: number;
      message: string;
    };
    bundle_offer?: {
      type: string;
      total_discount: number;
      message: string;
    };
    products_searched: number;
  };
  buyer_evaluation: {
    primary_accepted: boolean;
    primary_reason: string;
    cross_sell_accepted: boolean;
    cross_sell_reason: string;
    upsell_accepted: boolean;
    upsell_reason: string;
    final_items: CartItem[];
    final_total: number;
    within_budget: boolean;
    buyer_message: string;
  };
  error?: string;
}

export interface DashboardMetrics {
  revenue: {
    total_gmv: number;
    upsell_revenue: number;
    cross_sell_revenue: number;
    ai_attributed_revenue: number;
    avg_order_value: number;
    total_discount_given: number;
  };
  commerce: {
    buyer_requests: number;
    product_searches: number;
    successful_orders: number;
    failed_orders: number;
    conversion_rate: number;
    cart_abandonment: number;
  };
  agent: {
    cross_sell_offers: number;
    upsell_offers: number;
    policy_violations: number;
    unauthorized_payments: number;
  };
  safety: {
    financial_actions: number;
    authorized_actions: number;
    blocked_actions: number;
    audit_coverage: number;
  };
  transactions: {
    successful_payments: number;
    failed_payments: number;
    total_orders: number;
  };
}

export interface AuditLog {
  id: number;
  session_id: string | null;
  order_id: string | null;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  status: string;
  created_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Only attach Content-Type on requests that carry a body.
  // Sending Content-Type on GET requests turns them into non-simple
  // CORS requests, triggering preflights that the backend rejects with 400.
  const hasBody = options?.body !== undefined;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  // If Vite's dev proxy can't reach the backend, it falls through to the
  // SPA handler and returns index.html with a 200 status. Detect this by
  // checking the Content-Type before attempting JSON.parse.
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("Backend is not reachable. Start the FastAPI server: python -m uvicorn app.main:app --reload --port 8000");
  }

  if (!res.ok) {
    let errText = "";
    try { errText = await res.text(); } catch { /* ignore */ }
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error(`Invalid JSON from ${path}. Is the backend running on port 8000?`);
  }
}


export const api = {
  // Agent
  chat: (message: string, session_id?: string) =>
    request<AgentChatResponse>("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id }),
    }),

  // Products
  getProducts: (params?: { category?: string; max_price?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.max_price) qs.set("max_price", String(params.max_price));
    if (params?.q) qs.set("q", params.q);
    return request<{ products: Product[]; count: number }>(`/api/products?${qs}`);
  },

  // Checkout
  authorize: (session_id: string, items: CartItem[], user_budget: number, user_authorized: boolean) =>
    request<{ authorized: boolean; order_id?: string; validation: Validation; cart: CartSummary }>(
      "/api/checkout/authorize",
      {
        method: "POST",
        body: JSON.stringify({ session_id, items, user_budget, user_authorized }),
      }
    ),

  // Payments
  createPaymentOrder: (order_id: string) =>
    request<{
      razorpay_order_id: string;
      amount: number;
      currency: string;
      key_id: string;
      order_id: string;
      mock: boolean;
    }>("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ order_id }),
    }),

  verifyPayment: (data: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => request<{ success: boolean; order_id: string; message: string }>("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  simulateFailure: (order_id: string) =>
    request<{ success: boolean; message: string; alternatives: string[] }>(
      "/api/payments/simulate-failure",
      { method: "POST", body: JSON.stringify({ order_id }) }
    ),

  getOrder: (order_id: string) =>
    request<{ order_id: string; status: string; total: number }>(`/api/payments/order/${order_id}`),

  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>("/api/dashboard/metrics"),
  getAuditLogs: (limit = 100) => request<{ logs: AuditLog[]; count: number }>(`/api/dashboard/audit?limit=${limit}`),
  getOrders: () => request<{ orders: unknown[] }>("/api/dashboard/orders"),

  // Health
  health: () => request<{ status: string; groq_configured: boolean; razorpay_configured: boolean }>("/api/health"),
};
