# Progress and known limitations

Legend: **Built** = code written. **Verified** = exercised. Android code has **not** been compiled or run by me;
only the pure-Kotlin domain layer was compiled and tested (27 unit tests pass).

## Release 1

| Feature | State | Notes |
|---|---|---|
| SOS activation (hold, countdown, silent, duplicate protection) | Built | Needs device testing |
| Trusted contacts + test message | Built | Real SMS; reachability shown per contact |
| GPS location (fused + platform fallback) | Built | Needs device testing, including no-Play-services phone |
| SMS alerts, retries, sent vs delivered tracking | Built | Delivery reports depend on the carrier |
| Incident history, message log, activity log, map | Built | Map tiles need internet |
| Offline persistence, resume after reboot | Built | Needs reboot test on Android 14 and 15 |
| Domain logic (status, retry, phone, message text) | **Verified** | 27 JVM unit tests pass |
| Firebase push notifications | Not started | Needs backend |
| Secure expiring location link, live viewer | Not started | Needs backend |
| Accounts, OTP, contact verification by the contact | Not started | Needs backend |

## Release 2 and 3

Not started. Reserved in the code: `ActivationMethod.SHAKE` and `BLE_BUTTON`, `IncidentStatus.ESCALATED`.

## Known limitations

1. SMS needs a SIM, credit and signal. Many networks never send delivery reports, so "Sent" may be the final state.
2. `SEND_SMS` is restricted on Google Play (see README).
3. If you force-stop the app, Android blocks background work until it is opened again. That is an OS rule.
4. Battery optimisation on some phones can stop the service. The setup screen links to the setting.
5. The Fused Location call uses high accuracy every 10 s during an incident; this drains battery by design.
6. The local database is not encrypted beyond Android's file-based encryption; backups are disabled.
7. The SMS "map link" is a plain Google Maps link, not a private expiring link.
8. UI text is English only; Urdu localisation is planned.
9. No instrumented (on-device) tests yet.

## Device test checklist (to run next)

Screen locked; app backgrounded; airplane mode; no SIM; SMS permission revoked mid-incident; location off;
battery saver; reboot during an incident; two SOS presses; low signal then signal returns; dual-SIM phone.
