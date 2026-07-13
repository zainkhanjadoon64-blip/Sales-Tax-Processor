from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os

# Resolve the project root (four levels up from this file: app/core/config.py -> backend/app/core -> backend/app -> backend -> project root)
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# On serverless platforms (Vercel) the working directory is read-only; only /tmp is writable.
# Files are persisted to Vercel Blob, but temp/scratch paths must live under /tmp.
_IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
_DEFAULT_STORAGE = "/tmp/storage" if _IS_SERVERLESS else "storage"
_DEFAULT_BACKUP = "/tmp/backups" if _IS_SERVERLESS else "backups"


class Settings(BaseSettings):
    APP_NAME: str = "Tax Compliance Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Default to SQLite for local dev; set DATABASE_URL env var for PostgreSQL (Neon/Vercel):
    # DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
    DATABASE_URL: str = "sqlite:///./tax_compliance.db"

    JWT_SECRET: str = Field(
        ...,
        description="JWT signing secret. Must be set via JWT_SECRET environment variable."
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    STORAGE_PATH: str = _DEFAULT_STORAGE
    BACKUP_PATH: str = _DEFAULT_BACKUP

    model_config = {
        # Load from .env.development.local first (v0/Vercel sandbox), then .env, then system env
        "env_file": (
            os.path.join(_project_root, ".env.development.local"),
            os.path.join(_project_root, ".env"),
        ),
        "env_file_encoding": "utf-8",
        # Do NOT set case_sensitive so env vars are matched case-insensitively from system env
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()
