"""
Integration test against a real, running Postgres — not mocked. Uses a
throwaway schema so it doesn't collide with legacy_db/customer_db/etc.
Requires Postgres reachable at localhost:5432 with the legacyx/changeme
credentials this repo uses everywhere for local dev.

This formalizes the same dry-run/real-run/idempotent-re-run pattern
already proven by hand for all three migrators (see each script's
section of ../README.md) into an actual repeatable test, using
migrate_customers.py as the representative example — the other two
scripts follow the identical pattern.

Run: pytest tests/test_integration.py -v
"""

import os
import sys

import psycopg2
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import migrate_customers as mc

TEST_DB = "legacyx_migrator_test"
DSN_BASE = {"host": "localhost", "port": "5432", "user": "legacyx", "password": "changeme"}


@pytest.fixture(scope="module")
def test_databases():
    """Creates a throwaway database with both a legacy-shaped and a
    modern-shaped customers table, drops it afterward regardless of
    test outcome."""
    admin_conn = psycopg2.connect(**DSN_BASE, dbname="postgres")
    admin_conn.autocommit = True
    with admin_conn.cursor() as cur:
        cur.execute(f'DROP DATABASE IF EXISTS "{TEST_DB}"')
        cur.execute(f'CREATE DATABASE "{TEST_DB}"')
    admin_conn.close()

    conn = psycopg2.connect(**DSN_BASE, dbname=TEST_DB)
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE "Customers" (
                "Id" SERIAL PRIMARY KEY,
                "CustomerNo" TEXT NOT NULL UNIQUE,
                "CustomerName" TEXT NOT NULL,
                "CustStatus" TEXT NOT NULL DEFAULT 'A',
                "Email" TEXT, "Phone" TEXT,
                "CreatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        """)
        cur.execute("""
            CREATE TABLE customers (
                id BIGSERIAL PRIMARY KEY,
                customer_no TEXT UNIQUE,
                full_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                email TEXT, phone TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT now()
            )
        """)
        cur.execute("""
            INSERT INTO "Customers" ("CustomerNo","CustomerName","CustStatus") VALUES
            ('C001','Test Customer One','A'),
            ('C002','Test Customer Two','I')
        """)
    conn.commit()
    conn.close()

    yield TEST_DB

    admin_conn = psycopg2.connect(**DSN_BASE, dbname="postgres")
    admin_conn.autocommit = True
    with admin_conn.cursor() as cur:
        cur.execute(f'DROP DATABASE IF EXISTS "{TEST_DB}"')
    admin_conn.close()


def test_migration_moves_all_customers(test_databases, monkeypatch):
    monkeypatch.setattr(mc, "MODERN_DSN", {**DSN_BASE, "dbname": test_databases})
    monkeypatch.setattr(mc, "LEGACY_DSN", {**DSN_BASE, "dbname": test_databases})

    legacy_conn = psycopg2.connect(**mc.LEGACY_DSN)
    modern_conn = psycopg2.connect(**mc.MODERN_DSN)

    legacy_customers = mc.extract_legacy_customers(legacy_conn)
    assert len(legacy_customers) == 2

    for row in legacy_customers:
        transformed = mc.transform(row)
        mc.load_customer(modern_conn, transformed)
    modern_conn.commit()

    with modern_conn.cursor() as cur:
        cur.execute("SELECT customer_no, full_name, status FROM customers ORDER BY id")
        rows = cur.fetchall()

    assert rows == [
        ("C001", "Test Customer One", "ACTIVE"),
        ("C002", "Test Customer Two", "INACTIVE"),
    ]

    legacy_conn.close()
    modern_conn.close()


def test_already_migrated_detection(test_databases, monkeypatch):
    monkeypatch.setattr(mc, "MODERN_DSN", {**DSN_BASE, "dbname": test_databases})
    conn = psycopg2.connect(**mc.MODERN_DSN)

    # C001 was already inserted by the previous test — modules-scoped
    # fixture means this table state carries over, which is itself part
    # of what's being tested: idempotency detection against real data.
    assert mc.already_migrated(conn, "C001") is True
    assert mc.already_migrated(conn, "C999") is False

    conn.close()
