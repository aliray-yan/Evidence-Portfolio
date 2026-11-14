# Third experiment — 10 November 2026

Frozen before fitting: the upright second model detects both transfer controls
and rejects the conversation control, but still flags the handshake. It also
fails the existing SBU precision gate (three true positives, one false positive).
Do not move its threshold to hide either failure.

Add the publisher's 120 trimmed UT-Interaction recordings as training negatives
for **object transfer only**. The six published classes are handshake, pointing,
hugging, pushing, kicking and punching. Violence examples are still negatives
for transfer; the separate fight detector is unchanged. Source:
https://cvrc.ece.utexas.edu/SDHA2010/Human_Interaction.html . Credit M. S. Ryoo and
J. K. Aggarwal, UT-Interaction Dataset, ICPR SDHA 2010. Download the two segmented
ZIP files, validate CRC/size, retain SHA-256 receipts. Educational research only;
do not claim an open redistribution or commercial license.

Keep **all UT recordings in training**. The release does not establish actor
identities across sequences, so do not claim actor-independent validation from
a random split. Use one central eight-frame window at 4 Hz per sufficiently
long recording; exclude clips shorter than 1.9 seconds without padding. Retain
published action codes without guessing their numeric name mapping.

Resume the verified upright V2 inventory and its source/actor partitions. Add UT
with the same dataset/class balancing already used for SBU, Cornell and CAP.
Keep the encoder, GRU, optimizer, early stopping, static-negative fraction .25,
seed 42 and development threshold selection unchanged. UT introduces no new
development/test source. Existing SBU/Cornell/CAP and stock evaluations are
**reused**, not fresh independent estimates. No stock controls enter fitting.

Preserve every failed run. Apply the same activation gates. Even a pass is only
screening: additional independent, annotated cash/document/handshake recordings
and continuous-stream evaluation are still required before a reliability claim.
There is no currency, intent, audio or guilt inference and no invented boxes.
