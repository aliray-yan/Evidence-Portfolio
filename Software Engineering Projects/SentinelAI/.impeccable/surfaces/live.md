# SentinelAI live cameras

Mode: Operate. This is an ordinary extension of the evidence-centered civic review workspace in `workspace.md`. Preserve the existing navy navigation, neutral canvas, flat white panels, system typography, teal controls, and restrained uncertainty treatment. The user requested continuation without a style change. `DESIGN.md` and `.impeccable/design.json` remain the incumbent references; this surface introduces no new visual identity or global token contract.

## Task and scope

A consenting camera owner keeps a phone camera connected while an authorized supervisor or administrator reviews continuous video on another device. Capture is video only: no microphone is requested, and live analysis performs no speech recognition, keyword, transcript, or conversation inference. Playback proceeds independently of analysis at normal speed. Findings retain source-clock references; delayed findings remain separate from the current picture and offer the earlier interval for replay and explicit preservation into an investigation case.

Visual exchange analysis is experimental: YOLO person detection, MediaPipe hand localization, geometric rectangular-object proposals, and temporal transfer rules. It does not identify currency or infer intent. Ordinary lawful exchanges can trigger review. The finding title is exactly **Possible Bribery / Suspicious Visual Exchange – Pending Human Review**. This is an uncertain review indicator, never a finding of bribery, misconduct, identity, or guilt.

## Composition and inherited design

- The sessions screen pairs the session list with a consent-based creation form. The form column is (360px), reducing to (320px) at at most (1100px). At at most (750px), the form precedes the list in one column.
- Session detail pairs a flexible media/results column with an analysis-coverage rail (280px), separated by the established (22px) gap. At at most (1100px), coverage follows the primary content in one column.
- Camera and reviewer video use navy (16:9) media regions with contained video. The original-source snapshot sits within its finding; replay occupies a separate panel below findings. Shared panels, buttons, confirmation dialogs, loading, empty, and error components retain the existing system treatment.
- Controls and finding metadata wrap on narrow screens. Coverage exposes source status, violence and visual-exchange availability, completed/skipped work, and recent video-result delay (p95) as text. Findings scroll within a maximum height of (650px).
- In-frame review notices use amber. Bounding boxes have a transparent interior, a yellow border (2px), and a contrasting navy outline (1px). Labels use an opaque navy background with white text, preserving readability across changing imagery without obscuring the boxed evidence. Live-frame and snapshot boxes share this treatment.
- Stream-local neutral/amber shades and the range accent remain local styling. The divider fallback differs slightly from the global line token; it is an implementation exception, not a new palette direction.

## Implemented interaction

Session creation requires a neutral title and explicit informed consent. The staged-test checkbox starts selected. Instructions explain one camera at a time, the same-Wi-Fi setup, keeping the phone unlocked and the publishing page visible, and the (30-minute) session limit. The owner sees a local preview; the remote clear feed and findings are restricted to supervisors and administrators. Server access checks and audit records cover clear-feed and replay access.

Capture requests a rear-facing camera with ideal (640 × 360) resolution and (15fps), capped at (1280 × 720) and (30fps), with `audio: false`. These are requested constraints, not guaranteed delivered performance. H.264 is required; there are no configured public ICE servers. Hiding the publishing page, ending a camera track, stopping the camera, or ending the session closes capture. Interrupted connections explain how to reconnect; background capture is not provided.

The reviewer has Play and Reconnect viewer controls. The requested viewing buffer defaults to (2.5 seconds), moves in (0.5-second) steps, and is clamped to (0–4 seconds). It sets the receiver's `jitterBufferTarget` where supported; unsupported browsers retain their default. This bounds the requested target, not total end-to-end latency. Observed average receiver buffer and presented/decoded-frame and drop counters remain separate measurements. Playback rate is (1), and AI completion does not pause the picture.

Findings are polled independently of media. The client retains up to (200) recent records and displays the newest (40). Records expose creation time, source interval and RTP timestamps, inference duration, detail, and available source snapshots. Visual exchanges show **Heuristic support**; violence results show **Model score**. Both explicitly remain uncalibrated and are not probabilities of misconduct. Timing labels distinguish a late arrival, a current playback match, a timestamped result, and a previous camera connection.

A live review notice requires a flagged finding from the current connection epoch whose interval contains the presented frame timestamp. Live boxes additionally require a valid normalized box with an RTP timestamp exactly equal to that presented frame. Missing frame timestamps disable overlays; boxes are positioned within the contained video area. Snapshot boxes are filtered against the snapshot's own exact RTP timestamp. Late results keep their source snapshot and replay action below the live feed instead of labeling unrelated current video. Object type and intent remain explicitly unknown.

The separate five-second fight classifier supplies no bounding boxes or exact action frame. Visual-exchange rules compare consecutive samples at (2fps). Unavailable, degraded, and skipped work remains visible; below-threshold or absent results do not establish safety. Other queued uploads wait while live analysis is active, although in-flight work may finish.

