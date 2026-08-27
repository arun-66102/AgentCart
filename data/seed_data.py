"""
Legacy seed script — now delegates to the backend seed module.

Run from the project root:
    cd backend
    python -c "from app.database.seed import seed; seed()"

Or simply start the API server — seeding runs automatically on startup.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database.seed import seed  # noqa

if __name__ == "__main__":
    seed()
