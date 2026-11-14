# Live-stream verification

## Current vision-only profile — 7 November 2026

The ten-minute rerun passed with actual installed R3D-18, YOLO26n and MediaPipe hand models, two local Chromium contexts, MediaMTX and synthetic 640 × 360 / 15 fps video. No microphone or speech analysis was used. Replay played successfully and explicit preservation created an investigation case. Total test time was 10.6 minutes (11.3 minutes including runner/server setup and shutdown).

| Measurement | Observed |
| --- | --- |
| Measurement wall time / playback advance | 601.580 / 600.111 seconds |
| Playback-to-wall-time ratio | 0.99756; sampled playback rate always 1 |
| Browser-reported dropped frames at measurement end | 3 of 8,714 total frames |
| Completed / skipped violence windows | 96 / 25 |
| Completed / skipped exchange samples | 722 / 317 |
| Violence inference median / p95 | 2.938 / 4.602 seconds |
| Violence result after window closes, median / p95 / maximum | 3.000 / 4.633 / 32.640 seconds, including startup |
| Sampled latest exchange-call duration, median / p95 | 0.485 / 3.001 seconds; sampled status, **not all inference calls** |
| Receiver packet-receive to frame-callback time, median / p95 | 2.477 / 2.498 seconds for a 2.5-second target |
| Uniform frame-sampling timestamp error, median / maximum | 0.0346 / 0.0625 seconds |
| Exact analyzed RTP timestamps observed in viewer callbacks | 1,454 of 1,536 samples |
| Backend RSS median / maximum sampled | 672.2 / 794.6 MiB |
| Backend CPU median / maximum sampled | 37.9% / 56.4%, normalized across logical CPUs |
| Whole-system RAM median / maximum sampled | 76.3% / 89.9% |
| Adapter dropped encoded units / decoder errors | 434 / 0 |
| Replay ring bytes at final sample | 9,607,672; below its 24 MiB cap |

This establishes normal-speed playback for this run, **not complete analysis coverage or reliable event detection**. The scene has no people, so it is not a worst-case person/hand workload. Other host activity was not controlled. Counts cover the measurement endpoint; the stream continued during replay, preservation and screenshots, whose later counters can therefore differ. No exchange event occurred in the synthetic pattern, and this is not a test of positive exchange accuracy.

The current 2.5-second receiver target is shorter than the median three-second violence-result delay. Even the four-second UI maximum cannot cover the measured p95. Findings may therefore arrive late, and the correct response is a timestamped alert with replay, never a box on unrelated current video or slower playback. Each fight decision also needs its full five-second window: these inference figures cannot be advertised as event-onset detection times. Sampling gaps reset incomplete exchange hypotheses, reducing coverage rather than fabricating continuous tracks.

The browser exposed no camera `captureTime`, so **sensor-to-display latency remains unmeasured**. Receive-to-callback timing measures only part of the path. Unmatched RTP samples can reflect missed viewer callbacks/frames or capture boundaries; they are not silently assigned another frame. Exact-frame box logic and late separation were verified with an explicitly synthetic observation in the separate two-browser test; real spatial localization accuracy remains unmeasured.

The first current-profile attempt on 6 November failed after 97 violence windows: the source stopped updating, the session was interrupted, and the test reached its 720-second timeout. Its progress and failure are preserved as `.local/live-benchmark/vision-first-failed-progress.json` and `vision-first-failed-test.json`. The cause of that interruption is not established. The harness now checkpoints measurements, stops if publishing is lost and measures a wall-time interval instead of sixty sleep-plus-request cycles. No access lease or interruption safeguard was relaxed for the rerun.

Raw successful measurements: `.local/live-benchmark/report.json`; compact versioned summary: `evaluation/streaming/vision-only-20261107.json`. Reproduce with the opt-in command in [LIVE_STREAMING.md](LIVE_STREAMING.md). Physical Android/Wi-Fi, interruption recovery, populated scenes and independent model accuracy remain separate acceptance checks.

## Historical audio-enabled profile

The 4 November measurements below describe a retired audio-enabled implementation. No speech service remains active; these numbers must not be used as current-profile results.

