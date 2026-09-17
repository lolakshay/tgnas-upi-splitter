import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class PaymentSession(Base):
    __tablename__ = "payment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(32), unique=True, index=True, nullable=False)
    payee_vpa = Column(String(128), nullable=False)
    payee_name = Column(String(128), nullable=False)
    merchant_code = Column(String(32), nullable=True)
    total_amount_paise = Column(Integer, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    notes = Column(String(256), nullable=True)
    status = Column(String(32), default="PENDING", nullable=False)
    current_payment_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    payments = relationship("SplitPayment", back_populates="session", cascade="all, delete-orphan", order_by="SplitPayment.sequence")


class SplitPayment(Base):
    __tablename__ = "split_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(32), unique=True, index=True, nullable=False)
    session_id = Column(String(32), ForeignKey("payment_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    amount_paise = Column(Integer, nullable=False)
    upi_uri = Column(Text, nullable=False)
    transaction_ref = Column(String(64), unique=True, nullable=False)
    status = Column(String(32), default="CREATED", nullable=False)
    opened_at = Column(DateTime, nullable=True)
    marked_paid_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    session = relationship("PaymentSession", back_populates="payments")
