# Phone → backend → dashboard test

For the already prepared workstation and Android phone, start with [Android quick test](ANDROID_QUICK_TEST.md). The user has confirmed CA installation and phone reachability; physical EN-02 file submission is verified; the physical 8-second camera submission is also verified. Continuous streaming is a separate test: see [Live streaming](LIVE_STREAMING.md).

The browser capture/upload route sends resumable video parts through `/api/uploads`; the legacy multipart route `/api/cases/upload` is also supported. Phone and desktop must open **the same backend instance**. Upload completes after recording is stopped and submitted; this is not live streaming or offline synchronization. No separate mobile application is required.

This guide prepares a private Wi-Fi test on Windows. It does not expose a public tunnel, install a certificate, or change firewall rules automatically. Browser camera access needs a trusted secure context; see [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Do not use a phone's `localhost` to reach the laptop: that address refers to the phone itself.

## 1. Prepare the shared server

Connect both devices to your own private Wi-Fi. Find the laptop's Wi-Fi **IPv4 address** in Windows network settings (for example, `192.168.1.10`; replace that example below). Avoid guest Wi-Fi that isolates devices. Build the frontend, then prepare the isolated test instance:

```powershell
npm.cmd run build
python -m backend.mobile prepare --ip 192.168.1.10
python -m backend.mobile create-admin --email admin@example.test --name 'Test administrator'
```

Choose your own password when prompted. The email is a local login identifier; no message is sent. Records, certificates and keys live in `.local/mobile-test/`, separate from `.local/data/`. The helper disables demo personas, external notifications and the optional cloud key, enables authenticated test-video downloads and Secure session cookies, restricts accepted hosts and generates a persistent media-encryption key. It never prints passwords or encryption/private keys. The folder is ignored by Git; keep it private on an encrypted host volume.

## 2. Trust only the generated test certificate

Transfer **only** `.local/mobile-test/phone-trust.crt` to your test phone using a trusted local transfer. Also trust that certificate for the current Windows user on the laptop. Compare its SHA-256 fingerprint with the one printed by `prepare`. **Never transfer `server.key` or `encryption.key`.** Installing a CA changes device trust, so this remains a deliberate manual action. The helper discards the CA signing key after issuing this server certificate.

- Android: use the device's certificate/security settings to install the supplied CA certificate; exact labels depend on Android/OEM version and managed-device policy. Do not disable certificate validation or browser security flags.
- iPhone/iPad: install the certificate profile, then enable its SSL trust under Settings → General → About → Certificate Trust Settings, following [Apple's instructions](https://support.apple.com/en-us/102390). Managed devices may disallow this.
- Windows: import the certificate into the **current user's** Trusted Root Certification Authorities using the certificate import wizard. Confirm that it is the SentinelAI temporary local test CA with the matching fingerprint.

Remove this temporary CA from your devices after testing. The server certificate lasts 14 days; the CA lasts 30. If the laptop IP changes or the certificate expires, generate a separate test folder with `--directory .local/mobile-test-2` before the subcommand. That is a new database; existing records remain in the old folder. This helper is for temporary local tests, not production certificate renewal.

## 3. Start and connect

```powershell
python -m backend.mobile serve
```

Open the printed `https://YOUR_LAPTOP_IP:8443` address on **both devices**. If Windows asks about network access, restrict permission to the private network. If your firewall blocks port 8443, permit it only for this private test/network through Windows Firewall; do not disable the firewall or configure router port forwarding. The helper binds to the chosen private IP only. Stop it with Ctrl+C when finished.

Both browsers must show a trusted connection without a certificate warning. If not, fix the certificate/IP/trust setup first. Use **Account sign-in** with the administrator you created. In Administration → Users, create a citizen test account for the phone and a supervisor test account for the desktop. Real passwords are required; local demo buttons are disabled on this instance.

## 4. Perform the actual transfer test

1. Sign in as the citizen on the phone and supervisor on the desktop.
2. On the phone, open Capture, review the consent notice, and record a 5–10 second non-sensitive test scene. Approve camera/microphone permission, stop recording, enter a title and submit. Alternatively choose a compatible MP4 from the phone.
3. Wait for upload completion and note the case ID. The backend then persists actual processing stages; the investigation refreshes while processing runs.
4. Open the desktop case queue and search for that same case ID/title. Open it and confirm the privacy copy, processing record and owner. The visible queue updates every ten seconds, and refreshes when you return to the tab. This is polling, not a live push feed.
5. Add a reviewer note and request additional evidence. Refresh the phone case and verify the same note/status. Submit a supplemental recording if needed; it should appear as a linked case.
6. If you selected your Kaggle bundle with `backend.model_import --activate` or set `SENTINEL_VIOLENCE_MODEL` **before** starting this server, check its recorded analysis. With no weights installed, partial/Unassessed and missing model notices are expected.
7. Sign out. Verify that the case's media URL cannot be opened without an authorized session.

The video is stored encrypted on the laptop, processed there, and displayed through authenticated retrieval. Recording waits for a usable camera preview; WebM is preferred when supported, with MP4 as a fallback. Browser containers without duration metadata are normalized before analysis. Successful processing deletes the protected original; the current review copy is silent and blurs the entire frame. This limits useful visual detail. Physical camera support, audio codecs and Wi-Fi connectivity need verification on your device. Some phones record MOV/HEVC; export a supported H.264 MP4 if upload or decoding fails. The limits remain 100 MB and 120 seconds.

## What has been tested automatically

Certificate generation plus an actual local TLS handshake with explicit CA verification; secure non-demo configuration; two independent HTTPS-configured API sessions uploading, retrieving and reviewing the same persisted case; backend permission checks; browser camera/upload using Chromium's synthetic devices. The original API sessions used an in-process test server. On 2 November, two actual network clients also completed resumable uploads and local-model processing through the Wi-Fi IP with CA-verified TLS, secure cookies, protected media and labeled exports. The user separately confirmed Android CA installation and phone reachability. The user then completed a physical EN-02 file upload, whose persisted transcript, phrase events and privacy copy were verified. **The subsequent physical 8-second camera submission was verified. Continuous WebRTC and interrupted-Wi-Fi behavior still require confirmation.**

Interrupted transfers now offer Pause, Resume and confirmed Discard controls. See [upload recovery](UPLOAD_RECOVERY.md) for the 24-hour expiry, privacy boundaries and browser-recording limitations.
