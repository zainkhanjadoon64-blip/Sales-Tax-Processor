from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import auth, clients, sales_tax, withholding, documents, tasks, reports, search, settings, notifications, dashboard, backup, folders, compliance, sync, statement_165, admin_approval
from app.core.config import settings as app_settings
from app.db.session import engine, Base
from app.db.migrate import run_migrations
from app.models import user, client, sales_tax as sales_tax_model, withholding as withholding_model, document, task, report, backup as backup_model, setting, notification as notification_model, statement_165 as statement_165_model


def cleanup_inactive_users():
    import time
    from app.db.session import SessionLocal
    from app.models.statement_165 import Statement165Entry, Statement165Session
    from app.models.user import User
    from datetime import datetime, timedelta

    while True:
        time.sleep(300)
        try:
            db = SessionLocal()
            try:
                cutoff = datetime.utcnow() - timedelta(hours=1)
                inactive = db.query(User).filter(
                    User.last_activity_at.isnot(None),
                    User.last_activity_at < cutoff,
                ).all()
                for u in inactive:
                    db.query(Statement165Entry).filter(Statement165Entry.user_id == u.id).delete()
                    db.query(Statement165Session).filter(Statement165Session.user_id == u.id).delete()
                    print(f"[cleanup] Removed 165 data for inactive user {u.username} ({u.id})")
                db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"[cleanup] Error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    # Seed default admin user if users table is empty
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    import secrets
    import os
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            random_password = secrets.token_urlsafe(16)
            admin = User(
                id="00000000-0000-0000-0000-000000000001",
                full_name="Zain Khan",
                username="zainkhan",
                password_hash=get_password_hash(random_password),
                email="zain@example.com",
                is_active=True,
                role="admin",
                is_approved=True,
            )
            db.add(admin)

            # Seed the Admin portal user with fixed credentials
            admin2 = User(
                id="00000000-0000-0000-0000-000000000002",
                full_name="Administrator",
                username="admin@admin",
                password_hash=get_password_hash("admin@admin"),
                email="admin@taxsuite.com",
                role="admin",
                is_approved=True,
                is_active=True,
            )
            db.add(admin2)
            db.commit()
            # Print the generated password once at startup — the operator must
            # capture this from the server logs. Credentials are never written
            # to disk to avoid accidental exposure through file system access.
            print("=" * 60)
            print("DEFAULT ADMIN CREATED — CHANGE THIS PASSWORD IMMEDIATELY")
            print(f"  Username : zainkhan")
            print(f"  Password : {random_password}")
            print("=" * 60)
    finally:
        db.close()
    # The long-running cleanup loop is only useful on a persistent server.
    # On serverless (Vercel) each invocation is short-lived, so skip it there.
    if not (os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")):
        import threading
        t = threading.Thread(target=cleanup_inactive_users, daemon=True)
        t.start()
    yield


app = FastAPI(
    title="Tax Compliance Management System",
    description="API for Tax Compliance Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["clients"])
app.include_router(sales_tax.router, prefix="/api/v1/sales-tax", tags=["sales-tax"])
app.include_router(withholding.router, prefix="/api/v1/withholding", tags=["withholding"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(folders.router, prefix="/api/v1/folders", tags=["folders"])
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["compliance"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
app.include_router(backup.router, prefix="/api/v1/backups", tags=["backups"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
app.include_router(statement_165.router, prefix="/api/v1/withholding", tags=["statement-165"])
app.include_router(admin_approval.router, prefix="/api/v1", tags=["admin-approval"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Tax Compliance Management System"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
