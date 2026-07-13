from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_postgres = settings.DATABASE_URL.startswith("postgresql")

# All primary/foreign key ID columns are stored as VARCHAR(36), but many API
# endpoints parse path/form params as `uuid.UUID`. By default psycopg2's
# UUID_adapter renders those values with a `::uuid` cast (e.g. '...'::uuid),
# which PostgreSQL rejects when compared against a varchar column
# ("operator does not exist: character varying = uuid").
#
# SQLAlchemy's psycopg2 dialect calls psycopg2.extras.register_uuid() on EVERY
# new pooled connection, and that always (re)registers the same UUID_adapter
# class. So a per-connection or module-level register_adapter loses the race.
# The robust, order-independent fix is to patch UUID_adapter.getquoted/__str__
# so the adapter emits a plain quoted string with no ::uuid cast. This makes
# every uuid.UUID bind transparently match the VARCHAR id columns.
if _is_postgres:
    try:
        from psycopg2 import extras as _pg_extras

        def _uuid_getquoted(self):
            return ("'%s'" % self._uuid).encode("utf8")

        def _uuid_str(self):
            return "'%s'" % self._uuid

        _pg_extras.UUID_adapter.getquoted = _uuid_getquoted
        _pg_extras.UUID_adapter.__str__ = _uuid_str
    except Exception:
        pass

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # Keep connections alive and recycle stale ones (important for Neon serverless)
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
