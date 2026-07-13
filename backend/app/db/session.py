from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_postgres = settings.DATABASE_URL.startswith("postgresql")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # Keep connections alive and recycle stale ones (important for Neon serverless)
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
)

# All primary/foreign key ID columns are stored as VARCHAR(36). However, many API
# endpoints parse path/query/form params as `uuid.UUID`, and when a uuid.UUID
# object is compared against a String column, SQLAlchemy infers a UUID bind type
# and emits a `::UUID` cast in the SQL (e.g. `WHERE documents.id = %(id_1)s::UUID`).
# PostgreSQL then rejects the comparison against a varchar column with
# "operator does not exist: character varying = uuid".
#
# This affects 50+ endpoints, so rather than coercing each call site we fix it
# centrally: on every statement we (1) strip the erroneous ::UUID / ::uuid casts
# and (2) stringify any uuid.UUID bind values so they bind as plain text and
# match the VARCHAR id columns. This is safe here because no column is a real
# native uuid type.
if _is_postgres:
    import re as _re
    import uuid as _uuid_mod
    from sqlalchemy import event as _sa_event

    _UUID_CAST_RE = _re.compile(r"::UUID", _re.IGNORECASE)

    def _stringify_uuids(value):
        if isinstance(value, _uuid_mod.UUID):
            return str(value)
        if isinstance(value, dict):
            return {k: _stringify_uuids(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return type(value)(_stringify_uuids(v) for v in value)
        return value

    @_sa_event.listens_for(engine, "before_cursor_execute", retval=True)
    def _normalize_uuid_binds(conn, cursor, statement, parameters, context, executemany):
        if "::UUID" in statement or "::uuid" in statement:
            statement = _UUID_CAST_RE.sub("", statement)
        if parameters:
            parameters = _stringify_uuids(parameters)
        return statement, parameters


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
