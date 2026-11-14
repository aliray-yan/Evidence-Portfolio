# Android test on this workstation

Updated 6 November 2026 for **vision-only** analysis. No new recording requests microphone access, and uploaded audio is not analyzed. The user previously installed the temporary CA and verified physical Android file upload and an 8.033-second camera submission on 2 November. Their old transcripts and decisions remain historical records; those results do not describe the revised detector. Continuous physical Android WebRTC and interrupted-Wi-Fi checks remain outstanding; see [Live streaming](LIVE_STREAMING.md).

**7 November connectivity note:** the workstation now reports `192.168.1.30`; the prepared certificate/launcher still names `192.168.1.9`. The old URL below is historical and will not work while that address is unassigned. Before another physical-phone test, prepare a new test directory and matching certificate for the current IP using [MOBILE_TEST.md](MOBILE_TEST.md), then update the launchers and install only its public CA on the phone. Do not bypass a certificate warning or overwrite the earlier evidence/key directory. No new phone certificate was installed by this revision.

1. Keep the computer awake and connected to the same Wi-Fi as the phone. Open the HTTPS URL recorded by the current prepared test directory on both devices. The earlier instance used **https://192.168.1.9:8443** and a separate phone-test database; `localhost:8000` is the older demonstration database and will not show those submissions. Resolve the IP/certificate note above before retesting.
2. On Windows, double-click `show-mobile-test-access.cmd` in the project folder. It displays the randomly generated passwords locally. Use `uploader@sentinel.test` on Android and `reviewer@sentinel.test` on the desktop. Do not paste passwords into chat. The stored copy is protected for this Windows user by DPAPI.
3. Transfer one of the attributed stock controls from `.local/visual-exchange-evaluation/` to the phone's Downloads folder. Open **Capture & upload → Choose existing video** and select it. Sources and measured failures are in [vision-only validation](VISION_ONLY.md). The older EN test pack remains usable for testing upload mechanics only; its spoken scripts no longer trigger analysis.
4. Check the local preview, select **Synthetic or staged test recording**, confirm consent, enter a title and submit. All new uploads on this dedicated server are forced to test recordings, including phone-converted files. Outside this server, the supplied pack is recognized by exact checksum or the uploader must declare a test.
5. Find the same case on the desktop and inspect **Event timeline**, processing coverage and protected visual evidence. There should be no new transcript. **Partial analysis** is expected: the visual exchange detector is experimental and the stock cash handover was missed in the measured evaluation. A detected visual concern requests human review; no detected concern leaves the case **Unassessed**, not safe or cleared.
6. Add a reviewer note and request additional evidence. Verify the same note/status on the phone. A repeated upload of the same file by the same owner opens the existing case; rename alone does not create another case.
7. Separately test **Record with camera** using a short, consented, non-sensitive scene. Mark it as a test, allow camera access, wait for the preview, start recording, wait for the recording timer, stop and submit. This uploads the completed silent recording. For continuous transmission, use **Live cameras**, create a consenting staged session, start the phone camera and open that session as the reviewer on the desktop. Keep the phone page visible and unlocked.

The test server sets SENTINEL_TEST_UPLOADS=1 and disables demo personas, external webhook delivery and the optional OpenRouter key. All uploads on this instance remain explicitly labeled tests. Case media remains authenticated, encrypted and blurred by default; the review copy is silent. An existing uploaded file may contain audio in its local preview, but new backend normalization discards it and produces no transcript. Authorized clear live video/replay is restricted to supervisors and administrators and is audited.

## Starting again

Double-click `start-mobile-test.cmd`, or run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-mobile-test.ps1
```

Do not start a second copy while port 8443 is already in use. Stop the server with Ctrl+C in its terminal. The current prepared directory is `.local/mobile-test-20261102`; records persist there. Certificate expiry is recorded in its `connection.json`. A changed Wi-Fi IP or expired certificate requires a newly prepared directory/certificate using [the generic setup guide](MOBILE_TEST.md), and updated launcher paths. Never overwrite the old data/key directory.

## Certificate and connectivity

Only transfer `.local/mobile-test-20261102/phone-trust.crt`. Never transfer `server.key`, `encryption.key` or `test-access.dpapi`. SHA-256 fingerprint of this temporary CA:

```text
7823ec9468fcb4b2b42a8487beecd824f57155dd7596f336971ff93e35bdc28c
```

The desktop browser also needs to trust this specific CA through the **current user's** certificate-import wizard if it shows a warning. No host trust-store or firewall changes were made by the implementation. Do not bypass a certificate warning. Remove only the SentinelAI test CA from your devices when testing is finished; do not clear unrelated credentials. Android menu locations vary; Google's [certificate management guidance](https://support.google.com/pixelphone/answer/2844832?hl=en) explains where credential settings are located. This HTTPS setup uses a CA certificate, not an enterprise Wi-Fi credential.

If the phone cannot connect: check that the server is running, the IP is still `192.168.1.9`, both devices are on the same non-guest Wi-Fi, and a VPN or Wi-Fi client isolation is not separating them. Keep Windows Firewall enabled; any required rule should be limited to the test program, local subnet and port 8443. No public tunnel or router port forwarding is required.

Limits: MP4/WebM, 100 MB, 120 seconds. If a phone codec cannot be decoded, export H.264 MP4 and retry. Pause/resume works while the selected file and page remain open; it is not a background/offline mobile app.

## Reproducible checks

`check-mobile-test.ps1` decrypts the local credentials privately and runs `backend.verify_mobile` against the real HTTPS listener using the generated CA. It exercises two independent clients, actual local inference, resumable uploads, duplicate completion, media protection and report labels. Results are in `.local/mobile-test-20261102/verification.json`. This script runs on the PC and does not substitute for physical phone confirmation.

The retired English pack and historical measurements are documented in [ENGLISH_VALIDATION.md](ENGLISH_VALIDATION.md). Current visual controls and missing training requirements are in [VISION_ONLY.md](VISION_ONLY.md).
