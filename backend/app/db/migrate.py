"""Apply lightweight schema migrations (add missing columns/tables)."""
import logging
from sqlalchemy import inspect, text
from app.db.session import engine

logger = logging.getLogger(__name__)

# Detect database dialect once
_IS_POSTGRES = str(engine.url).startswith("postgresql")
_IS_SQLITE = str(engine.url).startswith("sqlite")


def _bool_default_true() -> str:
    return "DEFAULT TRUE" if _IS_POSTGRES else "DEFAULT 1"

def _bool_default_false() -> str:
    return "DEFAULT FALSE" if _IS_POSTGRES else "DEFAULT 0"


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
    # booleans resolved at runtime below
]

CLIENT_BOOL_MIGRATIONS = [
    ("withholding_236_applied", False),
    ("withholding_236_prepared_by_us", False),
    ("withholding_153_applicable", False),
    ("withholding_153_prepared_by_us", False),
    ("is_active", True),
    ("kpra_registered", False),
]

CLIENT_EXTRA_MIGRATIONS = [
    ("withholding_filing_frequency", "VARCHAR(20)"),
]

DOCUMENT_COLUMN_MIGRATIONS = [
    ("doc_category", "VARCHAR(100)"),
    ("classification_method", "VARCHAR(50)"),
    ("classification_confidence", "REAL DEFAULT 0.0"),
    ("tax_year", "INTEGER"),
    ("tax_month", "INTEGER"),
    ("filing_status", "VARCHAR(50)"),
    ("document_date", "DATE"),
    ("expiry_date", "DATE"),
    ("deleted_at", "TIMESTAMP"),
    ("version", "INTEGER DEFAULT 1"),
    ("notes", "TEXT"),
    ("tags", "TEXT"),
    ("checksum", "VARCHAR(64)"),
    ("search_vector", "TEXT"),
]

DOCUMENT_BOOL_MIGRATIONS = [
    ("is_missing", False),
    ("is_deleted", False),
]

DOCUMENT_UUID_MIGRATIONS = [
    ("parent_document_id",),
    ("batch_id",),
]

DOCUMENT_TEXT_MIGRATIONS = [
    ("custom_metadata", "TEXT DEFAULT '{}'"),
]

DOCUMENT_TS_MIGRATIONS = [
    ("created_at",),
    ("updated_at",),
]

NOTIFICATION_COLUMN_MIGRATIONS = [
    ("client_id", "TEXT" if _IS_SQLITE else "UUID"),
    ("task_id", "TEXT" if _IS_SQLITE else "UUID"),
]

USER_COLUMN_MIGRATIONS = [
    ("role", "VARCHAR(20) DEFAULT 'user' NOT NULL"),
    ("last_activity_at", "TIMESTAMP"),
]

USER_BOOL_MIGRATIONS = [
    ("is_approved", False),
]

BANNED_COLUMN_MIGRATIONS = [
    ("banned_until", "TIMESTAMP"),
]


def _add_columns(conn, table_name: str, migrations: list, existing: set) -> list:
    """Add missing columns to a table. Returns list of added column names."""
    added = []
    for column_name, column_type in migrations:
        if column_name in existing:
            continue
        try:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
            added.append(column_name)
        except Exception as e:
            logger.warning("Could not add column %s.%s: %s", table_name, column_name, e)
    return added


def _add_bool_columns(conn, table_name: str, bool_migrations: list, existing: set) -> list:
    """Add missing boolean columns with DB-appropriate defaults."""
    added = []
    for column_name, default_true in bool_migrations:
        if column_name in existing:
            continue
        default = _bool_default_true() if default_true else _bool_default_false()
        col_type = "BOOLEAN" if _IS_POSTGRES else "INTEGER"
        try:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {col_type} {default} NOT NULL"))
            added.append(column_name)
        except Exception as e:
            logger.warning("Could not add bool column %s.%s: %s", table_name, column_name, e)
    return added


def run_migrations() -> None:
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # --- Client migrations ---
    if "clients" in tables:
        existing = {col["name"] for col in inspector.get_columns("clients")}
        with engine.begin() as conn:
            added = _add_columns(conn, "clients", CLIENT_COLUMN_MIGRATIONS, existing)
            added += _add_bool_columns(conn, "clients", CLIENT_BOOL_MIGRATIONS, existing)
            added += _add_columns(conn, "clients", CLIENT_EXTRA_MIGRATIONS, existing)
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
            added += _add_bool_columns(conn, "documents", DOCUMENT_BOOL_MIGRATIONS, existing)
            # UUID columns
            for (col_name,) in DOCUMENT_UUID_MIGRATIONS:
                if col_name not in existing:
                    col_type = "UUID" if _IS_POSTGRES else "TEXT"
                    try:
                        conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}"))
                        added.append(col_name)
                    except Exception as e:
                        logger.warning("Could not add UUID column documents.%s: %s", col_name, e)
            # Text migrations
            added += _add_columns(conn, "documents", DOCUMENT_TEXT_MIGRATIONS, existing)
            # Timestamp columns
            for (col_name,) in DOCUMENT_TS_MIGRATIONS:
                if col_name not in existing:
                    if _IS_POSTGRES:
                        col_def = f"TIMESTAMP DEFAULT NOW()"
                    else:
                        col_def = "TIMESTAMP"
                    try:
                        conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_def}"))
                        added.append(col_name)
                    except Exception as e:
                        logger.warning("Could not add TS column documents.%s: %s", col_name, e)
        if added:
            logger.info("Applied document migrations: %s", ", ".join(added))
        else:
            logger.info("Document schema is up to date")
    else:
        logger.info("documents table does not exist yet; will be created by create_all")

    # --- Document activity log table ---
    if "document_activity_log" not in tables:
        with engine.begin() as conn:
            if _IS_POSTGRES:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS document_activity_log (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        existing = {col["name"] for col in inspector.get_columns("document_activity_log")}
        if "metadata" not in existing:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE document_activity_log ADD COLUMN metadata TEXT DEFAULT '{}'"))
            logger.info("Added metadata column to document_activity_log")

    # --- Saved filters table ---
    if "saved_filters" not in tables:
        with engine.begin() as conn:
            if _IS_POSTGRES:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS saved_filters (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    # --- User migrations ---
    if "users" in tables:
        existing = {col["name"] for col in inspector.get_columns("users")}
        with engine.begin() as conn:
            added = _add_columns(conn, "users", USER_COLUMN_MIGRATIONS, existing)
            added += _add_bool_columns(conn, "users", USER_BOOL_MIGRATIONS, existing)
        if added:
            logger.info("Applied user migrations: %s", ", ".join(added))

        existing2 = {col["name"] for col in inspector.get_columns("users")}
        with engine.begin() as conn:
            added = _add_columns(conn, "users", BANNED_COLUMN_MIGRATIONS, existing2)
        if added:
            logger.info("Applied banned_until migration: %s", ", ".join(added))
    else:
        logger.info("users table does not exist yet; skipping")
