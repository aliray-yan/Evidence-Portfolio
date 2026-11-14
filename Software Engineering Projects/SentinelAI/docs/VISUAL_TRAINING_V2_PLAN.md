# Follow-up experiment — 10 November 2026

The first frozen model passed Cornell screening, but failed SBU precision and
flagged all four stock controls, including both negatives. Its result is retained
in `evaluation/visual-training/screening-20261110.json`. Do not adjust its threshold
or describe another evaluation on those recordings as a fresh independent test.

Before fitting the next model:

1. Add selected **published non-transfer action intervals** from the consented,
   CC BY 4.0 CAP handheld detection public validation archive. This is an FYP
   adaptation experiment, not a CAP challenge result. Exclude throwing/catching,
   animal feeding and other actions not explicitly allowed by the importer.
2. Group CAP recordings by connected collector/subject identifiers. Keep an
   entire connected group in one partition; do not publish identifiers. Assign
   the single handshake source group to training to provide a relevant hard
   negative. Order remaining groups by SHA-256 with a fixed experiment seed; use
   60/20/20 training/development/test proportions. Reserve new CAP test actors.
3. Use eight consecutive samples at 4 Hz inside CAP's annotated intervals.
   Existing SBU/Cornell features remain identical to experiment 1; their shorter
   resampled training windows remain a documented limitation.
4. Freeze a randomly selected training frame across the entire eight-frame
   sequence for 25% of training examples and label these synthetic stationary
   sequences as no observed transfer. These teach that appearance alone is not
   temporal evidence. They are augmentation, not real negative recordings.
5. Keep the architecture, encoder, optimizer, seed and early stopping unchanged.
   Select the threshold on development only, averaging transfer F1 for the two
   datasets containing both classes and specificity for CAP's negative-only set.
   The fixed threshold grid remains unchanged. Never fit on external controls.
6. Report SBU/Cornell and stock results as **reused evaluations**, and CAP's
   reserved negatives as a new participant/collector-separated negative check.
   A negative-only collection cannot measure transfer recall. Preserve failed
   results and keep operational activation disabled unless screening succeeds.

CAP source: https://visym.github.io/cap/ and
https://registry.opendata.aws/visym-cap/ . Credit Jeffrey Byrne, Greg Castanon,
Zhongheng Li and Gil Ettinger, *Fine-grained Activities of People Worldwide*,
WACV 2023; Visym Labs. Verify the publisher's archive MD5 and record SHA-256.
Only local research storage is used. No audio, identity inference or new
bribery/currency claim is introduced. Physical Android testing remains postponed.

## Data inspection corrections before accepting a follow-up result

Two preparation attempts stopped because annotation windows extended beyond the
container, then because an unnecessarily strict frame-rate check excluded a
valid lower-frame-rate recording. The importer now records eight explicit,
distinct frame indexes, clamps intervals to source duration and leaves timing
margins. Neither stopped attempt produced fitted weights.

The first completed follow-up (`exchange-mnv3-gru-v2c-20261110`) was discarded:
visual inspection exposed ignored rotation metadata in 26 of 47 CAP recordings.
Its favorable negative-set result is not evidence of a valid upright detector.
The corrected run sets container auto-orientation explicitly and gives CAP rows
a new cache identity, leaving the earlier files intact. CAP's test set has now
also been inspected in the discarded run, so corrected results reuse that set.

The published CAP handshake interval lasts only 1.206 seconds. Upright frames
from 5.3–7.5 seconds of the source were reviewed before adding this short context
to **training only**, pinned to SHA-256
`5c013deb3aa35003c32b19ebcc15d7e34ab9a459e9fcac5d40868e72b3939998`.
The context shows hand contact and release without a visible object transfer.
No other short activity is silently padded or relabeled. The review sheet is
`.local/exchange-research/cap-handshake-context.jpg`.
