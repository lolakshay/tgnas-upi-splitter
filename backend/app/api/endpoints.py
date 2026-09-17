import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.database import get_db
from backend.app.models.session import PaymentSession, SplitPayment
from backend.app.schemas.session import (
    CreateSessionRequest,
    SessionResponse,
    SplitPaymentResponse,
    PaymentProgress,
    QRParseRequest,
    QRParseResponse,
    VerifyPaymentRequest,
)
from backend.app.services.split_service import (
    calculate_default_split,
    validate_custom_split,
    paise_to_rupees_str,
)
from backend.app.services.upi_service import (
    generate_upi_uri,
    parse_upi_qr,
    UPIParseError,
)
from backend.app.services.payment_provider import (
    PaymentStatus,
    mock_provider,
)
from backend.app.services.reconciliation_service import compute_session_progress

router = APIRouter(tags=["Payments"])

def _format_payment_response(p: SplitPayment) -> SplitPaymentResponse:
    return SplitPaymentResponse(
        payment_id=p.payment_id,
        session_id=p.session_id,
        sequence=p.sequence,
        amount_paise=p.amount_paise,
        amount_rupees=paise_to_rupees_str(p.amount_paise),
        upi_uri=p.upi_uri,
        transaction_ref=p.transaction_ref,
        status=p.status,
        opened_at=p.opened_at,
        marked_paid_at=p.marked_paid_at,
        verified_at=p.verified_at,
        created_at=p.created_at
    )

def _format_session_response(session: PaymentSession) -> SessionResponse:
    progress = compute_session_progress(session)
    payments_resp = [_format_payment_response(p) for p in (session.payments or [])]

    return SessionResponse(
        session_id=session.session_id,
        payee_vpa=session.payee_vpa,
        payee_name=session.payee_name,
        merchant_code=session.merchant_code,
        total_amount_paise=session.total_amount_paise,
        total_amount_rupees=paise_to_rupees_str(session.total_amount_paise),
        currency=session.currency,
        notes=session.notes,
        status=progress.invoice_status,
        current_payment_index=progress.current_payment_index,
        created_at=session.created_at,
        payments=payments_resp,
        progress=progress
    )


