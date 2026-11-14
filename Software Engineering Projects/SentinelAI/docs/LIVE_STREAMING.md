# Continuous camera streaming

Updated 6 November 2026. This extends the existing application; Capture & upload still supports finished videos. Live cameras publishes one continuous camera-only video stream, with independent playback and analysis. This is a browser application, not a native Android background service.

## Start and test

On a fresh Windows checkout, use the project Python environment:

```powershell
python -m pip install -r requirements.txt -r requirements-vision.txt -r requirements-ai.txt -r requirements-exchange.txt -r requirements-streaming.txt
python -m backend.setup_streaming --bridge
npm.cmd run build
```

The installer pins and verifies the official MediaMTX v1.21.3 Windows archive and installs a local Go toolchain to build the small RTP adapter. Models are separate: follow LOCAL_AI.md and the Kaggle bundle instructions. Missing models are shown as unavailable. There are no inference-time model downloads or cloud video transfers.

1. Start the existing private HTTPS test server with `start-mobile-test.cmd`. Use the same server URL on phone and desktop; the prepared URL is `https://192.168.1.9:8443` while that Wi-Fi address and certificate remain valid.
2. On Android Chrome, sign in with the uploader account, open **Live cameras**, enter a neutral title, declare a staged test and confirm consent. Choose **Create camera session**, then **Start camera**. Keep the page visible and phone unlocked.
3. On the desktop, sign in as the reviewer, open **Live cameras** and the same session. The authorized clear feed connects automatically. Microphone access is disabled.
4. Start with a 2.5-second viewing target. The slider permits 0–4 seconds. Compare it with the observed receiver-buffer measurement; the browser controls the actual delay. Playback never slows down or waits for AI.
5. Inspect **Analysis coverage** and **Timestamped findings**. A score below the model threshold is not proof of safety. An earlier finding must not label the current video. Choose **Replay interval** while it is retained, or **Preserve for review** to create a case through the existing encrypted evidence/privacy workflow.
6. End the session. Queued ordinary uploads resume; preserved intervals can be investigated, annotated and reviewed in the existing case workspace.

The phone owner sees their own local camera. Only supervisors/admins can receive the clear remote feed, visual findings and replay. Stream establishment, sensitive result access, replay, preservation and closure are audited. Existing-recording upload and physical short camera submission have already been verified; physical Android **continuous WebRTC** and interrupted-Wi-Fi behavior still need a separate test.

## Architecture and timestamps

Phone H.264 video → WebRTC/WHIP → private MediaMTX → WebRTC/WHEP viewer. A loopback RTSP reader consumes the same original source in parallel. The small Go adapter depacketizes H.264 and Opus and forwards original RTP timestamps, SSRC, RTCP-derived NTP, receive time and gap counters to Python. Python decodes in memory and submits bounded windows to the installed models. No completed recording is required to play or analyze the live stream.

The source video clock is 90 kHz, with explicit 32-bit wraparound handling. MediaMTX preserves the source H.264 RTP timestamp when forwarding WebRTC. The viewer obtains the displayed frame's RTP timestamp through `requestVideoFrameCallback`. Clock epochs isolate reconnects. If frame timestamp metadata is unavailable, frame overlays are disabled instead of guessed. Arrival time is retained separately from source time, so an on-time result does not become mislabeled as late simply because the viewer advances.

Audio packets from legacy clients are ignored; no ASR, speaker/sound analysis, phrase matching or audiovisual classification runs. Person/hand/object candidates retain the source video frame timestamp. The [vision-only baseline](VISION_ONLY.md) compares consecutive frames and abstains on missing/ambiguous ownership. Its first real cash control was missed; integration does not imply reliable exchange detection.

## Model contract and overload policy

- R3D-18 consumes 16 uniform RGB samples spanning five seconds, with the Kaggle resize/crop/normalization contract. Incomplete boundaries, large timing gaps or insufficient frames yield no score. The model's threshold and checksum travel with each result.
- R3D-18 produces a **clip score**, not spatial boxes or an exact action frame. No bounding boxes are fabricated. The frontend's box interface accepts only genuine normalized coordinates tied to an exact source frame; no spatial violence detector is active.
- Experimental person/hand/rectangular-patch analysis samples 2 fps. Before/contact/after observations are required. Gaps over 0.8 seconds reset an incomplete transfer hypothesis. Returned boxes are actual proposals tied to sampled frames, not currency or violence localization. Ordinary document transfers can satisfy the same geometry. Confidence is labeled heuristic support.
- Each analysis lane has one pending window plus the in-flight window. Overload replaces the oldest pending whole window and increments the skipped counter. It never shortens the violence model's temporal input or presents skipped content as safe.
- The adapter caps its queue at 256 encoded units and 8 MiB. The replay ring caps both age (60 seconds) and compressed size (24 MiB). Decode windows and frontend result history are bounded. Replay may expire sooner due to byte limits; no hidden infinite recording is kept.
- One publisher and three reviewer connections are supported per process. The default camera target is 640 × 360 at 15 fps, with a 1280 × 720 limit. This is not a validated multi-camera profile. New ordinary processing jobs wait while live analysis is active; already-running jobs can finish.

