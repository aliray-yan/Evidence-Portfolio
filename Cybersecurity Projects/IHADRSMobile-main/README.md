# IHADRS Mobile

IHADRS Mobile is an offline-first Android Mobile Threat Defense foundation built with Kotlin, Jetpack Compose, Room, Hilt, WorkManager, and foreground monitoring services.

## Open and Build

1. Open this folder in Android Studio: `IHADRSMobile`.
2. Let Gradle sync.
3. Build the debug APK from **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

For a local release APK, use:

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:assembleRelease --offline
```

Release builds enable R8 minification and resource shrinking. If `release-signing.properties` exists, Gradle signs the APK with that keystore; otherwise it falls back to debug signing for phone testing.

The current implementation is intentionally offline-first: detection, monitoring, and response layers are wired with buildable local implementations that can be expanded into production-grade rules, ML inference, VPN monitoring, and Play Store-compliant advanced services.

## Package

`com.ihadrs.mobile`

## Architecture

- `core`: application setup, constants, helpers
- `data`: Room entities/DAOs, repositories, settings storage
- `domain`: state models and use cases
- `monitoring`: foreground service, receivers, monitors, scheduled scans
- `detection`: rule and analyzer layer
- `classification`: severity, MITRE mapping, explanations
- `response`: remediation action orchestration
- `ui`: Compose UI, navigation, screens, reusable components