@router.get("/debug-db")
def debug_db(db: Session = Depends(get_db)):
    import os
    from sqlalchemy import text
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database_url": settings.database_url,
            "is_vercel": bool(os.getenv("VERCEL")),
            "db_connected": True
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "database_url": settings.database_url
        }


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_payment_session(req: CreateSessionRequest, db: Session = Depends(get_db)):
    """
    Creates a payment session and splits total_amount_paise into sequential UPI payments.
    Server calculates split chunks and guarantees sum(chunks) == total_amount_paise.
    """
    try:
        if req.custom_split_paise:
            try:
                chunks = validate_custom_split(req.total_amount_paise, req.custom_split_paise)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        else:
            try:
                chunks = calculate_default_split(req.total_amount_paise)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        # Generate unique readable session ID
        random_code = uuid.uuid4().hex[:6].upper()
        session_id = f"UPSP-{random_code}"

        session = PaymentSession(
            session_id=session_id,
            payee_vpa=req.payee_vpa,
            payee_name=req.payee_name,
            merchant_code=req.merchant_code,
            total_amount_paise=req.total_amount_paise,
            currency="INR",
            notes=req.notes,
            status="PENDING",
            current_payment_index=0
        )
        db.add(session)
        db.flush()

        total_chunks = len(chunks)
        for idx, chunk_paise in enumerate(chunks):
            seq = idx + 1
            payment_id = f"PAY-{random_code}-{seq}"
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            tx_ref = f"TXN{now_utc.strftime('%y%m%d%H%M%S')}{seq:02d}{random_code}"
            note = f"Split {seq} of {total_chunks} ({session_id})"

            upi_uri = generate_upi_uri(
                payee_vpa=req.payee_vpa,
                payee_name=req.payee_name,
                amount_paise=chunk_paise,
                transaction_ref=tx_ref,
                note=note,
                merchant_code=req.merchant_code,
                currency="INR"
            )

            payment = SplitPayment(
                payment_id=payment_id,
                session_id=session_id,
                sequence=seq,
                amount_paise=chunk_paise,
                upi_uri=upi_uri,
                transaction_ref=tx_ref,
                status=PaymentStatus.CREATED.value
            )
            db.add(payment)

        db.commit()
        db.refresh(session)
        return _format_session_response(session)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}\n{tb}")


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_payment_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieve session details, progress, and all payment chunks."""
    session = db.query(PaymentSession).filter(PaymentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return _format_session_response(session)


@router.post("/sessions/{session_id}/payments/{payment_id}/open", response_model=SessionResponse)
def mark_payment_opened(session_id: str, payment_id: str, db: Session = Depends(get_db)):
    """Called when user opens the UPI deep link or displays the QR code."""
    session = db.query(PaymentSession).filter(PaymentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    payment = db.query(SplitPayment).filter(
        SplitPayment.session_id == session_id,
        SplitPayment.payment_id == payment_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment chunk not found.")

    if payment.status == PaymentStatus.CREATED.value:
        payment.status = PaymentStatus.OPENED.value
        payment.opened_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(session)

    return _format_session_response(session)


@router.post("/sessions/{session_id}/payments/{payment_id}/user-confirm", response_model=SessionResponse)
def user_confirm_payment(session_id: str, payment_id: str, db: Session = Depends(get_db)):
    """
    Called when user clicks 'I completed the payment'.
    Transitions state to USER_MARKED_PAID.
    NOTE: Prototype distinguishes user mark from bank verification.
    """
    session = db.query(PaymentSession).filter(PaymentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    payment = db.query(SplitPayment).filter(
        SplitPayment.session_id == session_id,
        SplitPayment.payment_id == payment_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment chunk not found.")

    # Only transition if not already verified
    if payment.status != PaymentStatus.VERIFIED.value:
        payment.status = PaymentStatus.USER_MARKED_PAID.value
        payment.marked_paid_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(session)

    return _format_session_response(session)


@router.get("/sessions/{session_id}/progress", response_model=PaymentProgress)
def get_session_progress(session_id: str, db: Session = Depends(get_db)):
    """Get calculated reconciliation progress directly from backend database."""
    session = db.query(PaymentSession).filter(PaymentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return compute_session_progress(session)


@router.post("/mock/payments/{payment_id}/verify", response_model=SessionResponse)
def mock_verify_payment(payment_id: str, req: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """
    Demo Mode verification endpoint.
    Simulates bank settlement verification via MockPaymentProvider.
    """
    payment = db.query(SplitPayment).filter(SplitPayment.payment_id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment '{payment_id}' not found.")

    session = payment.session
    outcome = req.simulated_status.upper()

    # Call mock payment provider
    verification = mock_provider.verify_payment(payment.transaction_ref, simulated_outcome=outcome)

    if verification["verified"]:
        payment.status = PaymentStatus.VERIFIED.value
        payment.verified_at = datetime.datetime.now(datetime.timezone.utc)
    elif outcome == "FAILED":
        payment.status = PaymentStatus.FAILED.value
    else:
        payment.status = PaymentStatus.USER_MARKED_PAID.value

    # Update session status
    progress = compute_session_progress(session)
    session.status = progress.invoice_status
    db.commit()
    db.refresh(session)

    return _format_session_response(session)


@router.post("/sessions/parse-qr", response_model=QRParseResponse)
def parse_scanned_qr(req: QRParseRequest):
    """
    Validates and decodes a scanned QR string.
    Checks for UPI validity and extracts pa, pn, mc, tr, am, cu.
    """
    try:
        data = parse_upi_qr(req.qr_string)
        return QRParseResponse(
            is_valid_upi=True,
            payee_vpa=data["payee_vpa"],
            payee_name=data["payee_name"],
            amount_paise=data["amount_paise"],
            amount_rupees=data["amount_rupees"],
            currency=data["currency"],
            merchant_code=data["merchant_code"],
            transaction_ref=data["transaction_ref"],
            transaction_note=data["transaction_note"],
            raw_uri=data["raw_uri"],
            error_message=None
        )
    except UPIParseError as e:
        return QRParseResponse(
            is_valid_upi=False,
            error_message=str(e),
            raw_uri=req.qr_string
        )
    except Exception as e:
        return QRParseResponse(
            is_valid_upi=False,
            error_message="Unexpected error parsing QR content.",
            raw_uri=req.qr_string
        )
