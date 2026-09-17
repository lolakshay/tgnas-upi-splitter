import pytest
from backend.app.services.split_service import (
    calculate_default_split,
    validate_custom_split,
    paise_to_rupees_str,
    DEFAULT_MAX_CHUNK_PAISE
)

def test_paise_to_rupees_formatting():
    assert paise_to_rupees_str(1000000) == "₹10,000"
    assert paise_to_rupees_str(199900) == "₹1,999"
    assert paise_to_rupees_str(500) == "₹5"
    assert paise_to_rupees_str(100) == "₹1"
    assert paise_to_rupees_str(550) == "₹5.50"
    assert paise_to_rupees_str(10000000) == "₹1,00,000"
    assert paise_to_rupees_str(199900, include_symbol=False) == "1,999"


def test_split_rs_10000_standard_case():
    # ₹10,000 = 1,000,000 paise
    total_paise = 1000000
    chunks = calculate_default_split(total_paise)

    # Expected: 5 chunks of ₹1,999 (199,900 paise) + 1 chunk of ₹5 (500 paise)
    assert len(chunks) == 6
    assert chunks[0] == 199900
    assert chunks[1] == 199900
    assert chunks[2] == 199900
    assert chunks[3] == 199900
    assert chunks[4] == 199900
    assert chunks[5] == 500

    # Invariant checks
    assert sum(chunks) == total_paise
    assert all(c > 0 for c in chunks)


@pytest.mark.parametrize("rupees,paise,expected_chunks_count", [
    (1, 100, 1),
    (100, 10000, 1),
    (1999, 199900, 1),
    (2000, 200000, 2),   # 1999 + 1
    (2001, 200100, 2),   # 1999 + 2
    (10000, 1000000, 6), # 1999 x 5 + 5
    (50000, 5000000, 26), # 1999 x 25 + 25
    (100000, 10000000, 51) # 1999 x 50 + 50
])
def test_edge_case_amounts(rupees, paise, expected_chunks_count):
    chunks = calculate_default_split(paise)
    assert len(chunks) == expected_chunks_count
    # Core mathematical invariants
    assert sum(chunks) == paise
    assert all(c > 0 for c in chunks)
    # Check max chunk rule
    for c in chunks[:-1]:
        assert c == DEFAULT_MAX_CHUNK_PAISE
    assert chunks[-1] <= DEFAULT_MAX_CHUNK_PAISE


def test_invalid_amounts():
    with pytest.raises(ValueError, match="must be greater than 0"):
        calculate_default_split(0)

    with pytest.raises(ValueError, match="must be greater than 0"):
        calculate_default_split(-100)

    with pytest.raises(ValueError, match="must be an integer"):
        # No floating point permitted
        calculate_default_split(1999.5) # type: ignore


def test_custom_split_validation():
    total_paise = 1000000  # ₹10,000

    # Valid custom split
    valid_custom = [500000, 300000, 200000]
    result = validate_custom_split(total_paise, valid_custom)
    assert result == valid_custom

    # Sum mismatch: less than total
    with pytest.raises(ValueError, match="less than total"):
        validate_custom_split(total_paise, [500000, 300000])

    # Sum mismatch: greater than total
    with pytest.raises(ValueError, match="greater than total"):
        validate_custom_split(total_paise, [500000, 300000, 300000])

    # Zero or negative chunk
    with pytest.raises(ValueError, match="must be greater than 0"):
        validate_custom_split(total_paise, [1000000, 0])

    with pytest.raises(ValueError, match="must be greater than 0"):
        validate_custom_split(total_paise, [1000500, -500])
