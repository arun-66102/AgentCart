"""
Vercel Python Serverless Function entry point.
"""
import sys
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

try:
    from app.main import app  # noqa: E402
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()
    _error_str = f"Error importing app.main: {e}\n{traceback.format_exc()}"
    print(f"[FATAL] {_error_str}")

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    def fallback_catch_all(path_name: str):
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": _error_str, "path": path_name},
        )

