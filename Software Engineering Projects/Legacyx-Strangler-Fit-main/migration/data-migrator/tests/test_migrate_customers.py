"""
Unit tests for migrate_customers.py's transform logic. No database
needed — these test the pure field-mapping function directly.
Run: pytest tests/test_migrate_customers.py -v
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from migrate_customers import transform


def test_transform_maps_active_status():
    row = {"customerno": "C001", "customername": "Ali Rayyan", "custstatus": "A", "email": None, "phone": None}
    result = transform(row)
    assert result["status"] == "ACTIVE"


def test_transform_maps_inactive_status():
    row = {"customerno": "C002", "customername": "Bilal Ahmed", "custstatus": "I", "email": None, "phone": None}
    result = transform(row)
    assert result["status"] == "INACTIVE"


def test_transform_unknown_status_defaults_to_active():
    # Matches STATUS_MAP.get(..., "ACTIVE") behavior — an unrecognized
    # legacy status code shouldn't crash the migration, it should fail
    # safe toward the more restrictive... actually the *less* restrictive
    # default. Worth knowing this is a real design choice, not an oversight.
    row = {"customerno": "C003", "customername": "Sara Khan", "custstatus": "X", "email": None, "phone": None}
    result = transform(row)
    assert result["status"] == "ACTIVE"


def test_transform_preserves_customer_no_unchanged():
    row = {"customerno": "C004", "customername": "Zain Malik", "custstatus": "A", "email": None, "phone": None}
    result = transform(row)
    assert result["customer_no"] == "C004"


def test_transform_maps_name_field():
    row = {"customerno": "C005", "customername": "Fatima Noor", "custstatus": "A", "email": None, "phone": None}
    result = transform(row)
    assert result["full_name"] == "Fatima Noor"


def test_transform_handles_missing_email_and_phone():
    row = {"customerno": "C006", "customername": "No Contact", "custstatus": "A"}
    result = transform(row)
    assert result["email"] is None
    assert result["phone"] is None


def test_transform_preserves_present_email_and_phone():
    row = {
        "customerno": "C007",
        "customername": "Has Contact",
        "custstatus": "A",
        "email": "ali@example.com",
        "phone": "0300-0000000",
    }
    result = transform(row)
    assert result["email"] == "ali@example.com"
    assert result["phone"] == "0300-0000000"
