"""Apply lightweight schema migrations (add missing columns/tables)."""
import logging
from sqlalchemy import inspect, text
from app.db.session import engine

logger = logging.getLogger(__name__)

CLIENT_COLUMN_MIGRATIONS = [
    ("contact_person", "VARCHAR(255)"),
    ("contact_person_designation", "VARCHAR(255)"),
    ("contact_person_phone", "VARCHAR(50)"),
    ("contact_person_email", "VARCHAR(255)"),
    ("secondary_phone", "VARCHAR(50)"),
    ("city", "VARCHAR(100)"),
    ("province", "VARCHAR(100)"),
    ("business_type", "VARCHAR(255)"),
    ("client_type", "VARCHAR(50)"),
    ("registration_date", "DATE"),
    ("tax_period", "VARCHAR(20)"),
    ("fbr_office", "VARCHAR(255)"),
    ("sales_tax_material_status", "VARCHAR(10) DEFAULT 'NIL' NOT NULL"),
    ("withholding_236_applied", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("withholding_236_prepared_by_us", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("withholding_153_applicable", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("withholding_153_prepared_by_us", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("is_active", "BOOLEAN DEFAULT 1 NOT NULL"),
    ("kpra_registered", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("withholding_filing_frequency", "VARCHAR(20)"),
]

DOCUMENT_COLUMN_MIGRATIONS = [
    ("doc_category", "VARCHAR(100)"),
    ("classification_method", "VARCHAR(50)"),
    ("classification_confidence", "REAL DEFAULT 0.0"),
    ("tax_year", "INTEGER"),
    ("tax_month", "INTEGER"),
    ("filing_status", "VARCHAR(50)"),
    ("is_missing", "BOOLEAN DEFAULT 0"),
    ("document_date", "DATE"),
    ("expiry_date", "DATE"),
    ("deleted_at", "TIMESTAMP"),
    ("is_deleted", "BOOLEAN DEFAULT 0"),
    ("version", "INTEGER DEFAULT 1"),
    ("parent_document_id", "UUID"),
    ("notes", "TEXT"),
    ("tags", "TEXT"),
    ("custom_metadata", "TEXT DEFAULT '{}'"),
    ("batch_id", "UUID"),
    ("checksum", "VARCHAR(64)"),
    ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ("search_vector", "TEXT"),
]

NOTIFICATION_COLUMN_MIGRATIONS = [
    ("client_id", "UUID"),
    ("task_id", "UUID"),
]

USER_COLUMN_MIGRATIONS = [
    ("role", "VARCHAR(20) DEFAULT 'user' NOT NULL"),
    ("is_approved", "BOOLEAN DEFAULT 0 NOT NULL"),
    ("last_activity_at", "TIMESTAMP"),
]

BANNED_COLUMN_MIGRATIONS = [
    ("banned_until", "TIMESTAMP"),
]


def _normalize_column_type_for_sqlite(column_type: str) -> str:
    if str(engine.url).startswith("sqlite"):
        column_type = column_type.replace("UUID", "TEXT")
        column_type = column_type.replace("JSON", "TEXT")
        if "DEFAULT CURRENT_TIMESTAMP" in column_type or "DEFAULT NOW()" in column_type:
            column_type = column_type.replace("DEFAULT CURRENT_TIMESTAMP", "")
            column_type = column_type.replace("DEFAULT NOW()", "")
            column_type = column_type.replace("NOT NULL", "")
            column_type = " ".join(column_type.split())
    return column_type


def _add_columns(conn, table_name: str, migrations: list, existing: set) -> list[str]:
    """Add missing columns to a table. Returns list of added column names."""
    added: list[str] = []
    for column_name, column_type in migrations:
        if column_name in existing:
            continue
        try:
            normalized_type = _normalize_column_type_for_sqlite(column_type)
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {normalized_type}"))
            added.append(column_name)
        except Exception as e:
            logger.warning("Could not add column %s.%s: %s", table_name, column_name, e)
    return added


def run_migrations() -> None:
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # --- Client migrations ---
    if "clients" in tables:
        existing = {col["name"] for col in inspector.get_columns("clients")}
        with engine.begin() as conn:
            added = _add_columns(conn, "clients", CLIENT_COLUMN_MIGRATIONS, existing)
        if added:
            logger.info("Applied client migrations: %s", ", ".join(added))
        else:
            logger.info("Client schema is up to date")
    else:
        logger.info("clients table does not exist yet; skipping column migrations")

    # --- Document migrations ---
    if "documents" in tables:
        existing = {col["name"] for col in inspector.get_columns("documents")}
        with engine.begin() as conn:
            added = _add_columns(conn, "documents", DOCUMENT_COLUMN_MIGRATIONS, existing)
        if added:
            logger.info("Applied document migrations: %s", ", ".join(added))
        else:
            logger.info("Document schema is up to date")
    else:
        logger.info("documents table does not exist yet; will be created by create_all")

    # --- Document activity log table ---
    if "document_activity_log" not in tables:
        with engine.begin() as conn:
            is_postgres = str(engine.url).startswith("postgresql")
            if is_postgres:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS document_activity_log (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        document_id UUID NOT NULL,
                        user_id UUID,
                        activity_type VARCHAR(50) NOT NULL,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        metadata TEXT DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS document_activity_log (
                        id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL,
                        user_id TEXT,
                        activity_type TEXT NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        metadata TEXT DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
        logger.info("Created document_activity_log table")
    else:
        # Add metadata column if missing
        existing = {col["name"] for col in inspector.get_columns("document_activity_log")}
        if "metadata" not in existing:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE document_activity_log ADD COLUMN metadata TEXT DEFAULT '{}'"))
            logger.info("Added metadata column to document_activity_log")

    # --- Saved filters table ---
    if "saved_filters" not in tables:
        with engine.begin() as conn:
            is_postgres = str(engine.url).startswith("postgresql")
            if is_postgres:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS saved_filters (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        filter_config TEXT NOT NULL,
                        is_shared BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS saved_filters (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        filter_config TEXT NOT NULL,
                        is_shared INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
        logger.info("Created saved_filters table")

    # --- Notification migrations ---
    if "notifications" in tables:
        existing = {col["name"] for col in inspector.get_columns("notifications")}
        with engine.begin() as conn:
            added = _add_columns(conn, "notifications", NOTIFICATION_COLUMN_MIGRATIONS, existing)
        if added:
            logger.info("Applied notification migrations: %s", ", ".join(added))
    else:
        logger.info("notifications table does not exist yet; skipping")

    # --- Settings migrations ---
    if "settings" in tables:
        existing_cols = {col["name"] for col in inspector.get_columns("settings")}
        # No specific migrations needed, just ensure table exists
    else:
        logger.info("settings table does not exist yet; skipping")

    # --- User migrations ---
    if "users" in tables:
        existing = {col["name"] for col in inspector.get_columns("users")}
        with engine.begin() as conn:
            added = _add_columns(conn, "users", USER_COLUMN_MIGRATIONS, existing)
        if added:
            logger.info("Applied user migrations: %s", ", ".join(added))

        # Only run banned_until migration if is_approved migration already applied
        # to avoid duplicate column issues
        existing2 = {col["name"] for col in inspector.get_columns("users")}
        with engine.begin() as conn:
            added = _add_columns(conn, "users", BANNED_COLUMN_MIGRATIONS, existing2)
        if added:
            logger.info("Applied banned_until migration: %s", ", ".join(added))
    else:
        logger.info("users table does not exist yet; skipping")
