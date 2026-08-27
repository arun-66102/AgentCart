"""
AgentCart FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import get_settings
from app.database.db import create_tables
from app.api import products, agents, checkout, payments, dashboard

settings = get_settings()

app = FastAPI(
    title="AgentCart API",
    description="AI-to-AI Agentic Commerce Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow React frontend (production, preview deployments, local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(products.router)
app.include_router(agents.router)
app.include_router(checkout.router)
app.include_router(payments.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def on_startup():
    """Create DB tables and seed initial data on startup."""
    try:
        create_tables()
        print("[OK] AgentCart API started - DB tables ready.")
    except Exception as e:
        print(f"[WARN] Table creation deferred or failed: {e}")

    # Auto-seed product catalog (idempotent — safe to run every startup)
    try:
        from app.database.seed import seed
        added = seed()
        if added:
            print(f"[OK] Seeded {added} new products into the database.")
        else:
            print("[OK] Product catalog already seeded, nothing to add.")
    except Exception as e:
        print(f"[WARN] Seeding skipped: {e}")


@app.get("/api/health")
@app.get("/health")
@app.get("/")
def health():
    return {
        "status": "ok",
        "app": "AgentCart",
        "version": "1.0.0",
        "groq_configured": bool(settings.groq_api_key),
        "razorpay_configured": bool(settings.razorpay_key_id),
        "database": "neon-postgresql",
    }
