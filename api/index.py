"""
Vercel Python Serverless Function entry point.

Vercel's Python runtime requires a top-level `app` (ASGI) or `handler` (WSGI).
We add backend/ to sys.path first so `from app.main import app` resolves correctly.
"""
import sys
import os

# Add backend/ to sys.path so all `from app.xxx import ...` calls inside the
# backend package resolve correctly when running as a Vercel serverless function.
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")),
)

# Top-level import — Vercel's runtime AST scanner must see `app` here.
from app.main import app  # noqa: E402, F401
