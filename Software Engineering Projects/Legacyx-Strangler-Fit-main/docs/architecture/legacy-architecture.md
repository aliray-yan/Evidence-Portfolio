# Legacy architecture

## What's still here

`legacy-monolith/` started with six domains (Customer, Orders, Inventory, Payments, Reports, Notifications) sharing one database and one deployment unit. After Phases 3, 5, and 7 extracted Customer, Order, and Inventory, the monolith still runs all six controllers — extraction doesn't delete legacy code, it stops routing to it (see `migration-architecture.md`) — but only Payments, Reports, and Notifications are *permanently* staying here; the other three keep their legacy implementation only as the rollback target.

## Why it's built the way it is

Deliberately representative of a real legacy system, not artificially broken:

- **One shared `LegacyDbContext`, one database.** Every domain's tables live in `legacy_db`, queried through the same EF Core context. This is the exact coupling the whole project exists to remove — Customer's extraction (Phase 3) is what "removing it, one domain at a time" actually looks like in practice.
- **Direct internal ID references.** `Order.CustomerId` and `OrderItem.ProductId` are plain integer foreign keys into the same database — fine when everything's in one place, and exactly why `order-service` had to switch to business-key references (`customerNo`, `sku`) once Customer and Inventory could live somewhere else (`services/order-service/README.md`).
- **One deployment unit.** All six controllers ship in a single `dotnet publish` output — changing Payments code means redeploying Reports and Notifications too, whether they changed or not. This is the actual pain the strangler fig pattern solves.

## What's simulated, not real

Payments (`PaymentsController`) never contacts a real payment processor — every request is marked `COMPLETED` immediately. Notifications (`NotificationsController`) logs a simulated send rather than calling a real email/SMS provider. Both are deliberate: the point of this project is the modernization pattern, not building a payment gateway or an email service.

## Verification

Same story as everywhere else in this stack — written and structured here, `dotnet build` not run in this sandbox (NuGet blocked). See `legacy-monolith/README.md` and `MANUAL.md` for exact steps.
