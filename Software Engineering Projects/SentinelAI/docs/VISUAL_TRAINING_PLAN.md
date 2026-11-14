# Visual-exchange training — 8 November 2026

Physical Android streaming retesting is postponed at the user's request. This
work targets the missed cash/envelope exchanges; the existing violence model,
review permissions and stream presentation timestamps remain unchanged.

1. Download a bounded, attributed research collection. SBU supplies transfer,
   handshake and other interactions in one setting. Cornell supplies timed
   handover phases and different objects/participants. Do not use the four
   previously tested stock videos for training or threshold selection.
2. Fix splits before model training. SBU: train participants 01/02/07,
   development 03/05, test 04/06; discard pairs crossing those partitions.
   Cornell: first eight participant pairs train, next two development, last two
   test. Both views and both directions of a pair remain together. Exclude
   corrupt, missing, duplicate and invalidly timed records with recorded reasons.
3. Train a small temporal classifier over pretrained RGB image features. Cache
   features on disk and train the temporal head on the CPU. No speech, skeleton
   sensor input or audio is permitted in the classifier; published phase labels
   are supervision only. Preserve ordered frames, source hashes and timings.
4. Select the model and operating threshold using development only. Evaluate
   once on the locked test set, then run the four external stock controls. Report
   transfer recall, precision, per-negative-class false alarms, sample counts and
   observed CPU time. Laboratory test accuracy does not establish field accuracy.
5. Integrate a validated bundle through the existing upload/live interface only
   if the evaluation supports it. Unsupported boxes/currency identity stay
   absent. No automatic promotion based solely on training loss or a unit test.

SBU source: http://vision.cs.stonybrook.edu/~kiwon/Datasets/SBU_Kinect_Interactions/README.txt
Research-only terms; cite Kiwon Yun, Jean Honorio, Debaleena Chattopadhyay,
Tamara L. Berg and Dimitris Samaras, HAU3D-CVPRW 2012. The publisher serves the
archives over HTTP; local hashes record the received bytes, not authenticated
publisher checksums. Files are treated as data, never executed.

Cornell source: https://zenodo.org/records/7767535
CC BY 4.0, confirmed from the record's API. Credit Alap Kshirsagar, Raphael
Fortuna, Zhiming Xie and Guy Hoffman. Only RGB MP4s, phase CSVs and the readme
are selected; byte-range ZIP retrieval avoids the multi-gigabyte depth data.

SBU class mapping was checked visually against the downloaded s01s02 examples:
01 approach, 02 depart, 03 kick, 04 push, 05 handshake, 06 hug, 07 exchange,
08 punch. Incorrectly assuming alphabetic/action-list order would swap the
training labels. The contact sheet is `.local/exchange-research/sbu-classes.jpg`.

Neither dataset labels money or bribery. A successful object-transfer detector
still cannot distinguish a lawful payment, a document handover and a bribe.
All findings remain **Possible Bribery / Suspicious Visual Exchange – Pending
Human Review**; currency identification must remain false unless separately
validated. Missing signals must never become a safety clearance.
