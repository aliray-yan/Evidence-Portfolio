# Completion work after the Kaggle import

Mobile testing resumed on 2 November 2026. Android CA installation, Wi-Fi reachability and a physical EN-02 file upload are confirmed. See ANDROID_QUICK_TEST.md for the remaining camera, interrupted-network and reviewer steps. Research validation is still outstanding.

**Software milestones below have been implemented and tested as of 2 November 2026.** Public pretrained inference is installed; the actual 50-recording research dataset, domain-trained custom classifiers and production deployment remain outstanding. Current scope and executed evidence are in [STATUS](../STATUS.md) and [VERIFICATION](VERIFICATION.md).

1. Install local speech, gesture and pose runtimes and public pretrained weights in a project-local environment. Pin downloaded artifacts with a provenance/checksum manifest; no automatic downloads during case processing.
2. Integrate real transcription, timestamped hand/pose observations, limited knife/scissors and scream/shattering candidates. Keep unsupported intent, money rubbing, firearm/weapon-use and identity explicitly unavailable. Fail configured components visibly and preserve encrypted sources for retry.
3. Improve Urdu-script phrase coverage and context handling without claiming a trained intent classifier. Add inference reports and honest missing-capability information to investigation and exports.
4. Add selective face-redaction review with restricted access, manual privacy approval before release, and conservative default playback. Add tested retention automation and backup/restore tools.
5. Build reproducible evaluation tools and a 50-scenario collection/annotation plan. Document custom-classifier data requirements; pretrained substitutes are not custom-trained PRD detectors. Never count authored scenarios as real model-quality measurements.
6. Run business-logic, authorization, media, inference and browser checks; update setup, measured results and outstanding limitations.
7. Install and integrate anonymous speaker diarization and local multilingual evidence search. Persist uncertain speaker turns, encrypted vectors and actual index progress; enforce case scope and retention, and return exact excerpts without generated answers. Add overlap-aware speaker-error and independent reviewer-agreement evaluation.

The next research deliverable is an authorized, independently annotated local-domain holdout. Follow [EVALUATION.md](EVALUATION.md), then run the installed models and inspect measured errors before collecting/training custom gesture or intent classifiers. More generic dataset downloads cannot establish Urdu/Punjabi police-domain quality. No further Kaggle output is required to exercise the implemented speaker/search/review workflows.

External dispatch needs a real service/account and an authorized destination. Real-domain accuracy, privacy quality and operational deployment cannot be established from software tests alone. Hardware body cameras, facial identity matching and city-wide CCTV are outside the FYP PRD scope.
