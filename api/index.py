"""
Vercel Python Serverless Function entry point.

Vercel's Python runtime looks for an `app` variable in this file.
We simply import the FastAPI app from the backend package.
"""
import sys
import os

# Add backend/ to sys.path so `from app.xxx import ...` works inside the function
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: F401  — Vercel uses this as the ASGI handler
