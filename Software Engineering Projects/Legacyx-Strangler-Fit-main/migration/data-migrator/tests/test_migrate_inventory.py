"""
Unit tests for migrate_inventory.py's transform logic. No database
needed.
Run: pytest tests/test_migrate_inventory.py -v
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from migrate_inventory import transform


def test_transform_maps_all_fields():
    row = {
        "sku": "SKU-001",
        "name": "Keyboard",
        "quantityonhand": 50,
        "quantityreserved": 2,
        "unitprice": 19.99,
    }
    result = transform(row)
    assert result == {
        "sku": "SKU-001",
        "name": "Keyboard",
        "quantity_on_hand": 50,
        "quantity_reserved": 2,
        "unit_price": 19.99,
    }


def test_transform_preserves_zero_reserved():
    row = {"sku": "SKU-002", "name": "Mouse", "quantityonhand": 80, "quantityreserved": 0, "unitprice": 9.50}
    result = transform(row)
    assert result["quantity_reserved"] == 0
