import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_session_flow_rs_10000():
    # 1. Create session for ₹10,000
    create_payload = {
        "payee_vpa": "testmerchant@upi",
        "payee_name": "Test Store",
        "total_amount_paise": 1000000,
        "notes": "Test Order #101"
    }
    response = client.post("/api/sessions", json=create_payload)
    assert response.status_code == 201
    data = response.json()

    session_id = data["session_id"]
    assert session_id.startswith("UPSP-")
    assert data["payee_vpa"] == "testmerchant@upi"
    assert data["total_amount_paise"] == 1000000
    assert data["total_amount_rupees"] == "₹10,000"
    assert len(data["payments"]) == 6

    # Invariant: sum of payments == total_amount_paise
    payment_sum = sum(p["amount_paise"] for p in data["payments"])
    assert payment_sum == 1000000

    # Check the split chunk values
    assert data["payments"][0]["amount_paise"] == 199900
    assert data["payments"][0]["amount_rupees"] == "₹1,999"
    assert data["payments"][4]["amount_paise"] == 199900
    assert data["payments"][5]["amount_paise"] == 500
    assert data["payments"][5]["amount_rupees"] == "₹5"

    # Progress starts as PENDING with 0 collected
    progress = data["progress"]
    assert progress["invoice_status"] == "PENDING"
    assert progress["collected_verified_paise"] == 0
    assert progress["remaining_paise"] == 1000000
    assert progress["is_completed"] is False

    # 2. Mark first payment as opened
    p1 = data["payments"][0]
    res_open = client.post(f"/api/sessions/{session_id}/payments/{p1['payment_id']}/open")
    assert res_open.status_code == 200
    data_open = res_open.json()
    assert data_open["payments"][0]["status"] == "OPENED"

    # 3. User confirms first payment
    res_user_confirm = client.post(f"/api/sessions/{session_id}/payments/{p1['payment_id']}/user-confirm")
    assert res_user_confirm.status_code == 200
    data_uc = res_user_confirm.json()
    assert data_uc["payments"][0]["status"] == "USER_MARKED_PAID"
    # Prototype distinction: user marked paid, but NOT yet verified by bank
    assert data_uc["progress"]["collected_user_marked_paise"] == 199900
    assert data_uc["progress"]["collected_verified_paise"] == 0

    # 4. Mock verify first payment (Demo mode)
    res_verify = client.post(f"/api/mock/payments/{p1['payment_id']}/verify", json={"simulated_status": "SUCCESS"})
    assert res_verify.status_code == 200
    data_ver = res_verify.json()
    assert data_ver["payments"][0]["status"] == "VERIFIED"
    assert data_ver["progress"]["collected_verified_paise"] == 199900
    assert data_ver["progress"]["remaining_paise"] == 800100
    assert data_ver["progress"]["invoice_status"] == "PARTIALLY_PAID"

    # 5. Verify all remaining payments
    for p in data_ver["payments"][1:]:
        res_v = client.post(f"/api/mock/payments/{p['payment_id']}/verify", json={"simulated_status": "SUCCESS"})
        assert res_v.status_code == 200

    # 6. Check final progress
    res_final = client.get(f"/api/sessions/{session_id}/progress")
    assert res_final.status_code == 200
    final_prog = res_final.json()
    assert final_prog["invoice_status"] == "PAID"
    assert final_prog["collected_verified_paise"] == 1000000
    assert final_prog["remaining_paise"] == 0
    assert final_prog["is_completed"] is True
    assert final_prog["is_verified_complete"] is True


def test_qr_parse_endpoint():
    # Valid UPI QR
    valid_qr = "upi://pay?pa=merchant@upi&pn=Demo%20Store&am=2500&cu=INR"
    res = client.post("/api/sessions/parse-qr", json={"qr_string": valid_qr})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid_upi"] is True
    assert data["payee_vpa"] == "merchant@upi"
    assert data["payee_name"] == "Demo Store"
    assert data["amount_paise"] == 250000

    # Invalid non-UPI QR
    invalid_qr = "https://google.com"
    res_inv = client.post("/api/sessions/parse-qr", json={"qr_string": invalid_qr})
    assert res_inv.status_code == 200
    data_inv = res_inv.json()
    assert data_inv["is_valid_upi"] is False
    assert "This doesn't appear to be a valid UPI payment QR" in data_inv["error_message"]
