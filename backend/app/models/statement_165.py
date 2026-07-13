import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Float, Text, Boolean
from app.db.session import Base


class Statement165Entry(Base):
    """Section 165 withholding tax entries."""
    __tablename__ = "statement_165_entries"

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(50), nullable=False, index=True)
    session_id = Column(String(100), nullable=False, index=True)

    name = Column(String(300), nullable=True)
    cnic_ntn = Column(String(100), nullable=True)
    date = Column(String(20), nullable=True)
    code = Column(String(50), nullable=True)
    taxable = Column(Float, default=0)
    tax = Column(Float, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Statement165Session(Base):
    """Section 165 statement generation sessions."""
    __tablename__ = "statement_165_sessions"

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(50), nullable=False, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    file_name = Column(String(300), nullable=True)
    entry_count = Column(Integer, default=0)
    taxable_total = Column(Float, default=0)
    tax_total = Column(Float, default=0)
    status = Column(String(20), default="draft")  # draft, processing, completed, exported
    statement_period_start = Column(String(20), nullable=True)
    statement_period_end = Column(String(20), nullable=True)
    last_saved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
