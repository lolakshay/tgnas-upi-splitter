import pytest
from backend.app.services.upi_service import (
    generate_upi_uri,
    parse_upi_qr,
    UPIParseError
)

def test_generate_upi_uri_standard():
    uri = generate_upi_uri(
        payee_vpa="testmerchant@upi",
        payee_name="Test Store",
        amount_paise=199900,
        transaction_ref="TXN123456",
        note="Payment 1 of 6"
    )

    assert uri.startswith("upi://pay?")
    assert "pa=testmerchant%40upi" in uri
    assert "pn=Test%20Store" in uri
    assert "am=1999" in uri
    assert "cu=INR" in uri
    assert "tr=TXN123456" in uri
    assert "tn=Payment%201%20of%206" in uri


def test_generate_upi_uri_with_sub_paise():
    uri = generate_upi_uri(
        payee_vpa="user@bank",
        payee_name="User",
        amount_paise=199950,
        transaction_ref="TXN555"
    )
    assert "am=1999.50" in uri


def test_parse_valid_upi_qr_without_amount():
    qr_str = "upi://pay?pa=store@okaxis&pn=Super%20Mart&mc=5411&cu=INR"
    parsed = parse_upi_qr(qr_str)

    assert parsed["payee_vpa"] == "store@okaxis"
    assert parsed["payee_name"] == "Super Mart"
    assert parsed["merchant_code"] == "5411"
    assert parsed["currency"] == "INR"
    assert parsed["amount_paise"] is None


def test_parse_valid_upi_qr_with_amount():
    qr_str = "upi://pay?pa=billing@icici&pn=City%20Hospital&am=5000&cu=INR&tr=REC9988"
    parsed = parse_upi_qr(qr_str)

    assert parsed["payee_vpa"] == "billing@icici"
    assert parsed["payee_name"] == "City Hospital"
    assert parsed["amount_paise"] == 500000
    assert parsed["transaction_ref"] == "REC9988"


def test_parse_invalid_non_upi_qr():
    # Non-UPI link
    with pytest.raises(UPIParseError, match="This doesn't appear to be a valid UPI payment QR."):
        parse_upi_qr("https://example.com/pay")

    with pytest.raises(UPIParseError, match="This doesn't appear to be a valid UPI payment QR."):
        parse_upi_qr("Random text from some other barcode")


def test_parse_missing_payee_vpa():
    with pytest.raises(UPIParseError, match="missing or malformed payee UPI ID"):
        parse_upi_qr("upi://pay?pn=NoVPA&am=100")
