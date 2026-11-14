# Architecture (Release 1)

## Principles

1. **Save first, send second.** Pressing SOS writes an incident row before any permission check, GPS lookup or
   network call. If the app is killed a millisecond later, the incident still exists and is resumed.
2. **Say only what the phone reported.** Each message has its own state; the incident status is derived from them.
3. **No single point of failure.** Foreground service is the primary path; a WorkManager job is the backstop;
   a boot receiver resumes after restart; manual SMS and dialer buttons cover permission or radio failures.
4. **Idempotent everywhere.** A unique key per incident, a unique key per message, and an atomic database
   "claim" before every send mean retries and double taps cannot produce duplicate alerts.

## Layers

```
UI (Compose) -> ViewModels -> Repositories -> Room / DataStore
                           -> EmergencyDispatcher -> SmsSender, LocationProvider
EmergencyService (foreground) and DispatchWorker (backstop) both drive EmergencyDispatcher
SmsStatusReceiver <- Android SMS callbacks -> IncidentRepository (the only writer of delivery state)
domain/ is pure Kotlin with no Android imports, so it is unit tested on the JVM
```

## Data model (Room, version 1)

| Table | Purpose |
|---|---|
| `trusted_contacts` | name, normalised number, relationship, enabled, last test result |
| `incidents` | id, idempotency key, status, activation method, silent flag, times, last known location |
| `location_updates` | GPS track per incident (lat, lon, accuracy, speed, heading, time) |
| `notification_events` | one message to one recipient: kind, status, failure code, attempts, SMS segment counters |
| `audit_events` | append-only activity log per incident (phone numbers masked) |

Recipient name and number are copied into each event so history stays correct if a contact is edited or deleted.

## Message and incident states

Message: `PENDING -> SENDING -> SENT -> DELIVERED`, or `FAILED` (retryable or not).
`SENT` means the phone handed it to the network. `DELIVERED` means the recipient's handset sent a delivery report.

Incident status is computed from the **first alert** to each contact (`StatusReducer`):

| Contacts' first alerts | Incident |
|---|---|
| none yet | Created |
| all waiting | Queued |
| any being sent | Sending |
| all left the phone, no delivery reports | Sent, not yet confirmed |
| some delivered | Partly delivered |
| all delivered | Delivered |
| all failed | Not sent (kept and retried) |
| user ended it | Ended |

`Acknowledged` and `Escalated` exist in the enum but are unreachable until the backend and escalation engine exist.

## SOS flow

1. Hold completes, optional cancel countdown, then `IncidentRepository.activate` (returns the existing incident if one is active).
2. `EmergencyController.start` starts `EmergencyService` as a foreground service (location + data sync types).
3. The service runs four jobs: first alerts (`dispatchInitial`), GPS track + periodic location SMS, a 10 s retry sweep, and a watcher that stops everything when the incident ends.
4. `dispatchInitial`: queue one alert per enabled contact, take a cached fix if it is fresh, otherwise wait at most 4 s for one, then send. A stale or missing fix triggers an immediate follow-up SMS when a fresh fix arrives.
5. Each SMS segment reports back to `SmsStatusReceiver`, which updates the event and recomputes the incident status.
6. Retry backoff: 15 s, 30 s, 60 s, then 120 s, up to 6 attempts. "Retry now" ignores backoff.
7. Ending the SOS marks it resolved first, then sends the "SOS ended" notice, then the service stops itself.

## Android constraints handled

- Android 14+: a location-type foreground service needs location permission, so the service type is chosen at runtime; if Android refuses, a notification and the WorkManager backstop take over.
- Android 15: boot receivers cannot start some foreground service types; the resume path catches that and prompts the user.
- Silent mode reads the incident before the first notification so nothing flashes or vibrates.
- SMS callbacks use per-message `PendingIntent` URIs and an attempt counter so late callbacks from an older try are ignored.

## Next: backend (Release 1 completion)

Node.js + TypeScript (NestJS), PostgreSQL + Prisma, Redis, Firebase Admin. First endpoints:
`POST /api/v1/auth/register|login|refresh|logout`, `POST /api/v1/incidents` (idempotency key),
`POST /api/v1/incidents/:id/location`, `GET /api/v1/incidents/:id` (viewer), `POST /api/v1/incidents/:id/acknowledge`,
contact verification, and a share-token endpoint that issues unpredictable, expiring, revocable viewer links.
The Android `notification_events` table already has a `PUSH` channel slot, and `acknowledgedAt`, so push and
acknowledgement slot in without a schema change.
