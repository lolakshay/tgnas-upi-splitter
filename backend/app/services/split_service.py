from typing import List

DEFAULT_MAX_CHUNK_PAISE = 199900  # ₹1,999.00 in paise

def paise_to_rupees_str(paise: int, include_symbol: bool = True) -> str:
    """
    Format integer paise to standard Rupee format.
    If exact whole number of rupees, don't show trailing .00 for cleaner display (e.g. ₹1,999).
    If it has paise, show 2 decimal places (e.g. ₹1,999.50).
    """
    if paise < 0:
        sign = "-"
        paise = abs(paise)
    else:
        sign = ""

    rupees = paise // 100
    sub_paise = paise % 100

    # Format rupees with Indian comma grouping if > 1000
    s_rupees = str(rupees)
    if len(s_rupees) > 3:
        last3 = s_rupees[-3:]
        rest = s_rupees[:-3]
        groups = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        formatted_rupees = ",".join(groups) + "," + last3
    else:
        formatted_rupees = s_rupees

    if sub_paise == 0:
        val = f"{sign}{formatted_rupees}"
    else:
        val = f"{sign}{formatted_rupees}.{sub_paise:02d}"

    return f"₹{val}" if include_symbol else val


def calculate_default_split(total_paise: int, max_chunk_paise: int = DEFAULT_MAX_CHUNK_PAISE) -> List[int]:
    """
    Splits total_paise into chunks not exceeding max_chunk_paise using strict integer arithmetic.
    
    Example:
    1,000,000 paise (₹10,000) with max 199,900 paise (₹1,999):
    -> [199900, 199900, 199900, 199900, 199900, 500] (₹1,999 x 5 + ₹5)
    
    Invariants guaranteed:
    1. sum(chunks) == total_paise
    2. all(chunk > 0 for chunk in chunks)
    """
    if not isinstance(total_paise, int):
        raise ValueError("total_paise must be an integer (no floats).")

    if total_paise <= 0:
        raise ValueError("Total amount must be greater than 0 paise.")

    if not isinstance(max_chunk_paise, int) or max_chunk_paise <= 0:
        raise ValueError("max_chunk_paise must be a positive integer.")

    chunks: List[int] = []
    remaining = total_paise

    while remaining > max_chunk_paise:
        chunks.append(max_chunk_paise)
        remaining -= max_chunk_paise

    if remaining > 0:
        chunks.append(remaining)

    # Core mathematical invariants
    assert sum(chunks) == total_paise, f"Split sum {sum(chunks)} does not equal total {total_paise}"
    assert all(c > 0 for c in chunks), "All split chunks must be strictly greater than 0"

    return chunks


def validate_custom_split(total_paise: int, custom_chunks: List[int]) -> List[int]:
    """
    Validates a user-provided custom split list of amounts in paise.
    Enforces:
    1. List is not empty
    2. Every chunk is an integer > 0
    3. Sum of all chunks exactly equals total_paise
    """
    if not isinstance(total_paise, int) or total_paise <= 0:
        raise ValueError("Total amount must be a positive integer in paise.")

    if not custom_chunks or not isinstance(custom_chunks, list):
        raise ValueError("Custom split must be a non-empty list of amounts.")

    for i, chunk in enumerate(custom_chunks):
        if not isinstance(chunk, int):
            raise ValueError(f"Chunk at index {i} must be an integer paise value, got {type(chunk).__name__}.")
        if chunk <= 0:
            raise ValueError(f"Chunk at index {i} must be greater than 0 (got {chunk} paise).")

    split_sum = sum(custom_chunks)
    if split_sum != total_paise:
        diff = total_paise - split_sum
        diff_str = paise_to_rupees_str(abs(diff))
        if diff > 0:
            raise ValueError(f"Custom split sum ({paise_to_rupees_str(split_sum)}) is {diff_str} less than total ({paise_to_rupees_str(total_paise)}).")
        else:
            raise ValueError(f"Custom split sum ({paise_to_rupees_str(split_sum)}) is {diff_str} greater than total ({paise_to_rupees_str(total_paise)}).")

    return custom_chunks
