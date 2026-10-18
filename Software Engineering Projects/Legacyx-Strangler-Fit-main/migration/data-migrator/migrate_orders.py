#!/usr/bin/env python3
"""
Migrates Order records (and their items) from the legacy monolith's
database (legacy_db) into Order Service's database (order_db).

Unlike the customer migration, this one resolves foreign keys: legacy
Orders reference Customers and Products by internal integer ID, but the
modern Order Service references them by business key (customerNo, sku)
— see services/order-service/README.md for why.

Usage:
    python migrate_orders.py [--dry-run]

Connection settings via environment variables (LEGACY_DB_*, MODERN_DB_*),
same shape as migrate_customers.py — MODERN_DB defaults to order_db/5434.
"""

import argparse
import os
import sys
import time
from dataclasses import dataclass, field

import psycopg2
import psycopg2.extras


def env(name: str, default: str) -> str:
    return os.environ.get(name, default)


# No guessable password fallback (previously defaulted to "changeme") —
# but also not validated here at import time, since tests import this
# module for its pure functions without any DB env vars set. main()
# checks the password before connecting instead.
LEGACY_DSN = {
    "host": env("LEGACY_DB_HOST", "localhost"),
    "port": env("LEGACY_DB_PORT", "5432"),
    "dbname": env("LEGACY_DB_NAME", "legacy_db"),
    "user": env("LEGACY_DB_USER", "legacyx"),
    "password": os.environ.get("LEGACY_DB_PASSWORD"),
}

MODERN_DSN = {
    "host": env("MODERN_DB_HOST", "localhost"),
    "port": env("MODERN_DB_PORT", "5434"),
    "dbname": env("MODERN_DB_NAME", "order_db"),
    "user": env("MODERN_DB_USER", "legacyx"),
    "password": os.environ.get("MODERN_DB_PASSWORD"),
}


@dataclass
class MigrationReport:
    discovered: int = 0
    migrated: int = 0
    skipped_already_migrated: int = 0
    failed: int = 0
    failures: list = field(default_factory=list)
    validation_passed: bool = False
    validation_details: list = field(default_factory=list)
    duration_seconds: float = 0.0

    def print_summary(self) -> None:
        print("\n" + "=" * 50)
        print("MIGRATION REPORT — orders")
        print("=" * 50)
        print(f"Orders discovered:           {self.discovered}")
        print(f"Orders migrated:             {self.migrated}")
        print(f"Skipped (already migrated):  {self.skipped_already_migrated}")
        print(f"Failed:                      {self.failed}")
        for f in self.failures:
            print(f"  - {f}")
        print(f"Migration duration:          {self.duration_seconds:.2f} seconds")
        print("-" * 50)
        print(f"Validation: {'PASS' if self.validation_passed else 'FAIL'}")
        for d in self.validation_details:
            print(f"  - {d}")
        print("=" * 50)


def build_lookup_maps(legacy_conn) -> tuple:
    """CustomerId -> CustomerNo and ProductId -> Sku, resolved once up
    front so each order/item transform is a plain dict lookup."""
    with legacy_conn.cursor() as cur:
        cur.execute('SELECT "Id", "CustomerNo" FROM "Customers"')
        customer_no_by_id = dict(cur.fetchall())

        cur.execute('SELECT "Id", "Sku" FROM "Products"')
        sku_by_id = dict(cur.fetchall())

    return customer_no_by_id, sku_by_id


