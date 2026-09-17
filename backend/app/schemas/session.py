from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import datetime

class CreateSessionRequest(BaseModel):
    payee_vpa: str = Field(..., min_length=3, max_length=128, description="UPI Virtual Payment Address e.g. merchant@upi")
    payee_name: str = Field(..., min_length=1, max_length=128, description="Merchant or Payee Name")
    total_amount_paise: int = Field(..., gt=0, description="Total amount in integer paise (e.g. 1000000 for ₹10,000)")
    merchant_code: Optional[str] = Field(None, max_length=32)
    notes: Optional[str] = Field(None, max_length=256)
    custom_split_paise: Optional[List[int]] = Field(None, description="Optional custom split chunks in integer paise")

    @field_validator("payee_vpa")
    @classmethod
    def validate_vpa(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v or len(v.split("@")) != 2:
            raise ValueError("Invalid UPI ID / VPA format. Must contain exactly one '@'.")
        username, handle = v.split("@")
        if not username or not handle:
            raise ValueError("Invalid UPI ID format. Username and handle cannot be empty.")
        return v

    @field_validator("total_amount_paise")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Total amount must be greater than 0 paise.")
        # Sensible upper bound for single UPI session prototype (e.g. ₹5,00,000 = 50,000,000 paise)
        if v > 50000000:
            raise ValueError("Amount exceeds maximum prototype limit of ₹5,00,000.")
        return v


class SplitPaymentResponse(BaseModel):
    payment_id: str
    session_id: str
    sequence: int
    amount_paise: int
    amount_rupees: str
    upi_uri: str
    transaction_ref: str
    status: str
    opened_at: Optional[datetime.datetime] = None
    marked_paid_at: Optional[datetime.datetime] = None
    verified_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime


class PaymentProgress(BaseModel):
    session_id: str
    total_amount_paise: int
    total_amount_rupees: str
    collected_verified_paise: int
    collected_verified_rupees: str
    collected_user_marked_paise: int
    collected_user_marked_rupees: str
    remaining_paise: int
    remaining_rupees: str
    current_payment_index: int
    total_payments_count: int
    verified_payments_count: int
    marked_payments_count: int
    invoice_status: str
    is_completed: bool
    is_verified_complete: bool


class SessionResponse(BaseModel):
    session_id: str
    payee_vpa: str
    payee_name: str
    merchant_code: Optional[str] = None
    total_amount_paise: int
    total_amount_rupees: str
    currency: str
    notes: Optional[str] = None
    status: str
    current_payment_index: int
    created_at: datetime.datetime
    payments: List[SplitPaymentResponse]
    progress: PaymentProgress


class QRParseRequest(BaseModel):
    qr_string: str = Field(..., min_length=1, description="Raw text decoded from QR code")


class QRParseResponse(BaseModel):
    is_valid_upi: bool
    payee_vpa: Optional[str] = None
    payee_name: Optional[str] = None
    amount_paise: Optional[int] = None
    amount_rupees: Optional[str] = None
    currency: Optional[str] = "INR"
    merchant_code: Optional[str] = None
    transaction_ref: Optional[str] = None
    transaction_note: Optional[str] = None
    raw_uri: Optional[str] = None
    error_message: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    simulated_status: str = Field("SUCCESS", description="Target status: SUCCESS, FAILED, or PENDING")
