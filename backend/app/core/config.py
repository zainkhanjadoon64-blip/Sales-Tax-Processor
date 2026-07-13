from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "Tax Compliance Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Default to SQLite for local dev; use Neon PostgreSQL URL via .env:
    # DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
    DATABASE_URL: str = "sqlite:///./tax_compliance.db"

    JWT_SECRET: str = Field(
        ...,
        min_length=32,
        description="JWT signing secret. Must be set via JWT_SECRET environment variable and be at least 32 characters long."
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    STORAGE_PATH: str = "storage"
    BACKUP_PATH: str = "backups"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")
        case_sensitive = True


settings = Settings()