Replay opens the original silent source interval in its own native-controls player while the live feed continues. It may begin at the preceding keyframe. The server keeps a rolling (60-second), (24MiB) memory buffer; replay can expire sooner under memory pressure and cannot cross camera-connection epochs. An already-fetched browser replay remains available until closed, replaced, or the view is destroyed; server expiry does not automatically revoke that loaded blob.

Preservation asks for confirmation, stores the original interval through the existing protected-evidence pipeline, and replaces the action with an investigation link. The dialog explains that subsequent processing starts when live analysis releases the laptop. Ending a session also asks for confirmation and explains expiry of unpreserved replay while preserved cases remain.

Viewer errors retain the error message and provide specific recovery guidance: use Reconnect viewer for a connection failure, retry replay or preservation through those actions, and allow findings to refresh automatically. **Dismiss error** only clears the message. It is not presented as a retry or recovery action.

## Evidence and verification limits

Documentation checked on 7 November 2026 against `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `workspace.md`, `src/pages/Live.tsx`, `src/live.ts`, and the live/stream rules in `src/styles.css`. Supporting source checks covered `backend/visual_exchange.py`, `backend/stream_analysis.py`, `backend/stream_transport.py`, and `backend/stream_timing.py` for the experimental model scope, video-only path, replay authorization, and retention bounds.

The build handoff identifies the following captures as freshly generated and root-validated on 6 November 2026, with relevant UI source unchanged afterward. Both files were opened and visually checked for this documentation pass:

- `.impeccable/review/live/desktop.png`: full-page capture at (1440px) width, showing the connected reviewer feed on generated colorbars, unavailable model coverage, buffer controls, and an explicitly synthetic late finding with exact-source snapshot geometry. The fixture text states that there are no people, object transfer, or genuine model findings. Its opaque navy/white box label and contrasting outline demonstrate rendering, not positive detection.
- `.impeccable/review/live/phone.png`: full-page publisher capture at (390px) width, showing the connected generated-video preview, Stop camera, the video-only/no-microphone statement, restricted-review notice, and stacked coverage. This is a narrow browser viewport, not evidence of a physical phone test.

The following files now contain current vision-only captures from 7 November 2026, replacing the older audio-era images. The root build handoff validated them, and this documenter opened and visually checked both against the unchanged UI:

- `.impeccable/review/live/desktop-model-results.png`: full-page (1440 × 2532px) reviewer capture with connected synthetic colorbars, running violence analysis, experimental visual-exchange coverage, completed and skipped work, late below-threshold violence findings, an open silent replay, and an Open preserved case link. These are actual installed-model outputs on generated video, not positive detections or labeled accuracy evidence.
- `.impeccable/review/live/phone-model-results.png`: (390px) publisher viewport showing connected synthetic video, the no-microphone statement, restricted-review notice, and stacked running/experimental analysis coverage. It is not a physical-phone or Wi-Fi performance test.

The completed sustained rerun is recorded in `evaluation/streaming/vision-only-20261107.json`: (601.58 seconds) measured elapsed time and (600.111 seconds) of playback, with playback rate (1). It completed (96) violence windows and (722) exchange samples while skipping (25) video windows and (317) exchange samples. The measured result is one successful local synthetic run with actual installed violence/person/hand models; skipped work remains part of that result. Capture-time counters differ from the measurement endpoint, so the JSON is the source for benchmark totals. The first failed run remains a failure, retained in `.local/live-benchmark/vision-first-failed-test.json`; the rerun does not erase it or establish general sustained reliability.

The generated scene contains no people and does not exercise worst-case person/hand workloads. Host activity was uncontrolled, exchange timings were sampled rather than recorded for every inference, and camera capture timestamps were unavailable, preventing a camera-to-display latency claim. The images and measurement do not validate model accuracy or actual positive visual-exchange detection.

The build handoff reports a passing build and an actual two-browser video-only test with axe checks. The finish reviewer returned **ship** after scoring two named fixes resolved: readable box labels/outlines with transparent interiors, and replacement of the misleading retry action with explicit recovery text and Dismiss error. That disposition applies to the listed fixes; this documenter did not rerun the application, test suite, or reviewer.

The evidence supports the rendered desktop/mobile hierarchy, the described source-derived behavior, and completion of the measured local synthetic run. It does not establish independent model accuracy, real positive visual-exchange detection, real-phone camera or network performance, general sustained reliability or throughput, universal timing precision, or full accessibility conformance. Future material UI changes require rechecking this brief and its evidence.

Preexisting drift remains outside this extension: later model/provenance and reading-guide components, the (120ms) analysis-disclosure rotation, sidebar scrolling, and the short-desktop oversight-panel rule are absent from the older system inventory. The context tool also reports an unset design build-path preference for future landing/showcase work. These were not repaired or promoted into new system rules; `DESIGN.md`, `.impeccable/design.json`, and project configuration remain unchanged by this documentation pass.
