from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum
import datetime

class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    OPENED = "OPENED"
    USER_MARKED_PAID = "USER_MARKED_PAID"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class PaymentProvider(ABC):
    """
    Abstract Payment Provider interface.
    Real payment aggregators (e.g. Razorpay, Cashfree, Pine Labs, Setu) can implement this interface
    when production UPI gateway APIs or webhooks become available.
    """

    @abstractmethod
    def create_payment(self, amount_paise: int, payee_vpa: str, transaction_ref: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Initiate payment tracking with the provider."""
        pass

    @abstractmethod
    def get_payment_status(self, transaction_ref: str) -> PaymentStatus:
        """Poll or check payment status with provider."""
        pass

    @abstractmethod
    def verify_payment(self, transaction_ref: str, simulated_outcome: str = "SUCCESS") -> Dict[str, Any]:
        """Verify transaction against provider settlement records."""
        pass

    @abstractmethod
    def refund_payment(self, transaction_ref: str, amount_paise: Optional[int] = None) -> Dict[str, Any]:
        """Refund an initiated payment."""
        pass


class MockPaymentProvider(PaymentProvider):
    """
    Mock payment provider for prototype testing, local development, and Demo Mode.
    Allows simulating SUCCESS, FAILED, and PENDING verification outcomes.
    """

    def __init__(self):
        # In-memory mock ledger for simulated states
        self._ledger: Dict[str, Dict[str, Any]] = {}

    def create_payment(self, amount_paise: int, payee_vpa: str, transaction_ref: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record = {
            "transaction_ref": transaction_ref,
            "amount_paise": amount_paise,
            "payee_vpa": payee_vpa,
            "status": PaymentStatus.CREATED,
            "metadata": metadata or {},
            "created_at": now_iso
        }
        self._ledger[transaction_ref] = record
        return record

    def get_payment_status(self, transaction_ref: str) -> PaymentStatus:
        if transaction_ref in self._ledger:
            return self._ledger[transaction_ref]["status"]
        return PaymentStatus.CREATED

    def verify_payment(self, transaction_ref: str, simulated_outcome: str = "SUCCESS") -> Dict[str, Any]:
        outcome = simulated_outcome.upper()
        if outcome == "SUCCESS":
            status = PaymentStatus.VERIFIED
        elif outcome == "FAILED":
            status = PaymentStatus.FAILED
        else:
            status = PaymentStatus.USER_MARKED_PAID

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record = self._ledger.get(transaction_ref, {
            "transaction_ref": transaction_ref,
            "created_at": now_iso
        })
        record["status"] = status
        record["verified_at"] = now_iso if status == PaymentStatus.VERIFIED else None
        record["provider"] = "MockPaymentProvider (Demo Mode)"
        self._ledger[transaction_ref] = record

        return {
            "transaction_ref": transaction_ref,
            "status": status.value,
            "verified": status == PaymentStatus.VERIFIED,
            "provider_reference": f"MOCK-BNK-{transaction_ref[-8:]}",
            "timestamp": record["verified_at"] or now_iso
        }

    def refund_payment(self, transaction_ref: str, amount_paise: Optional[int] = None) -> Dict[str, Any]:
        return {
            "transaction_ref": transaction_ref,
            "refunded": True,
            "amount_paise": amount_paise
        }


# Global mock provider instance for demo mode
mock_provider = MockPaymentProvider()
