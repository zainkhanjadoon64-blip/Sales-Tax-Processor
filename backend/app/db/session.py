from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_postgres = settings.DATABASE_URL.startswith("postgresql")

# All primary/foreign key ID columns are stored as VARCHAR(36), but many API
# endpoints parse path/form params as `uuid.UUID`. By default psycopg2 (via
# SQLAlchemy's dialect calling register_uuid() on every new connection) renders
# those values with a `::uuid` cast, which PostgreSQL rejects when compared
# against a varchar column ("operator does not exist: character varying = uuid").
#
# The dialect registers its uuid handler per-connection, so a module-level
# register_adapter gets overridden. We instead attach a `connect` event listener
# below (after the engine is created) that re-registers our adapter on each new
# DBAPI connection, making every uuid.UUID bind as a plain quoted string.

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # Keep connections alive and recycle stale ones (important for Neon serverless)
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
)

if _is_postgres:
    import uuid as _uuid
    from sqlalchemy import event
    from psycopg2.extensions import register_adapter, AsIs

    def _adapt_uuid(value):
        # Render uuid.UUID as a plain quoted string (no ::uuid cast) so it
        # matches the VARCHAR id columns.
        return AsIs("'%s'" % value)

    @event.listens_for(engine, "connect")
    def _register_uuid_adapter(dbapi_connection, connection_record):
        register_adapter(_uuid.UUID, _adapt_uuid)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