4 November 2026. Measurements below are actual executions on the CPU-only workstation, not published model benchmarks or policing-domain accuracy claims.

## Completed sustained run

The opt-in Playwright test completed successfully in 11.1 minutes, including setup and shutdown. It used two local Chromium contexts, synthetic 640 × 360 / 15 fps camera input, repeated authored EN-02 speech, MediaMTX, the real installed R3D-18 and Whisper models, and an isolated database. Source data did not leave the computer.

| Measurement | Observed |
| --- | --- |
| Measurement wall time | 619.552 seconds |
| Video playback advance | 616.031 seconds |
| Playback/wall-time ratio | 0.9943 |
| Browser playback rate | 1 throughout sampled observations |
| Browser-reported dropped frames | 0 at final sample |
| Completed violence windows | 88 |
| Completed speech windows | 20 |
| Violence inference median / p95 | 2.469 / 3.665 seconds |
| Violence result after window closes, median / p95 | 2.492 / 3.749 seconds |
| Maximum violence result delay, including initialization | 21.235 seconds |
| Speech inference median / p95 | 25.445 / 33.808 seconds |
| Backend RSS median / maximum sampled | 742.85 / 884.6 MiB |
| Backend CPU median / maximum sampled | 26.55% / 43.8%, normalized across logical CPUs |
| Whole-system RAM median / maximum sampled | 85.9% / 95.8% |
| Adapter dropped encoded units | 2,179 |
| Exact source RTP samples observed in viewer callbacks | 1,390 / 1,408 |

This establishes continuous normal-speed local playback while actual AI runs, **not complete analysis coverage**. Backend decode errors were zero, but adapter congestion and skipped windows occurred under memory pressure. The first run's skipped-video counter omitted fully missing intervals, and its audio gap counter incorrectly included sender-clock corrections. Those counters were corrected afterward; the raw run is retained, not rewritten to imply better coverage.

RTP matches verify that sampled source frames can be recognized at the viewer, including across independent paths. Eighteen source samples were not observed in the bounded viewer callback capture; exact-frame overlay logic does not guess matches for absent frames. This is not a measured bounding-box localization accuracy result. The active R3D model has no boxes.

The browser did not expose `captureTime` in this run, so **camera-to-display latency was not directly measured**. A separate connected-browser check observed approximately 2.48 seconds average receiver buffering for a 2.5-second request. That is a receiver measurement, not a phone sensor-to-screen guarantee. Physical Wi-Fi latency and audio word alignment need independent measurement.

Raw artifact: `.local/live-benchmark/ten-minute-before-clock-fix.json`. The summary preserves startup and resource pressure. Audio used greedy live decoding; faster decoding alone did not make every 20-second audio window finish in real time on this load.

## Corrections and follow-up scope

The receiver now uses one decoder thread and detects microphone gaps on the 48 kHz RTP clock rather than changing NTP estimates. Incomplete five-second boundaries are rejected, wholly missing intervals are counted, and pending queues remain bounded. A shorter follow-up exercises these changes plus actual original-stream replay and explicit case preservation. Its final result is recorded below after execution; the ten-minute run above predates these corrections.

## Automated checks already executed

- Seven live-session tests: role/privacy restrictions, consent/CSRF, bounded ingestion, idempotence, stop/restart recovery, encrypted privacy processing, clear replay expiry and signaling revocation.
- Seven source-stream tests: wraparound, exact sampling contract, missing boundaries, count/byte/time bounds, actual H.264 + Opus replay decode, encrypted result access, bounded queue replacement and connection role/logout checks.
- Two frontend timestamp tests: wraparound/late classification and exact-frame-only box admission.
- Actual two-browser MediaMTX video/audio test passed, with no clip-upload records, normal-speed playback, source timestamps, owner restriction and successful session shutdown. Axe found no violations on the captured phone and reviewer views.
- The application production build passed. Full application regressions are separate from the targeted streaming checks.

## Limits

Synthetic camera and repeated authored speech are technical fixtures, not independent test footage. Actual Android continuous streaming, interrupted Wi-Fi recovery, different browsers, multiple cameras, hardware capture latency, calibrated model probabilities, spatial violence boxes and independently annotated bribery/violence quality are not established by these checks. No emergency services were contacted.