Five seconds of temporal context already exceeds a 2.5-second viewing buffer for the first frame in a violence window. A two-second inference does **not** mean a two-second event-to-result delay. Temporal exchange rules also require a before/contact/after sequence. A maximum four-second buffer keeps viewing live; late alerts and replay are necessary, even when the model keeps up on average.

## Replay, privacy and persistence

Replay remuxes original encoded packets into an in-memory MP4, starting at the preceding keyframe. Current sessions contain video only; audio is not stored in the live ring. This does not re-encode or blur the original. It is restricted to authorized reviewers, expires, and is audited. The clear live access and short rolling buffer are explicitly disclosed in recording consent, as requested for this demonstration.

Finding payloads, including source snapshots, are encrypted before SQLite persistence. Audit records contain identifiers, not quotations. Explicit preservation sends the retained interval into the existing encrypted case workflow; default stored review derivatives remain blurred. Preserve is idempotent per finding. Original exchange findings are mapped onto the keyframe-aligned case timeline and retained even if reanalysis differs. Preserved clear snapshot/provenance access remains reviewer-only. Stopping a session does not retroactively preserve every moment. Retention handles live results; backups/secrets and SQLite metadata still need host-volume encryption for deployment.

Browser session, role and connection leases are rechecked. Missing heartbeats expire within 15 seconds. Logout/role revocation closes access; inability to confirm revocation shuts down the streaming process. MediaMTX HTTP signaling, control and RTSP bind to loopback; the application proxies only authorized WHIP/WHEP offers. ICE/SRTP media listens on a local UDP port. There is no public tunnel, TURN relay, automatic emergency call or dispatch integration.

## Measurements and reproducible tests

The actual-model sustained test is opt-in, uses an isolated database, synthetic video with no microphone, and never inherits a cloud key:

```powershell
$env:SENTINEL_STREAM_BENCH='1'
npx.cmd playwright test e2e/live-benchmark.spec.ts
Remove-Item Env:SENTINEL_STREAM_BENCH
```

Use the project Python environment on PATH and the installed Playwright Chromium path if needed, as in VERIFICATION.md. Artifacts are `.local/live-benchmark/report.json` and `progress.json`. The report records wall-clock and playback duration, source-RTP sample matches, frame drops, estimated browser capture-to-display timing, inference/result latency, queue gaps, backend RSS/CPU and system RAM. Browser capture time is an RTCP estimate, not hardware-measured camera latency. Backend CPU is normalized by logical CPU count; RSS excludes browser and MediaMTX, while system RAM includes everything running.

Earlier audio-enabled profiles are historical. Current vision-only measurements are separated in [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md). A generated test pattern proves streaming/inference plumbing, not accuracy on people or the worst-case cost of four visible hands. No unexecuted performance claim is implied.

## Troubleshooting and remaining verification

- **Page opens but stream does not:** check current Chrome, camera permission, same non-guest Wi-Fi and the MediaMTX runtime. HTTPS alone does not prove UDP media reachability. Any Windows Firewall permission should be restricted to the installed MediaMTX program, private network and local subnet. Do not disable the firewall or forward router ports.
- **Unavailable service:** install/build the verified streaming runtime, restart the application and inspect the visible service error. `SENTINEL_STREAMING=0` explicitly disables it.
- **Replay expired:** the rolling interval was not preserved before expiry or belongs to an earlier connection. Do not treat an absent replay as stored evidence.
- **Skipped analysis:** close competing heavy workloads, retain the single-camera/low-resolution profile, and inspect coverage counters. The live picture can continue while analysis is incomplete.
- **Model score without a box:** expected for R3D-18. A trained spatial detector and separate evaluation are needed for real action localization.

Physical Android Wi-Fi, browser compatibility, overnight reliability, multi-camera operation and independent policing-domain model quality remain separate acceptance work. Software timing tests are not accuracy validation or a basis for declaring misconduct.

Primary interface references: [browser buffer target](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/jitterBufferTarget), [frame timestamp metadata](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [MediaMTX browser streaming](https://mediamtx.org/docs/read/web-browsers).
