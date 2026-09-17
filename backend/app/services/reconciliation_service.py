from typing import List
from backend.app.models.session import PaymentSession, SplitPayment
from backend.app.schemas.session import PaymentProgress
from backend.app.services.split_service import paise_to_rupees_str
from backend.app.services.payment_provider import PaymentStatus

def compute_session_progress(session: PaymentSession) -> PaymentProgress:
    """
    Computes true financial reconciliation from database transaction records.
    Never trusts client-side numbers.
    """
    payments: List[SplitPayment] = session.payments or []
    total_payments = len(payments)

    verified_paise = 0
    user_marked_paise = 0
    verified_count = 0
    marked_count = 0
    current_idx = 0
    found_active = False

    for idx, p in enumerate(payments):
        if p.status == PaymentStatus.VERIFIED.value:
            verified_paise += p.amount_paise
            user_marked_paise += p.amount_paise
            verified_count += 1
            marked_count += 1
        elif p.status == PaymentStatus.USER_MARKED_PAID.value:
            user_marked_paise += p.amount_paise
            marked_count += 1
        
        # Determine the currently active payment step
        if not found_active and p.status in [PaymentStatus.CREATED.value, PaymentStatus.OPENED.value]:
            current_idx = idx
            found_active = True

    if not found_active:
        # All payments have been either marked or verified
        current_idx = max(0, total_payments - 1)

    remaining_paise = max(0, session.total_amount_paise - verified_paise)

    # Determine backend invoice status
    if verified_paise >= session.total_amount_paise:
        invoice_status = "PAID"
    elif verified_paise > 0:
        invoice_status = "PARTIALLY_PAID"
    elif user_marked_paise >= session.total_amount_paise:
        invoice_status = "PENDING_VERIFICATION"
    else:
        invoice_status = "PENDING"

    is_completed = (marked_count == total_payments)
    is_verified_complete = (verified_count == total_payments)

    return PaymentProgress(
        session_id=session.session_id,
        total_amount_paise=session.total_amount_paise,
        total_amount_rupees=paise_to_rupees_str(session.total_amount_paise),
        collected_verified_paise=verified_paise,
        collected_verified_rupees=paise_to_rupees_str(verified_paise),
        collected_user_marked_paise=user_marked_paise,
        collected_user_marked_rupees=paise_to_rupees_str(user_marked_paise),
        remaining_paise=remaining_paise,
        remaining_rupees=paise_to_rupees_str(remaining_paise),
        current_payment_index=current_idx,
        total_payments_count=total_payments,
        verified_payments_count=verified_count,
        marked_payments_count=marked_count,
        invoice_status=invoice_status,
        is_completed=is_completed,
        is_verified_complete=is_verified_complete
    )
