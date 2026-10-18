# notification-service

Small standalone Python consumer. Subscribes to `legacyx.orders` on Kafka, and for `OrderCreated` events, logs a simulated notification — no real email/SMS provider is ever contacted, same convention as the legacy monolith's own Notifications endpoint. Not one of the original spec's numbered phases, but a producer with nothing consuming its events doesn't demonstrate the event-driven pattern, so this exists to close the loop for Phase 6.

## Verified — the part that doesn't need a broker

`handle_event()` is deliberately separated from the Kafka connection itself, so the actual business logic is tested directly: `pytest tests/ -v`, genuinely run, all three cases pass — a valid `OrderCreated` event produces the expected log line (asserted on the actual log content via `caplog`, not just "didn't crash"), an unrelated event type is correctly ignored, and a malformed event raises rather than silently doing nothing.

This also caught a real dependency bug before it became your problem: the original choice, `kafka-python==2.0.2`, fails to import on Python 3.12 (`ModuleNotFoundError: kafka.vendor.six.moves` — a known upstream compatibility issue). Switched to `confluent-kafka` instead, which installed and imported cleanly, and which also happens to be the same client family (librdkafka-based) that Order Service uses on the .NET side, via `Confluent.Kafka`.

## What's not verified here

The actual network path — producer in Order Service → Kafka → this consumer — needs Docker, which this sandbox doesn't have. See `../../MANUAL.md` for the exact steps to run it for real and what success looks like.

## Running it

```
docker compose up kafka notification-service
```
Or locally: `pip install -r requirements.txt && python notification_service.py` (needs `KAFKA_BOOTSTRAP_SERVERS` pointed at a reachable broker — defaults to `localhost:9094`, matching this repo's Kafka port mapping).