def extract_legacy_orders(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT "Id", "OrderNo", "CustomerId", "OrderDate", "Status", "TotalAmount" FROM "Orders"')
        orders = [{k.lower(): v for k, v in r.items()} for r in cur.fetchall()]

        cur.execute('SELECT "Id", "OrderId", "ProductId", "Quantity", "UnitPrice" FROM "OrderItems"')
        items = [{k.lower(): v for k, v in r.items()} for r in cur.fetchall()]

    items_by_order: dict = {}
    for item in items:
        items_by_order.setdefault(item["orderid"], []).append(item)

    for order in orders:
        order["items"] = items_by_order.get(order["id"], [])

    return orders


def transform(order: dict, customer_no_by_id: dict, sku_by_id: dict) -> dict:
    customer_no = customer_no_by_id.get(order["customerid"])
    if customer_no is None:
        raise ValueError(f"no CustomerNo found for legacy CustomerId={order['customerid']}")

    items = []
    for item in order["items"]:
        sku = sku_by_id.get(item["productid"])
        if sku is None:
            raise ValueError(f"no Sku found for legacy ProductId={item['productid']} on order {order['orderno']}")
        items.append({"sku": sku, "quantity": item["quantity"], "unit_price": item["unitprice"]})

    return {
        "order_no": order["orderno"],
        "customer_no": customer_no,
        "order_date": order["orderdate"],
        "status": order["status"],
        "total_amount": order["totalamount"],
        "items": items,
    }


def already_migrated(conn, order_no: str) -> bool:
    with conn.cursor() as cur:
        cur.execute('SELECT 1 FROM "Orders" WHERE "OrderNo" = %s', (order_no,))
        return cur.fetchone() is not None


def load_order(conn, order: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "Orders" ("OrderNo", "CustomerNo", "OrderDate", "Status", "TotalAmount")
            VALUES (%s, %s, %s, %s, %s)
            RETURNING "Id"
            """,
            (order["order_no"], order["customer_no"], order["order_date"], order["status"], order["total_amount"]),
        )
        new_id = cur.fetchone()[0]

        for item in order["items"]:
            cur.execute(
                """
                INSERT INTO "OrderItems" ("OrderId", "Sku", "Quantity", "UnitPrice")
                VALUES (%s, %s, %s, %s)
                """,
                (new_id, item["sku"], item["quantity"], item["unit_price"]),
            )


def validate(legacy_conn, modern_conn, migrated_order_nos: list) -> tuple:
    details = []
    passed = True

    with legacy_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Orders"')
        legacy_count = cur.fetchone()[0]

    with modern_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Orders"')
        modern_count = cur.fetchone()[0]

    details.append(f"Legacy order count: {legacy_count}")
    details.append(f"Modern order count: {modern_count}")
    if modern_count < len(migrated_order_nos):
        passed = False
        details.append("MISMATCH: modern has fewer rows than orders this run believes it migrated")

    mismatches = 0
    with legacy_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as lcur, \
         modern_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as mcur:
        for order_no in migrated_order_nos:
            lcur.execute('SELECT "TotalAmount", "Status" FROM "Orders" WHERE "OrderNo" = %s', (order_no,))
            legacy_row = lcur.fetchone()
            mcur.execute('SELECT "TotalAmount", "Status" FROM "Orders" WHERE "OrderNo" = %s', (order_no,))
            modern_row = mcur.fetchone()

            if not legacy_row or not modern_row:
                mismatches += 1
                continue
            if legacy_row["TotalAmount"] != modern_row["TotalAmount"]:
                mismatches += 1
            if legacy_row["Status"] != modern_row["Status"]:
                mismatches += 1

    details.append(f"Field-level mismatches (total/status) across {len(migrated_order_nos)} spot-checked records: {mismatches}")
    if mismatches > 0:
        passed = False

    return passed, details


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate orders from legacy_db to order_db.")
    parser.add_argument("--dry-run", action="store_true", help="Report what would migrate without writing anything.")
    args = parser.parse_args()

    report = MigrationReport()
    start = time.monotonic()

    if not LEGACY_DSN.get("password") or not MODERN_DSN.get("password"):
        print("ERROR: LEGACY_DB_PASSWORD and MODERN_DB_PASSWORD must be set — no default password.")
        return 1

    try:
        legacy_conn = psycopg2.connect(**LEGACY_DSN)
        modern_conn = psycopg2.connect(**MODERN_DSN)
    except psycopg2.OperationalError:
        print("ERROR: could not connect to one or more databases (check credentials/network).")
        return 1

    try:
        customer_no_by_id, sku_by_id = build_lookup_maps(legacy_conn)
        legacy_orders = extract_legacy_orders(legacy_conn)
        report.discovered = len(legacy_orders)
        migrated_order_nos = []

        for order in legacy_orders:
            order_no = order.get("orderno")
            try:
                if already_migrated(modern_conn, order_no):
                    report.skipped_already_migrated += 1
                    migrated_order_nos.append(order_no)
                    continue

                transformed = transform(order, customer_no_by_id, sku_by_id)
                if not args.dry_run:
                    load_order(modern_conn, transformed)
                report.migrated += 1
                migrated_order_nos.append(order_no)

            except psycopg2.Error as exc:
                report.failed += 1
                report.failures.append(f"OrderNo={order_no or '?'}: DB error ({exc.pgcode})")
            except Exception as exc:
                report.failed += 1
                report.failures.append(f"OrderNo={order_no or '?'}: {type(exc).__name__}: {exc}")

        if args.dry_run:
            modern_conn.rollback()
            print("[dry run] no changes committed.")
        else:
            modern_conn.commit()

        if not args.dry_run:
            passed, details = validate(legacy_conn, modern_conn, migrated_order_nos)
            report.validation_passed = passed
            report.validation_details = details
        else:
            report.validation_details = ["skipped — dry run"]

    finally:
        legacy_conn.close()
        modern_conn.close()

    report.duration_seconds = time.monotonic() - start
    report.print_summary()

    return 0 if (report.failed == 0 and (args.dry_run or report.validation_passed)) else 1


if __name__ == "__main__":
    sys.exit(main())
