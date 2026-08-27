"""
Vercel Python Serverless Function entry point.

Vercel's Python runtime looks for an `app` variable in this file.
We import the FastAPI app from the backend package.
"""
import sys
import os
import traceback

# Add backend/ to sys.path so `from app.xxx import ...` resolves inside the function.
_backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

try:
    from app.main import app  # noqa: F401  — Vercel uses this as the ASGI handler
except Exception as _boot_error:
    # Surface import/startup errors as a real HTTP 500 (not an opaque FUNCTION_INVOCATION_FAILED)
    # so they appear in Vercel logs with the full traceback.
    import traceback as _tb
    _trace = _tb.format_exc()
    print(f"[BOOT ERROR] Failed to import app:\n{_trace}", flush=True)

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    def boot_error_handler(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Server failed to start",
                "detail": str(_boot_error),
                "traceback": _trace,
            },
        )
