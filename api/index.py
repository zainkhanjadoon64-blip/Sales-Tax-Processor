"""
Vercel Python serverless entrypoint for the FastAPI backend.

Vercel's @vercel/python builder detects the ASGI `app` object below and serves
it. All `/api/*` requests are rewritten to this function (see vercel.json), so
the FastAPI routers (mounted under /api/v1/...) receive the original path.
"""
import os
import sys

# Make the `app` package (backend/app) importable
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.main import app  # noqa: E402

# Vercel looks for a module-level `app` (ASGI) callable.
__all__ = ["app"]
