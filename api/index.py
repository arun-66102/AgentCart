"""
Vercel Python Serverless Function entry point.
"""
import sys
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.abspath(os.path.join(_current_dir, ".."))
_backend_dir = os.path.join(_root_dir, "backend")

for p in [_backend_dir, _root_dir, "/var/task/backend", "/var/task"]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

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

