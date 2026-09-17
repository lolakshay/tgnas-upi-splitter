import re
import urllib.parse
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, Any

class UPIParseError(Exception):
    pass

def generate_upi_uri(
    payee_vpa: str,
    payee_name: str,
    amount_paise: int,
    transaction_ref: str,
    note: Optional[str] = None,
    merchant_code: Optional[str] = None,
    currency: str = "INR"
) -> str:
    """
    Generates an RFC-3986 compliant UPI URI.
    Example: upi://pay?pa=merchant@upi&pn=Merchant%20Name&am=1999&cu=INR&tr=TX123&tn=Split%201%20of%206
    """
    # Sanitize and validate VPA
    vpa = payee_vpa.strip()
    if "@" not in vpa:
        raise ValueError("Invalid VPA format for UPI URI generation.")

    # Convert paise to rupee string without floating-point inaccuracy
    rupees = amount_paise // 100
    sub_paise = amount_paise % 100
    if sub_paise == 0:
        am_str = str(rupees)
    else:
        am_str = f"{rupees}.{sub_paise:02d}"

    query_params: Dict[str, str] = {
        "pa": vpa,
        "pn": payee_name.strip(),
        "am": am_str,
        "cu": currency,
        "tr": transaction_ref.strip()
    }

    if merchant_code:
        query_params["mc"] = merchant_code.strip()

    if note:
        query_params["tn"] = note.strip()

    # urllib.parse.urlencode with quote_via=urllib.parse.quote produces standard %20 for spaces
    query_string = urllib.parse.urlencode(query_params, quote_via=urllib.parse.quote)
    return f"upi://pay?{query_string}"


def parse_upi_qr(raw_qr_content: str) -> Dict[str, Any]:
    """
    Parses and validates a raw QR string.
    Only accepts valid UPI URIs (upi://pay?...)
    Returns a dictionary of extracted fields:
      - payee_vpa
      - payee_name
      - amount_paise (if present)
      - amount_rupees (if present)
      - currency
      - merchant_code
      - transaction_ref
      - transaction_note
    """
    if not raw_qr_content or not isinstance(raw_qr_content, str):
        raise UPIParseError("QR content is empty or invalid.")

    trimmed = raw_qr_content.strip()

    # Must start with upi:// (case-insensitive)
    if not re.match(r"^upi://", trimmed, re.IGNORECASE):
        raise UPIParseError("This doesn't appear to be a valid UPI payment QR.")

    parsed = urllib.parse.urlparse(trimmed)
    if parsed.scheme.lower() != "upi" or parsed.netloc.lower() not in ["pay", ""]:
        # In some UPI strings, it's upi://pay?... or upi:pay?...
        # Check path or netloc
        path_or_netloc = (parsed.netloc or parsed.path).lower()
        if "pay" not in path_or_netloc:
            raise UPIParseError("This doesn't appear to be a valid UPI payment QR.")

    # Parse query parameters
    query = parsed.query
    if not query and "?" in trimmed:
        query = trimmed.split("?", 1)[1]

    params = urllib.parse.parse_qs(query, keep_blank_values=False)

    # Helper to get first parameter value case-insensitively
    def get_param(name: str) -> Optional[str]:
        for k, v in params.items():
            if k.lower() == name.lower() and v:
                return v[0].strip()
        return None

    pa = get_param("pa")
    if not pa or "@" not in pa:
        raise UPIParseError("Invalid UPI QR: missing or malformed payee UPI ID ('pa').")

    # Clean and validate pa
    # Standard UPI ID: username@bank
    pa = pa.strip()
    if not re.match(r"^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,64}$", pa):
        raise UPIParseError(f"Payee UPI ID '{pa}' has an invalid character pattern.")

    pn = get_param("pn")
    if not pn:
        # If payee name is missing, use the VPA username as fallback
        pn = pa.split("@")[0].replace(".", " ").replace("_", " ").title()

    # Amount extraction if present
    am_raw = get_param("am")
    amount_paise: Optional[int] = None
    amount_rupees: Optional[str] = None

    if am_raw:
        try:
            # Parse using Decimal to avoid floating-point rounding issues
            dec_val = Decimal(am_raw)
            if dec_val > 0:
                # Multiply by 100 and cast to int
                amount_paise = int(dec_val * 100)
                amount_rupees = f"{dec_val:,.2f}".rstrip("0").rstrip(".") if "." in f"{dec_val}" else f"{dec_val:,}"
        except (InvalidOperation, ValueError):
            amount_paise = None
            amount_rupees = None

    cu = get_param("cu") or "INR"
    mc = get_param("mc")
    tr = get_param("tr")
    tn = get_param("tn")

    return {
        "payee_vpa": pa,
        "payee_name": pn,
        "amount_paise": amount_paise,
        "amount_rupees": amount_rupees,
        "currency": cu,
        "merchant_code": mc,
        "transaction_ref": tr,
        "transaction_note": tn,
        "raw_uri": trimmed
    }
