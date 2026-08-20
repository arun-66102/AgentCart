# AgentCart — AI-to-AI Agentic Commerce Platform

> **Track 01 — AI Growth & Agentic Commerce**
>
> Turn traditional merchants into AI-native merchants by allowing AI buyers to discover products, receive intelligent recommendations, optimize their cart, and complete a gated Razorpay transaction end-to-end.

---

## Overview

**AgentCart** is an AI-to-AI commerce platform where two intelligent agents collaborate:

| Agent | Role |
|---|---|
| **AI Buyer Agent** | Understands user intent, evaluates merchant offers, enforces budget constraints |
| **AI Merchant Agent** | Searches catalog, applies revenue optimizer (upsell / cross-sell / bundle), generates structured offers |

All LLM inference uses **Groq API** (openai/gpt-oss-20b). Payments use **Razorpay in test mode**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS (Vite) |
| Backend | Python 3.12 + FastAPI |
| AI / LLM | Groq API — `openai/gpt-oss-20b` |
| Database | SQLite (via SQLAlchemy) |
| Payments | Razorpay Test Mode |

---

## Project Structure

```
AgentCart/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── buyer_agent.py       # Groq LLM — intent extraction + offer evaluation
│   │   │   ├── merchant_agent.py    # Groq LLM — catalog search + recommendation
│   │   │   └── revenue_agent.py     # Upsell / cross-sell / bundle optimizer
│   │   │
│   │   ├── api/
│   │   │   ├── agents.py            # POST /api/agent/chat  (main AI pipeline)
│   │   │   ├── checkout.py          # POST /api/checkout/authorize
│   │   │   ├── dashboard.py         # GET  /api/dashboard/metrics
│   │   │   ├── payments.py          # POST /api/payments/create-order & /verify
│   │   │   └── products.py          # GET  /api/products
│   │   │
│   │   ├── config/
│   │   │   └── settings.py          # Pydantic settings — reads .env
│   │   │
│   │   ├── database/
│   │   │   └── db.py                # SQLAlchemy engine + session (SQLite)
│   │   │
│   │   ├── models/
│   │   │   ├── audit.py             # AuditLog ORM model
│   │   │   ├── order.py             # Order ORM model
│   │   │   └── product.py           # Product + Inventory ORM models
│   │   │
│   │   ├── policies/
│   │   │   └── policy_engine.py     # Deterministic guardrails
│   │   │
│   │   ├── tools/
│   │   │   ├── audit_tools.py       # write_audit_log, get_audit_trail
│   │   │   ├── catalog_tools.py     # search_products, get_product, calculate_cart
│   │   │   ├── inventory_tools.py   # check, reserve, deduct inventory
│   │   │   └── razorpay_tools.py    # create_order, verify_payment
│   │   │
│   │   └── main.py                  # FastAPI app entry point
│   │
│   ├── .env                         # API keys (edit this)
│   └── requirements.txt
│
├── data/
│   ├── products.json                # 20 TechStore electronics products
│   └── seed_data.py                 # DB seeder script
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AuditTimeline.tsx    # Scrollable audit event trail
│       │   ├── CartPanel.tsx        # Cart with line items + bundle discounts
│       │   ├── DashboardMetrics.tsx # KPI cards (GMV, conversion, safety)
│       │   ├── GuardrailsPanel.tsx  # Animated policy check indicators
│       │   └── ProductCard.tsx      # Product with type badge + features
│       │
│       ├── pages/
│       │   ├── BuyerPage.tsx        # AI Buyer chat interface
│       │   ├── CheckoutPage.tsx     # Cart → Guardrails → Razorpay → Result
│       │   └── DashboardPage.tsx    # Merchant analytics dashboard
│       │
│       ├── services/
│       │   └── api.ts               # Typed API client (all backend calls)
│       │
│       ├── App.tsx                  # Router + navbar
│       └── index.css                # Dark theme + Tailwind utilities
│
├── .env.example                     # Environment variable template
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

---

### Step 1 — Configure API Keys

Open `backend/.env` and fill in your credentials:

```env
# LLM (required for full AI reasoning)
GROQ_API_KEY=your_groq_api_key_here

# Razorpay — TEST MODE only
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Database — SQLite, no setup needed
DATABASE_URL=sqlite:///./agentcart.db

# App
SECRET_KEY=agentcart_dev_secret_key
DEBUG=true
FRONTEND_URL=http://localhost:5173
```

> **Note:** The app runs fully in demo mode without API keys.
> Groq uses heuristic intent extraction. Razorpay uses a mock payment flow.

Get your keys:
- Groq: https://console.groq.com → API Keys
- Razorpay: https://dashboard.razorpay.com → Settings → API Keys (use Test mode)

---

### Step 2 — Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Seed the SQLite database with 20 TechStore products:

```bash
python ../data/seed_data.py
```

Start the API server:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

API is now live at: **http://localhost:8000**
Interactive docs: **http://localhost:8000/api/docs**

---

### Step 3 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend is now live at: **http://localhost:5173**

---

## Running Services

| Service | URL | Description |
|---|---|---|
| React Frontend | http://localhost:5173 | AI Buyer chat + Dashboard |
| FastAPI Backend | http://localhost:8000 | REST API |
| Swagger UI | http://localhost:8000/api/docs | Interactive API explorer |
| ReDoc | http://localhost:8000/api/redoc | API documentation |

---

## API Reference

### Agent Commerce

```
POST /api/agent/chat
```
Full AI-to-AI pipeline: intent extraction → catalog search → revenue optimizer → buyer evaluation.

```json
// Request
{ "message": "I need wireless headphones under ₹5,000 with good battery life" }

