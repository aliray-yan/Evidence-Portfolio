# SafeHaven (Release 1: Essential safety)

Native Android app (Kotlin, Jetpack Compose, Material 3, Room, WorkManager, Fused Location).
One press-and-hold sends an SOS to your trusted contacts by SMS, with your GPS location, and keeps
sending location updates until you end it. Everything is stored on the phone first, so nothing is lost
if the network is down.

## Open and run

1. Install **Android Studio** and **JDK 17** (JetBrains Runtime 17 or another JDK 17 distribution).
   The Gradle daemon is pinned to Java 17 in `gradle/gradle-daemon-jvm.properties`.
   A newer Studio may bundle Java 25, so do not assume its bundled runtime is compatible.
2. **File > Open** and choose this `SafeHaven` folder. Wait for Gradle sync (first sync downloads dependencies).
3. If Studio offers to install missing SDK pieces (Android SDK Platform 35), accept.
4. If Studio suggests upgrading the Android Gradle Plugin, you can decline for now. The versions in
   `gradle/libs.versions.toml` are a matching set.
5. Pick a device and press **Run**. For anything involving SMS, use a **real phone with a SIM** (see below).

If Studio reports an incompatible Gradle JVM, open **Settings > Build, Execution, Deployment >
Build Tools > Gradle** and select your installed JDK 17. Alternatively, select
**GRADLE_LOCAL_JAVA_HOME** and set `java.home` in `.gradle/config.properties` to that JDK's path
(use forward slashes on Windows). Then sync the project. A saved label such as `jbr-21` can still
point at Studio's bundled `jbr` folder after an IDE upgrade, even if that folder now contains Java 25.
For terminal builds, set `JAVA_HOME` to the same JDK 17 installation.

## Trying it out

| What | How |
|---|---|
| First run | Enter your name, tap **Allow** for Location, Send SMS and Notifications. |
| Add a contact | **Contacts > Add contact**. Use a number you control. Tap **Send test** to confirm it works. |
| Send an SOS | Home screen: hold the red button, then you get a 5 second cancel window. |
| Active screen | Shows per contact: Waiting, Sending, Sent, Delivered or Failed, and your location. |
| End it | **I'm safe. End SOS**. Contacts who got the alert get an "SOS ended" text (can be turned off). |
| History | **History** lists every incident with the message log, activity log and GPS track map. |

**Emulator.** Run two emulators; an emulator's phone number is its console port (for example `5554`, `5556`).
Add `5556` as a contact on the `5554` emulator and the SMS arrives on the other one. Set location in
the emulator's *Extended controls > Location*. Emulators usually do not return delivery reports, so you
will see "Sent", which is the honest result.

**Real phone.** Messages are real SMS and use your carrier plan. Use your own numbers while testing.

## What is in this version

- SOS activation: press-and-hold button, cancel countdown, silent mode, duplicate-press protection
- Trusted contacts with a real test message per contact
- GPS via Fused Location (falls back to the platform GPS on phones without Google Play services)
- SMS alert with coordinates, accuracy, map link, time and a reference; periodic location updates
- Honest delivery tracking: Sent (left the phone) is separate from Delivered (their handset confirmed)
- Offline persistence: the incident is saved before anything else; retries with backoff; resumes after reboot
- Incident history with message log, activity log and an OpenStreetMap track
- Fallback buttons: open your SMS app prefilled, or open the dialer for your emergency number

## What is not in this version (and why)

- **Firebase push, secure expiring location links, live viewer map, accounts and OTP login.** These need the
  SafeHaven backend (Node/TypeScript, PostgreSQL, Redis, FCM), which is the next deliverable. Until then,
  the "location link" in the SMS is an ordinary Google Maps link to the last position, not an expiring link.
- **Acknowledged status.** SMS alone cannot prove a contact saw the message.
- **Encryption of the local database.** Data is in app-private storage with backups disabled; a Keystore-wrapped
  database key arrives with evidence capture in Release 2.
- Release 2 and 3 features (shake, evidence, journeys, escalation, BLE, child accounts, geofencing, AI assistant).

See `docs/PROGRESS.md` for the full checklist and `docs/ARCHITECTURE.md` for how it fits together.

## Project layout

```
app/src/main/java/com/safehaven/app/
  domain/      pure Kotlin: status rules, retry policy, SMS text, phone validation (unit tested)
  data/        Room database, DataStore settings, repositories
  emergency/   SMS sender + status receiver, dispatcher, foreground service, WorkManager backstop, boot receiver
  ui/          Compose screens, view models, navigation, theme
app/src/test/  unit tests for the domain layer
docs/          architecture, progress and limitations
```

## Unit tests

`./gradlew :app:testDebugUnitTest` (or right-click `app/src/test` in Studio > Run Tests).

## Release build

Create `keystore.properties` in the project root (it is git-ignored) with `storeFile`, `storePassword`,
`keyAlias`, `keyPassword`, then `./gradlew :app:assembleRelease`. Code shrinking is off until a release
build has been exercised on real devices.

## Play Store note

`SEND_SMS` is a restricted permission on Google Play. Apps that are not the default SMS app need a
Permissions Declaration, and an emergency-alert exception is not guaranteed. Sideloading and direct
distribution are unaffected. The backend SMS route in the next step is the long-term answer for store
distribution.
