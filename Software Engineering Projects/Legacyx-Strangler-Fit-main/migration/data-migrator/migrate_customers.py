#!/usr/bin/env python3
"""
Migrates Customer records from the legacy monolith's database (legacy_db)
into the extracted Customer Service's database (customer_db).

One-time, one-table migration — not a general ETL framework. Field mapping
matches docs/architecture/overview.md's anti-corruption layer example.

Usage:
    python migrate_customers.py            # migrate + validate
    python migrate_customers.py --dry-run  # report only, writes nothing

Connection settings come from environment variables, with localhost
defaults for running this outside Docker:
    LEGACY_DB_HOST, LEGACY_DB_PORT, LEGACY_DB_NAME, LEGACY_DB_USER, LEGACY_DB_PASSWORD
    MODERN_DB_HOST, MODERN_DB_PORT, MODERN_DB_NAME, MODERN_DB_USER, MODERN_DB_PASSWORD
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
# module for its pure functions (transform(), etc.) without any DB env
# vars set. main() checks LEGACY_DSN/MODERN_DSN's password before
# connecting instead. Kept as plain module-level dicts (not a function)
# so tests/test_integration.py's monkeypatch.setattr(mc, "LEGACY_DSN", ...)
# pattern keeps working unchanged.
LEGACY_DSN = {
    "host": env("LEGACY_DB_HOST", "localhost"),
    "port": env("LEGACY_DB_PORT", "5432"),
    "dbname": env("LEGACY_DB_NAME", "legacy_db"),
    "user": env("LEGACY_DB_USER", "legacyx"),
    "password": os.environ.get("LEGACY_DB_PASSWORD"),
}

MODERN_DSN = {
    "host": env("MODERN_DB_HOST", "localhost"),
    "port": env("MODERN_DB_PORT", "5433"),
    "dbname": env("MODERN_DB_NAME", "customer_db"),
    "user": env("MODERN_DB_USER", "legacyx"),
    "password": os.environ.get("MODERN_DB_PASSWORD"),
}

STATUS_MAP = {"A": "ACTIVE", "I": "INACTIVE"}


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
        print("MIGRATION REPORT — customers")
        print("=" * 50)
        print(f"Customers discovered:        {self.discovered}")
        print(f"Customers migrated:          {self.migrated}")
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
    """Legacy shape -> modern shape. See docs/architecture/overview.md."""
    return {
        "customer_no": row["customerno"],
        "full_name": row["customername"],
        "status": STATUS_MAP.get(row["custstatus"], "ACTIVE"),
        "email": row.get("email"),
        "phone": row.get("phone"),
    }


def extract_legacy_customers(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT "Id", "CustomerNo", "CustomerName", "CustStatus", "Email", "Phone" FROM "Customers"')
        rows = cur.fetchall()
        return [{k.lower(): v for k, v in r.items()} for r in rows]


def already_migrated(conn, customer_no: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM customers WHERE customer_no = %s", (customer_no,))
        return cur.fetchone() is not None


def load_customer(conn, customer: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO customers (customer_no, full_name, status, email, phone, created_at)
            VALUES (%s, %s, %s, %s, %s, now())
            """,
            (
                customer["customer_no"],
                customer["full_name"],
                customer["status"],
                customer["email"],
                customer["phone"],
            ),
        )


def validate(legacy_conn, modern_conn, migrated_customer_nos: list) -> tuple:
    details = []
    passed = True

    with legacy_conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Customers"')
        legacy_count = cur.fetchone()[0]

    with modern_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM customers")
        modern_count = cur.fetchone()[0]

    details.append(f"Legacy customer count: {legacy_count}")
    details.append(f"Modern customer count: {modern_count}")
    if modern_count < len(migrated_customer_nos):
        passed = False
        details.append("MISMATCH: modern has fewer rows than customers this run believes it migrated")

    mismatches = 0
    with legacy_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as lcur, \
         modern_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as mcur:
        for customer_no in migrated_customer_nos:
            lcur.execute('SELECT "CustomerName", "CustStatus" FROM "Customers" WHERE "CustomerNo" = %s', (customer_no,))
            legacy_row = lcur.fetchone()
            mcur.execute("SELECT full_name, status FROM customers WHERE customer_no = %s", (customer_no,))
            modern_row = mcur.fetchone()

            if not legacy_row or not modern_row:
                mismatches += 1
                continue
            if legacy_row["CustomerName"] != modern_row["full_name"]:
                mismatches += 1
            if STATUS_MAP.get(legacy_row["CustStatus"], "ACTIVE") != modern_row["status"]:
                mismatches += 1

    details.append(f"Field-level mismatches (name/status) across {len(migrated_customer_nos)} spot-checked records: {mismatches}")
    if mismatches > 0:
        passed = False

    return passed, details


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate customers from legacy_db to customer_db.")
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
        legacy_customers = extract_legacy_customers(legacy_conn)
        report.discovered = len(legacy_customers)
        migrated_customer_nos = []

        for row in legacy_customers:
            customer_no = row.get("customerno")
            try:
                if not customer_no or not row.get("customername"):
                    raise ValueError(f"missing CustomerNo or CustomerName (legacy Id={row.get('id')})")

                if already_migrated(modern_conn, customer_no):
                    report.skipped_already_migrated += 1
                    migrated_customer_nos.append(customer_no)
                    continue

                transformed = transform(row)
                if not args.dry_run:
                    load_customer(modern_conn, transformed)
                report.migrated += 1
                migrated_customer_nos.append(customer_no)

            except psycopg2.Error as exc:
                # psycopg2's constraint-violation messages can include the
                # offending column value (e.g. DETAIL: Key (email)=(...)
                # already exists) — don't put row-level PII in the report.
                report.failed += 1
                report.failures.append(f"CustomerNo={customer_no or '?'}: DB error ({exc.pgcode})")
            except Exception as exc:
                report.failed += 1
                report.failures.append(f"CustomerNo={customer_no or '?'}: {type(exc).__name__}: {exc}")

        if args.dry_run:
            modern_conn.rollback()
            print("[dry run] no changes committed.")
        else:
            modern_conn.commit()

        if not args.dry_run:
            passed, details = validate(legacy_conn, modern_conn, migrated_customer_nos)
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
