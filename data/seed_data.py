"""
Seed script — populate the AgentCart database from data/products.json.
Run from the backend/ directory:
    python ../data/seed_data.py
"""
import sys
import os
import json

# Make sure backend/app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database.db import SessionLocal, create_tables
from app.models.product import Product, Inventory

DATA_FILE = os.path.join(os.path.dirname(__file__), "products.json")


def seed():
    create_tables()
    db = SessionLocal()

    try:
        with open(DATA_FILE) as f:
            products = json.load(f)

        existing = {p.product_id for p in db.query(Product).all()}
        added = 0

        for p in products:
            if p["product_id"] in existing:
                print(f"  skip (exists): {p['product_id']}")
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
            print(f"  added: {p['product_id']} — {p['name']}")

        db.commit()
        print(f"\n[OK] Seeded {added} products into AgentCart database.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