// Response
{
  "session_id": "...",
  "intent": { "category": "headphones", "max_price": 5000, "requirements": ["wireless", "good battery life"] },
  "merchant_response": { "primary_recommendation": {...}, "cross_sell_offers": [...] },
  "buyer_evaluation": { "primary_accepted": true, "final_total": 4698, "within_budget": true }
}
```

### Products

```
GET  /api/products                        # List / search catalog
GET  /api/products/{product_id}           # Single product
```

### Checkout

```
POST /api/checkout/authorize              # Run all guardrail checks, create order
POST /api/checkout/cancel                 # Cancel + release inventory
```

### Payments

```
POST /api/payments/create-order           # Create Razorpay test order
POST /api/payments/verify                 # Verify payment signature (mandatory)
POST /api/payments/simulate-failure       # Demo: graceful failure handling
GET  /api/payments/order/{order_id}       # Get order status
```

### Dashboard

```
GET  /api/dashboard/metrics               # Revenue, commerce, agent, safety KPIs
GET  /api/dashboard/audit                 # Full audit trail
GET  /api/dashboard/orders                # All orders list
```

### Health

```
GET  /api/health                          # { status, groq_configured, razorpay_configured }
```

---

## Demo Flow (3 minutes)

### 1 — AI Buyer Chat

Go to **http://localhost:5173** and type:

> "I need wireless headphones under ₹5,000 with good battery life"

Watch:
- **Buyer Agent** extracts: category = headphones, budget = ₹5,000, requirements = wireless, battery
- **Merchant Agent** searches 20-product catalog, selects best match
- **Revenue Optimizer** generates cross-sell offer (carrying case for ₹399)
- **Buyer Agent** evaluates: ₹4,698 total ≤ ₹5,000 budget → accepts

### 2 — Guardrails

Click **Authorize & Pay** to see all 5 policy checks:

```
✓ Budget Check        Cart ₹4,698 ≤ Budget ₹5,000
✓ Inventory Check     All items in stock
✓ User Authorization  User confirmed
✓ Merchant Policy     All rules satisfied
✓ Price Validation    Amount locked
```

### 3 — Payment

On the Checkout page:
- **Pay** → Razorpay test modal (use card `4111 1111 1111 1111`, any future date, any CVV)
- **Simulate Failure** → See graceful error: inventory released, no duplicate charge, audit preserved

### 4 — Dashboard

Go to **http://localhost:5173/dashboard** to see:
- Live GMV, upsell/cross-sell revenue, conversion rate
- Full audit trail of every agent decision
- Orders table with status

---

## Merchant Policy Engine

All agent actions are validated against configurable merchant rules:

| Rule | Default |
|---|---|
| Maximum discount | 10% |
| Max autonomous offer value | ₹1,000 |
| Minimum profit margin | 15% |
| Maximum upsell price delta | ₹3,000 |
| Allowed categories | headphones, keyboard, mouse, laptop, speakers, etc. |

Rules are enforced **deterministically** — the LLM proposes, the Policy Engine decides.

---

## Financial Safety

```
AI Recommendation
      ↓
Policy Validation      ← deterministic, no LLM
      ↓
Inventory Check        ← real-time stock
      ↓
User Authorization     ← explicit user consent
      ↓
Razorpay Order         ← amount sourced from DB, not client
      ↓
Payment
      ↓
Signature Verification ← mandatory, HMAC-SHA256
      ↓
Order Confirmed + Audit Log
```

The LLM **never directly executes** financial operations.

---

## Razorpay Test Cards

| Card Number | Expiry | CVV | Result |
|---|---|---|---|
| `4111 1111 1111 1111` | 12/25 | 123 | Success |
| `5267 3181 8797 5449` | 12/25 | 123 | Success |

Use any UPI ID ending in `@razorpay` for UPI test payments.

---

## Architecture

```
User
 |
 v
AI BUYER AGENT  (Groq LLM)
 |  extract intent
 |  evaluate offer
 v
AGENT COMMERCE API  (FastAPI)
 |
 v
AI MERCHANT AGENT  (Groq LLM)
 |  ├── Catalog Search  (SQLite)
 |  ├── Revenue Optimizer
 |  │     ├── Upsell
 |  │     ├── Cross-sell
 |  │     └── Bundle
 |  └── Policy Engine  (deterministic)
 |
 v
USER AUTHORIZATION
 |
 v
RAZORPAY TEST API
 |        |
 v        v
SUCCESS  FAILURE (graceful)
 |        |
 └───┬────┘
     v
AUDIT LOG
     |
     v
MERCHANT DASHBOARD
```

---

## One-Sentence Summary

> **AgentCart transforms traditional merchants into AI-native merchants by enabling AI buyers to discover, evaluate, optimize and safely purchase products through an AI merchant agent, with Groq-powered intelligence, Razorpay test-mode transactions, strict financial guardrails and a complete audit trail.**
