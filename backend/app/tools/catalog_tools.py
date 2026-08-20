"""
Catalog Tools — deterministic product search & retrieval.
The LLM calls these; no direct DB writes happen here.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.product import Product, Inventory


def search_products(
    db: Session,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    query: Optional[str] = None,
    limit: int = 10,
) -> list[dict]:
    """Full-text + filter search across the product catalog."""
    q = db.query(Product).filter(Product.available == True)

    if category:
        q = q.filter(Product.category.ilike(f"%{category}%"))
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if query:
        search = f"%{query}%"
        q = q.filter(
            Product.name.ilike(search) | Product.description.ilike(search)
        )

    products = q.order_by(Product.rating.desc()).limit(limit).all()
    return [_product_to_dict(db, p) for p in products]


def get_product(db: Session, product_id: str) -> Optional[dict]:
    """Retrieve a single product by ID."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return None
    return _product_to_dict(db, product)


def get_related_products(db: Session, product_id: str) -> list[dict]:
    """Return cross-sell / related products for a given product."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return []

    related_ids = list(set(
        (product.related_products or [])
        + (product.cross_sell_products or [])
    ))
    results = []
    for pid in related_ids:
        p = db.query(Product).filter(Product.product_id == pid, Product.available == True).first()
        if p:
            results.append(_product_to_dict(db, p))
    return results


def get_upsell_products(db: Session, product_id: str) -> list[dict]:
    """Return upsell alternatives for a given product."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return []

    results = []
    for pid in (product.upsell_products or []):
        p = db.query(Product).filter(Product.product_id == pid, Product.available == True).first()
        if p:
            results.append(_product_to_dict(db, p))
    return results


def calculate_cart(db: Session, items: list[dict]) -> dict:
    """
    Calculate cart totals.
    items: [{"product_id": str, "qty": int}]
    Returns: {subtotal, discount, total, line_items}
    """
    line_items = []
    subtotal = 0.0
    discount = 0.0

    for item in items:
        product = db.query(Product).filter(Product.product_id == item["product_id"]).first()
        if not product:
            continue
        qty = item.get("qty", 1)
        line_total = product.price * qty
        subtotal += line_total
        line_items.append({
            "product_id": product.product_id,
            "name": product.name,
            "price": product.price,
            "qty": qty,
            "line_total": line_total,
        })

    # Apply bundle discounts if multiple items from same bundle group
    for item in items:
        product = db.query(Product).filter(Product.product_id == item["product_id"]).first()
        if not product:
            continue
        if product.bundle_products:
            bundled_ids = set(i["product_id"] for i in items)
            for bp_id in product.bundle_products:
                if bp_id in bundled_ids and product.bundle_discount > 0:
                    # apply discount to the cheaper product
                    bp = db.query(Product).filter(Product.product_id == bp_id).first()
                    if bp:
                        disc = bp.price * product.bundle_discount / 100
                        discount += disc
                    break

    total = max(0, subtotal - discount)
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "total": round(total, 2),
        "line_items": line_items,
        "currency": "INR",
    }


def _product_to_dict(db: Session, product: Product) -> dict:
    inv = db.query(Inventory).filter(Inventory.product_id == product.product_id).first()
    available_qty = inv.available_qty if inv else 0
    return {
        "product_id": product.product_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "currency": product.currency,
        "category": product.category,
        "features": product.features or [],
        "rating": product.rating,
        "available": product.available and available_qty > 0,
        "inventory": available_qty,
        "related_products": product.related_products or [],
        "upsell_products": product.upsell_products or [],
        "cross_sell_products": product.cross_sell_products or [],
        "bundle_products": product.bundle_products or [],
        "bundle_discount": product.bundle_discount,
    }
