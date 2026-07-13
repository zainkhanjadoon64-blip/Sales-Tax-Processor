import uuid
import enum
from datetime import datetime
import uuid as _uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum, BigInteger, Integer, Boolean, Float, Date, Index, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base


class _UUIDType:
    """Cross-dialect UUID type - stores as String(36) internally, works with SQLite and PostgreSQL"""
    pass


def _uuid_column(**kwargs):
    return Column(String(36), default=lambda: str(_uuid.uuid4()), **kwargs)


def _json_column(**kwargs):
    return Column(JSON, **kwargs)


class DocumentType(str, enum.Enum):
    PDF = "PDF"
    EXCEL = "Excel"
    IMAGE = "Image"
    WORD = "Word"
    OTHER = "Other"


class DocumentCategory(str, enum.Enum):
    SALES_TAX_RETURN = "Sales Tax Return"
    SECTION_236H = "236H"
    SECTION_153 = "153"
    SECTION_165 = "165"
    KPRA = "KPRA"
    INCOME_TAX_RETURN = "Income Tax Return"
    WORKING_FILE = "Working File"
    NOTICE = "Notice"
    OTHER = "Other"


class FilingStatus(str, enum.Enum):
    FILED = "Filed"
    PENDING = "Pending"
    NOT_FILED = "Not Filed"
    OVERDUE = "Overdue"
    MISSING = "Missing"
    UPLOADED = "Uploaded"


class DocumentActivityType(str, enum.Enum):
    VIEW = "view"
    DOWNLOAD = "download"
    PRINT = "print"
    PREVIEW = "preview"
    UPLOAD = "upload"
    DELETE = "delete"
    RENAME = "rename"
    MOVE = "move"
    COPY = "copy"
    RESTORE = "restore"
    SHARE = "share"


class Document(Base):
    __tablename__ = "documents"

    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))

    # Foreign Key
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    # File Information
    file_name = Column(Text, nullable=False)
    original_file_name = Column(Text, nullable=False)
    file_extension = Column(String(20), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(SQLEnum(DocumentType), nullable=False)

    # Classification
    doc_category = Column(SQLEnum(DocumentCategory), nullable=True)
    classification_method = Column(String(50), nullable=True)  # pattern, content, client_context, manual, fallback
    classification_confidence = Column(Float, default=0.0)

    # Tax Period
    tax_year = Column(Integer, nullable=True)
    tax_month = Column(Integer, nullable=True)  # 1-12

    # Compliance
    filing_status = Column(SQLEnum(FilingStatus), nullable=True)
    is_missing = Column(Boolean, default=False)

    # Dates
    document_date = Column(Date, nullable=True)  # Document issuance date
    expiry_date = Column(Date, nullable=True)  # For notices/returns with deadlines
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Audit
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)

    # Version Control
    version = Column(Integer, default=1)
    parent_document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)

    # Metadata
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    custom_metadata = Column(JSON, default={})

    # Batch Tracking
    batch_id = Column(String(36), nullable=True)
    checksum = Column(String(64), nullable=True)  # SHA-256

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("Client", backref="documents")
    uploader = relationship("User", backref="uploaded_documents", foreign_keys=[uploaded_by])
    parent_document = relationship("Document", remote_side=[id], backref="child_documents")

    def __repr__(self):
        return f"<Document(id={self.id}, file_name='{self.file_name}', category='{self.doc_category}')>"


class DocumentActivityLog(Base):
    __tablename__ = "document_activity_log"

    id = Column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    activity_type = Column(SQLEnum(DocumentActivityType), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    activity_metadata = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    document = relationship("Document", backref="activity_logs")
    user = relationship("User", backref="document_activities")

    def __repr__(self):
        return f"<DocumentActivityLog(document_id={self.document_id}, type='{self.activity_type}')>"


class SavedFilter(Base):
    __tablename__ = "saved_filters"

    id = Column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    filter_config = Column(JSON, nullable=False)
    is_shared = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="saved_filters")

    def __repr__(self):
        return f"<SavedFilter(name='{self.name}', user_id={self.user_id})>"