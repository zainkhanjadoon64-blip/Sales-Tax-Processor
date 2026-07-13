import uuid
import enum
import re
from datetime import datetime, date
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from app.db.session import Base

class WithholdingType(str, enum.Enum):
    TYPE_236H = "236H"
    TYPE_153 = "153"
    TYPE_165 = "165"

class WithholdingRecord(Base):
    __tablename__ = "withholding_records"

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(Text, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    section_type = Column(SQLEnum(WithholdingType), nullable=False, index=True)
    period = Column(String(50), nullable=False)
    challan_number = Column(String(100), nullable=True, index=True)
    amount = Column(Numeric(18, 2), nullable=False)
    payment_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    document_id = Column(Text, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    client = relationship("Client", backref="withholding_records")
    document = relationship("Document", backref="withholding_records")

    @property
    def payment_section_code(self):
        return self._extract_metadata_value("payment_section_code")

    def _extract_metadata_value(self, field_name: str):
        if not self.remarks:
            return None

        for line in self.remarks.splitlines():
            if field_name == "payment_section_code":
                match = re.search(r"payment\s+section\s+code\s*[:=]\s*(.+)", line, re.IGNORECASE)
            else:
                match = None

            if match:
                value = match.group(1).strip()
                if value:
                    return value

        return None

    def __repr__(self):
        return f"<WithholdingRecord(id={self.id}, client_id={self.client_id}, type='{self.section_type}', period='{self.period}')>"