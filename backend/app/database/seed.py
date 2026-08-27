"""
Database seeder — populates AgentCart with products from data/products.json.

This is called automatically on FastAPI startup (idempotent — skips existing rows).
Can also be run manually:
    cd backend
    python -c "from app.database.seed import seed; seed()"
"""
import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.database.db import SessionLocal, create_tables
from app.models.product import Product, Inventory

# Possible locations for products.json across local dev and Vercel serverless functions
_CANDIDATE_PATHS = [
    Path(__file__).resolve().parent.parent.parent.parent / "data" / "products.json",
    Path.cwd() / "data" / "products.json",
    Path(__file__).resolve().parent.parent.parent / "data" / "products.json",
    Path("/var/task/data/products.json"),
]


def _find_data_file() -> Path | None:
    for p in _CANDIDATE_PATHS:
        if p.exists():
            return p
    return None


def seed(db: Session | None = None) -> int:
    """
    Seed products and inventory from products.json.
    Returns the number of new products added.
    Creates its own DB session if none is provided.
    """
    _own_session = db is None
    if _own_session:
        db = SessionLocal()

    try:
        data_file = _find_data_file()
        if not data_file:
            print("[WARN] products.json not found in candidate paths. Skipping seed.")
            return 0

        with open(data_file, encoding="utf-8") as f:
            products = json.load(f)

        existing = {p.product_id for p in db.query(Product).all()}
        added = 0

        for p in products:
            if p["product_id"] in existing:
                continue

            product = Product(
                product_id=p["product_id"],
                name=p["name"],
                description=p["description"],
                price=p["price"],
                currency=p.get("currency", "INR"),
                category=p["category"],
                features=p.get("features", []),
                rating=p.get("rating", 4.0),
                related_products=p.get("related_products", []),
                upsell_products=p.get("upsell_products", []),
                cross_sell_products=p.get("cross_sell_products", []),
                bundle_products=p.get("bundle_products", []),
                bundle_discount=p.get("bundle_discount", 0.0),
                available=p.get("available", True),
            )
            db.add(product)

            inventory = Inventory(
                product_id=p["product_id"],
                quantity=p.get("inventory", 10),
                reserved=0,
            )
            db.add(inventory)
            added += 1

        db.commit()
        print(f"[OK] Seeded {added} new products into AgentCart database.")
        return added

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        return 0
    finally:
        if _own_session:
            db.close()
