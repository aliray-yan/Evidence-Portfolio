# Architecture overview — v1

## Why Strangler Fig

The legacy monolith works, but replacing it wholesale is how modernization projects die: too much scope, too much risk, no way to course-correct mid-flight. The Strangler Fig pattern extracts one piece at a time behind a routing layer, so the legacy system keeps running the parts that haven't moved yet, and a broken extraction can be rolled back without taking down everything else.

See `docs/decisions/ADR-001-strangler-fig-pattern.md` for the full reasoning.

## v1 scope

One domain — Customer — taken through the complete lifecycle: legacy-only, gateway introduced, extracted to a modern service, data migrated and validated, traffic switched, rollback available. Every other domain (Orders, Inventory, Payments, Reports, Notifications) stays on the legacy monolith, untouched, for v1.

Why one domain instead of five: `docs/decisions/ADR-002-scope-v1-single-domain.md`.

## Components

**Migration Gateway** (`gateway/`)
Entry point for all client traffic. Holds a small routing table — currently just one entry, `customer → legacy | modern` — and decides where each request goes. This is the only place routing decisions live; nothing else hard-codes legacy vs. modern.

**Legacy Monolith** (`legacy-monolith/`)
ASP.NET Core app, one PostgreSQL database (`legacy_db`). Owns Customer, Orders, Inventory, Payments, Reports, Notifications. In v1, everything except Customer keeps running here permanently — this isn't a temporary stub, it's the real fallback.

**Customer Service** (`services/customer-service/`)
Spring Boot, its own database (`customer_db`). Owns customer creation, retrieval, update, and status — nothing else. Doesn't call the legacy database directly; only the migration step and the gateway know both systems exist.

**Data migrator** (`migration/data-migrator/`)
One-time script: reads `legacy_db.customers`, writes `customer_db`, produces a validation report (row counts, spot-checks). Not a general ETL framework — just enough to prove the pattern for this one table.

**Order Service** (`services/order-service/`)
ASP.NET Core, its own database (`order_db`). Phase 5. References customers by `customerNo` rather than a numeric ID — see `services/order-service/README.md` for why that matters once Customer can live in either database.

## Anti-corruption layer

The legacy customer record and the modern one don't share a shape on purpose — translating between them is the point:

```
Legacy                           Modern
{                                 {
  "CustomerNo": "C001",             "id": 1,
  "CustomerName": "Ali",            "customerNo": "C001",
  "CustStatus": "A"                 "fullName": "Ali",
}                                   "status": "ACTIVE"
                                  }
```

`customerNo` is deliberately kept, not renamed — it's the legacy business key, preserved so Phase 5's migration can match records across both databases. `id` is a new, independent identifier and is *not* the same value as legacy's internal `Id`. That gap is real and has a consequence for Orders, which still reference customers by the legacy `Id` — see the known limitation in `services/customer-service/README.md`.

The mapping lives in one place (the migration script, once Phase 5 exists), and legacy field names never leak into the modern service's code.

## Request flow (Customer, modern path)

```
Client → Gateway → Customer Service → customer_db
                       │
                  (falls back to Legacy Monolith
                   if rollback is triggered)
```

## What's deliberately not here

Kafka, an outbox pattern, a full observability stack, RBAC, multi-domain extraction — all designed conceptually as part of the original scope, none built in v1. See `docs/roadmap.md`.
