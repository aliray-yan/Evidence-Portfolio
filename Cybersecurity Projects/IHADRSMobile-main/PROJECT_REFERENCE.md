# IHADRS Mobile Project Reference

Project folder:

```text
C:\Users\Ali Rayyan\Documents\Codex\IHADRS\files-mentioned-by-the-user-ihadrs\IHADRSMobile
```

## What This Project Is

IHADRS Mobile is a native Android Kotlin security app built as a mobile EDR-style tool. It focuses on local, explainable monitoring of apps, permissions, SMS links, network indicators, simulated network flows, device integrity posture, alerts, incident review, reports, and optional SecureOps SOC export.

The app is defensive only. It does not steal credentials, hide monitoring, decrypt HTTPS, read private files/photos, or silently exfiltrate logs.

## What Has Been Done

- Native Kotlin/Jetpack Compose Android app.
- Room database for local evidence and alerts.
- DataStore settings.
- Hilt dependency injection.
- App inventory and risk scoring.
- Threat/alert screens and dismiss flow.
- Incident Center and timeline.
- PDF/text security report generation.
- SMS phishing checks.
- Endpoint intelligence checks for domains and URLs.
- SecureOps SOC export, disabled by default.
- Network Flow Monitor foundation:
  - flow model
  - DNS cache
  - IOC matching
  - suspicious ports
  - DGA-like domain detection
  - beaconing detection
  - large upload detection
  - simulation mode
- Integrity scanner:
  - root/tamper indicators
  - Device Admin apps
  - Accessibility services
  - VPN/proxy-capable apps
  - location/background-location apps
  - overlay-capable apps
  - USB debugging risk
- Theme control:
  - system
  - light
  - dark
- In-app manual screen.
- GitHub-safe `.gitignore`.

## What Works Correctly Now

- Local app/security posture scanning.
- Explainable alerts with reasons and actions.
- Local-only storage unless SOC export is manually enabled.
- Network-flow simulation for safely testing detection logic.
- Integrity scan for common Android spyware/backdoor/root indicators.
- SecureOps connection and alert queue architecture.

## Current Limitations

- Real VPN/TUN packet forwarding is scaffolded but not active yet.
- Live per-app packet attribution is not fully implemented.
- The app cannot guarantee detection of kernel-level, firmware-level, or highly privileged implants.
- Encrypted HTTPS content is not inspected by design.
- Trusted CDN traffic can be hard to classify without long-term behavioral baselines.

## How To Use

1. Install the release APK.
2. Open **Manual** first.
3. Run **Integrity Scan**.
4. Review **Apps** and mark known apps Trusted/Watch/Blocked.
5. Use **Network → Run Flow Simulation** only for testing.
6. Use **Network → Clear Flow/Test Data** after simulation.
7. Enable SOC export only if you want alerts sent to SecureOps.

## Future Free Improvements

- Complete local VPN packet forwarding safely.
- Add UID/app attribution for live flows.
- Add baseline learning for normal app network behavior.
- Add user-managed allowlist/blocklist UI.
- Add temporary block mode with explicit consent.
- Add richer flow detail screen.
- Add export of network-flow alerts to SecureOps.
- Add Play Integrity API status where possible.
- Add stronger backup/export for local reports.
- Add onboarding walkthrough for first-time users.

## GitHub Notes

Do not commit:

- `local.properties`
- `release-signing.properties`
- `release/`
- `*.jks`
- `app/build/`
- APKs/AABs
- heap dumps
- `.env`

Use `release-signing.properties.example` as the non-secret template.
