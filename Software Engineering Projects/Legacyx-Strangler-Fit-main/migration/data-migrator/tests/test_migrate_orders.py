"""
Unit tests for migrate_orders.py's transform logic — specifically the
CustomerId->customerNo and ProductId->sku resolution, which is the part
of this script most worth testing in isolation (see
services/order-service/README.md for why business keys matter here).
No database needed.
Run: pytest tests/test_migrate_orders.py -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from migrate_orders import transform


CUSTOMER_MAP = {1: "C001", 2: "C002"}
SKU_MAP = {10: "SKU-001", 11: "SKU-002"}


def _order(customer_id=1, items=None):
    return {
        "id": 100,
        "orderno": "O1001",
        "customerid": customer_id,
        "orderdate": "2026-08-16T00:00:00",
        "status": "CONFIRMED",
        "totalamount": 49.48,
        "items": items or [{"productid": 10, "quantity": 2, "unitprice": 19.99}],
    }


def test_transform_resolves_customer_no_from_id():
    result = transform(_order(customer_id=1), CUSTOMER_MAP, SKU_MAP)
    assert result["customer_no"] == "C001"


def test_transform_resolves_different_customer():
    result = transform(_order(customer_id=2), CUSTOMER_MAP, SKU_MAP)
    assert result["customer_no"] == "C002"


def test_transform_raises_on_unknown_customer_id():
    with pytest.raises(ValueError, match="CustomerNo"):
        transform(_order(customer_id=999), CUSTOMER_MAP, SKU_MAP)


def test_transform_resolves_sku_for_each_item():
    order = _order(items=[
        {"productid": 10, "quantity": 2, "unitprice": 19.99},
        {"productid": 11, "quantity": 1, "unitprice": 9.50},
    ])
    result = transform(order, CUSTOMER_MAP, SKU_MAP)
    skus = [item["sku"] for item in result["items"]]
    assert skus == ["SKU-001", "SKU-002"]


def test_transform_raises_on_unknown_product_id():
    order = _order(items=[{"productid": 999, "quantity": 1, "unitprice": 5.00}])
    with pytest.raises(ValueError, match="Sku"):
        transform(order, CUSTOMER_MAP, SKU_MAP)


def test_transform_preserves_order_fields():
    result = transform(_order(), CUSTOMER_MAP, SKU_MAP)
    assert result["order_no"] == "O1001"
    assert result["status"] == "CONFIRMED"
    assert result["total_amount"] == 49.48
