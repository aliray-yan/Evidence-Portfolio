# Continuous mobile streaming — implementation record, 4 November 2026

The latest user direction replaces the unfinished clip-upload/stop-until-analysis approach. Live playback must remain continuous at normal speed. The phone publishes one original camera/microphone stream over WebRTC; dashboard playback and AI consume that stream independently, preferably through MediaMTX.

## Current implementation

- MediaMTX v1.21.3 official Windows release is downloaded and SHA-256 checked by `python -m backend.setup_streaming`.
- Authenticated WHIP/WHEP, original-source RTP decoding, bounded analysis queues, encrypted results, timed live viewing, late-result handling and authorized replay are implemented. The previous clip-based viewer is replaced; legacy ingestion remains compatible but is not used for continuous streaming.
- Two-browser continuous playback and microphone transport passed, followed by a completed ten-minute run with the actual installed violence and speech models. See [setup and limits](LIVE_STREAMING.md) and [measured verification](LIVE_VERIFICATION.md). Physical Android streaming remains a separate acceptance step.
- The user explicitly requested clear live video for authorized supervisors/admins. Other roles must not obtain clear streaming or replay URLs. The phone owner sees their own local camera.

## Implementation sequence

1. Run MediaMTX privately, proxy WHIP/WHEP signaling through existing session/CSRF authorization, and bound/revoke viewing leases. Keep network-facing HTTP control endpoints private.
2. Consume the same original stream for inference. Retain source RTP presentation timestamps, audio timing and clock provenance. Verify timestamp preservation across MediaMTX and browser playback before enabling overlays.
3. Preserve the trained R3D preprocessing contract: 16 uniformly sampled RGB frames spanning five seconds. Separate low-cost reception from bounded vision and speech work queues. Report skipped windows and queue pressure.
4. Stream at normal speed with a requested 2.5-second browser jitter buffer, configurable within a small finite bound. Report measured buffering; the browser may not honor the request exactly. Never wait indefinitely for analysis.
5. Match results using presentation timestamps. A missed playback deadline becomes a late alert, never a label or box on an unrelated frame. Provide authorized replay from bounded rolling media.
6. Process microphone audio with timestamped local transcription and bounded conversation context. Retain traceable evidence and distinguish phrase/context rules from trained intent classification.
7. Exercise continuous two-client playback, authorization/revocation, timestamp alignment/wraparound, queue overload, dropped frames, replay expiration, reconnects and sustained operation. Measure actual stream/AI latency, resource use and synchronization error. Invite physical Android verification only when runnable.

## Model limits

The trained R3D-18 model supplies a five-second fight/nonfight score, not a bounding box or exact action boundary. Its actual output must remain a window-level possible-conflict indicator. Frame boxes require an actual object/action detector. Existing knife/scissors detection has a narrower, separate scope and does not establish violence or bribery. No coordinates or precise action frames may be fabricated.

A measured file test on `sample_1.mp4` analyzed 33.18 seconds in 25.301 seconds after loading and flagged six of seven five-second windows at threshold 0.92. This is not a sustained streaming benchmark or a calibrated violence probability. No 2–3-second inference guarantee exists.
