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

All LLM inference uses **Groq API** (`openai/gpt-oss-20b`). Payments use **Razorpay in test mode**. The database is **Neon PostgreSQL** (hosted, serverless-compatible).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS (Vite) |
| Backend | Python 3.12 + FastAPI |
| AI / LLM | Groq API — `openai/gpt-oss-20b` |
| Database | Neon PostgreSQL (via SQLAlchemy + psycopg2) |
| Payments | Razorpay Test Mode |
| Deployment | Vercel (frontend static + Python serverless functions) |

---

## Project Structure

```
AgentCart/
│
├── api/
│   ├── index.py                 # Vercel Python serverless function entry point
│   └── requirements.txt         # Python deps for Vercel runtime
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
│   │   │   ├── db.py                # SQLAlchemy engine + session (Neon PostgreSQL)
│   │   │   └── seed.py              # Idempotent product catalog seeder
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
│   │   └── main.py                  # FastAPI app entry point (auto-seeds on startup)
│   │
│   └── requirements.txt
│
├── data/
│   ├── products.json                # 35 TechStore electronics products
│   └── seed_data.py                 # Legacy shim → delegates to backend/app/database/seed.py
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
├── vercel.json                      # Vercel deployment configuration
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Neon.tech](https://neon.tech) account (free tier is sufficient)

---

### Step 1 — Get Your Neon PostgreSQL Connection String

1. Sign up at [console.neon.tech](https://console.neon.tech)
2. Create a new project → click **Connection Details**
3. Copy the **Connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### Step 2 — Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# LLM (required for full AI reasoning)
GROQ_API_KEY=your_groq_api_key_here

# Razorpay — TEST MODE only
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# App
SECRET_KEY=agentcart_dev_secret_key
DEBUG=true
FRONTEND_URL=http://localhost:5173
```

> **Note:** The app runs in demo mode without API keys.
> Groq uses heuristic intent extraction. Razorpay uses a mock payment flow.

Get your keys:
- Groq: https://console.groq.com → API Keys
- Razorpay: https://dashboard.razorpay.com → Settings → API Keys (Test mode)

---

### Step 3 — Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Start the API server — tables are **created and seeded automatically** on first startup:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

API is now live at: **http://localhost:8000**
Interactive docs: **http://localhost:8000/api/docs**

> The database is seeded with **35 TechStore products** on first run. No manual seed command needed.

---

### Step 4 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend is now live at: **http://localhost:5173**

---

## Deploy to Vercel

### Step 1 — Push to GitHub

Ensure your repo is pushed to GitHub. The `.env` file is gitignored — **never commit it**.

### Step 2 — Import Project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect `vercel.json` — **no framework override needed**

### Step 3 — Set Environment Variables

In Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `GROQ_API_KEY` | Your Groq API key |
| `RAZORPAY_KEY_ID` | Your Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay test secret |
| `SECRET_KEY` | A random secret string |
| `FRONTEND_URL` | `https://your-project.vercel.app` |
| `DEBUG` | `false` |

### Step 4 — Deploy

Click **Deploy**. Vercel will:
1. Build the Vite frontend → serve as static files
2. Deploy the FastAPI backend as a Python serverless function (`api/index.py`)
3. Route `/api/*` → Python function, everything else → React SPA

**On first request**, the API auto-creates all PostgreSQL tables and seeds 35 products into Neon.

### Vercel Architecture

```
Browser Request
    │
    ├── /api/*  ──────→  Python Serverless Function (api/index.py)
    │                         └── FastAPI app (backend/)
    │                               └── Neon PostgreSQL
    │
    └── /*      ──────→  Static Files (frontend/dist/)
                              └── React SPA (React Router)
```

---

## Running Services

| Service | URL | Description |
|---|---|---|
| React Frontend | http://localhost:5173 | AI Buyer chat + Dashboard |
| FastAPI Backend | http://localhost:8000 | REST API |
| Swagger UI | http://localhost:8000/api/docs | Interactive API explorer |
| ReDoc | http://localhost:8000/api/redoc | API documentation |

---

## Product Catalog — 35 Products

| Category | Products |
|---|---|
| Headphones | SoundWave Pro, SoundWave Elite |
| Earbuds | BudPro, BudPro Sport |
| Keyboard | TypeMaster Pro, TypeMaster Ultimate |
| Mouse | GlidePro Wireless, GlidePro X Gaming |
| Laptop | UltraBook Air 14, UltraBook Pro 15 |
| Monitor | ViewMax 24 FHD, ViewMax 27 QHD, ViewMax 32 4K OLED |
| Tablet | MediaPad 10, MediaPad Pro 11 |
| Smartwatch | FitBand Pro, SmartWatch X GPS |
| Power Bank | PowerCore 10000, PowerCore GaN 20000 |
| Storage | SpeedDrive 500GB SSD, SpeedDrive 1TB SSD |
| Speakers | BassBoom, BassBoom Pro |
| Webcam | ClearVision 4K |
| Networking | SwiftRouter AX1800, MeshNode AX1800 |
| Accessories | Cables, Cases, Hubs, Adapters, Chargers, Mouse Pads… |

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
GET  /api/health                          # { status, groq_configured, razorpay_configured, database }
```

---

## Demo Flow (3 minutes)

### 1 — AI Buyer Chat

Go to the frontend and type:

> "I need wireless headphones under ₹5,000 with good battery life"

Watch:
- **Buyer Agent** extracts: category = headphones, budget = ₹5,000, requirements = wireless, battery
- **Merchant Agent** searches 35-product catalog, selects best match
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

Go to `/dashboard` to see:
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
| Allowed categories | headphones, earbuds, keyboard, mouse, laptop, monitor, tablet, smartwatch, powerbank, storage, speakers, webcam, networking, accessories |

Rules are enforced **deterministically** — the LLM proposes, the Policy Engine decides.

---

## Financial Safety

```
AI Recommendation
      ↓
Policy Validation      ← deterministic, no LLM
      ↓
Inventory Check        ← real-time stock (Neon PostgreSQL)
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
 |  ├── Catalog Search  (Neon PostgreSQL — 35 products)
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

> **AgentCart transforms traditional merchants into AI-native merchants by enabling AI buyers to discover, evaluate, optimize and safely purchase products through an AI merchant agent — with Groq-powered intelligence, Neon PostgreSQL, Razorpay test-mode transactions, strict financial guardrails and a complete audit trail — deployed serverlessly on Vercel.**
