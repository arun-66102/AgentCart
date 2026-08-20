"""Products API — AI-readable catalog endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.tools.catalog_tools import search_products, get_product

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products(
    category: str | None = Query(None),
    max_price: float | None = Query(None),
    min_price: float | None = Query(None),
    q: str | None = Query(None, description="Search query"),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    """
    AI-readable product catalog search.
    Designed for AI buyers to discover products without HTML scraping.
    """
    products = search_products(db, category=category, max_price=max_price, min_price=min_price, query=q, limit=limit)
    return {"products": products, "count": len(products)}


@router.get("/{product_id}")
def get_single_product(product_id: str, db: Session = Depends(get_db)):
    """Retrieve a single product by ID."""
    product = get_product(db, product_id)
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    return product
