#!/usr/bin/env python3
"""
Migrates Product records from the legacy monolith's database (legacy_db)
into Inventory Service's database (inventory_db).

Simpler than migrate_orders.py — Products aren't referenced by anything
that needs FK resolution here, so this is a direct field mapping, same
shape as migrate_customers.py.

Usage:
    python migrate_inventory.py [--dry-run]

Connection settings via environment variables (LEGACY_DB_*, MODERN_DB_*),
same shape as the other two scripts — MODERN_DB defaults to
inventory_db/5435.
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
    "port": env("MODERN_DB_PORT", "5435"),
    "dbname": env("MODERN_DB_NAME", "inventory_db"),
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
        print("MIGRATION REPORT — inventory")
        print("=" * 50)
        print(f"Products discovered:         {self.discovered}")
        print(f"Products migrated:           {self.migrated}")
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


def transform(row: dict) -> dict:
    return {
        "sku": row["sku"],
        "name": row["name"],
        "quantity_on_hand": row["quantityonhand"],
        "quantity_reserved": row["quantityreserved"],
        "unit_price": row["unitprice"],
    }


def extract_legacy_products(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT "Id", "Sku", "Name", "QuantityOnHand", "QuantityReserved", "UnitPrice" FROM "Products"')
        rows = cur.fetchall()
        return [{k.lower(): v for k, v in r.items()} for r in rows]


def already_migrated(conn, sku: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM products WHERE sku = %s", (sku,))
        return cur.fetchone() is not None


def load_product(conn, product: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO products (sku, name, quantity_on_hand, quantity_reserved, unit_price)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                product["sku"], product["name"], product["quantity_on_hand"],
                product["quantity_reserved"], product["unit_price"],
            ),
        )


def validate(legacy_conn, modern_conn, migrated_skus: list) -> tuple:
    details = []
    passed = True

    with legacy_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Products"')
        legacy_count = cur.fetchone()[0]
    with modern_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM products")
        modern_count = cur.fetchone()[0]

    details.append(f"Legacy product count: {legacy_count}")
    details.append(f"Modern product count: {modern_count}")
    if modern_count < len(migrated_skus):
        passed = False
        details.append("MISMATCH: modern has fewer rows than products this run believes it migrated")

    mismatches = 0
    with legacy_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as lcur, \
         modern_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as mcur:
        for sku in migrated_skus:
            lcur.execute('SELECT "Name", "QuantityOnHand" FROM "Products" WHERE "Sku" = %s', (sku,))
            legacy_row = lcur.fetchone()
            mcur.execute("SELECT name, quantity_on_hand FROM products WHERE sku = %s", (sku,))
            modern_row = mcur.fetchone()

            if not legacy_row or not modern_row:
                mismatches += 1
                continue
            if legacy_row["Name"] != modern_row["name"]:
                mismatches += 1
            if legacy_row["QuantityOnHand"] != modern_row["quantity_on_hand"]:
                mismatches += 1

    details.append(f"Field-level mismatches (name/qty) across {len(migrated_skus)} spot-checked records: {mismatches}")
    if mismatches > 0:
        passed = False

    return passed, details


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate products from legacy_db to inventory_db.")
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
        legacy_products = extract_legacy_products(legacy_conn)
        report.discovered = len(legacy_products)
        migrated_skus = []

        for row in legacy_products:
            sku = row.get("sku")
            try:
                if not sku or not row.get("name"):
                    raise ValueError(f"missing Sku or Name (legacy Id={row.get('id')})")

                if already_migrated(modern_conn, sku):
                    report.skipped_already_migrated += 1
                    migrated_skus.append(sku)
                    continue

                transformed = transform(row)
                if not args.dry_run:
                    load_product(modern_conn, transformed)
                report.migrated += 1
                migrated_skus.append(sku)

            except psycopg2.Error as exc:
                report.failed += 1
                report.failures.append(f"Sku={sku or '?'}: DB error ({exc.pgcode})")
            except Exception as exc:
                report.failed += 1
                report.failures.append(f"Sku={sku or '?'}: {type(exc).__name__}: {exc}")

        if args.dry_run:
            modern_conn.rollback()
            print("[dry run] no changes committed.")
        else:
            modern_conn.commit()

        if not args.dry_run:
            passed, details = validate(legacy_conn, modern_conn, migrated_skus)
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
