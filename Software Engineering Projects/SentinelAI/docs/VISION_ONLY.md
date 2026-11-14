# Vision-only exchange review — updated 7 November 2026

The supervisor's revised scope supersedes earlier speech and multimodal requirements. New uploads and live streams do **not** perform speech-to-text, Whisper, sound-event inference, speaker separation, phrase matching, conversation analysis or audio/video fusion. Camera capture requests video only; the server's permissions policy disables microphone access. Audio sent by an old streaming client is ignored. Previously recorded evidence and decisions remain historical records rather than being silently deleted. The legacy phrase library is read-only; archived research functions/tests are not application inference.

## Delivered behavior and limits

The installed YOLO26n COCO detector supplies person boxes; MediaPipe supplies hand landmarks. OpenCV proposes rectangular image regions touching a hand. A temporal tracker requires a stable first holder, two-person contact, then a stable second holder and movement over consecutive samples. Ambiguous hand ownership, missing objects, single frames, bare hand proximity and sampling gaps do not satisfy the rule. This is an **experimental heuristic**, not a trained bribery, handover or currency model. Clothing/background edges can look rectangular; documents and banknotes can look alike. Close-up hands without reliable person associations are often missed.

Every emitted exchange uses **Possible Bribery / Suspicious Visual Exchange – Pending Human Review**. `currency_identified` remains false. The displayed confidence is explicitly **heuristic temporal support**, not a calibrated probability: `min(0.90, 0.50 + 0.04 × retained consecutive samples)`. It is not YOLO confidence or a measured likelihood of wrongdoing. Upload review priority uses the versioned Ambiguous threshold when there is a visual concern; no concern leaves the case Unassessed. Intent and illegality are never inferred.

Both upload processing and the existing independent live-stream worker use this interface. Live findings carry original 90 kHz video RTP timestamps, source seconds, actual normalized boxes, model provenance and an encrypted snapshot from the final supporting frame. The viewer draws boxes only when the displayed frame's RTP matches. Earlier results remain timestamped late alerts with replay; they never label unrelated current frames. Replay starts at the preceding keyframe, and preservation maps the original finding onto the replay clock, including RTP wraparound. A later reanalysis cannot erase that preserved original finding.

Clear live snapshots/replay and preserved provenance are supervisor/admin-only and audited. Ordinary case derivatives remain silent and blurred; privacy approval is still required for the selective-face copy. Retention applies to stored findings and preserved cases. The detector does not dispatch emergency services.

## Actual stock-footage evaluation

Downloaded 5 November 2026 (cash, handshake, normal) and 7 November (document/envelope), with source pages, media URLs, sizes and SHA-256 checksums in `.local/visual-exchange-evaluation/*.source.json`. The individual Mixkit pages identified the **Stock Video Free License**; see [license](https://mixkit.co/license/#videoFree). Use is local educational evaluation, **not training**, operational police evidence, or an accusation about the performers. Source credit: **Video via Mixkit**. These files are ignored local assets, not bundled for redistribution.

| Local file | Source and observed content | Actual exchange result |
| --- | --- | --- |
| `cash.mp4` | [Hands of people during a money transaction](https://mixkit.co/free-stock-video/hands-of-people-during-a-money-transaction-18247/). Close-up visible banknote handover; no claim of bribery. | **Missed:** 0 findings / 13 sampled frames. Two hands detected in only one sample; no rectangular candidates survived. |
| `handshake.mp4` | [People hands giving a handshake on a white background](https://mixkit.co/free-stock-video/people-hands-giving-a-handshake-on-a-white-background-30017/). Several ordinary handshakes. | 0 findings / 19 samples. Person/hand coverage was insufficient, so this is **not evidence of successful handshake discrimination**. |
| `normal.mp4` | [A young couple engages in conversation](https://mixkit.co/free-stock-video/a-young-couple-engages-in-conversation-at-a-romantic-adorned-51638/). Seated ordinary interaction; audio not examined. | 0 findings / 32 samples; insufficient paired-person/hand coverage. No safety-clearance claim. |
| `document.mp4` | [Postman delivering envelopes to a person at home](https://mixkit.co/free-stock-video/postman-delivering-envelopes-to-a-person-at-home-31137/). Ordinary envelope handover after a signature; visually inspected contact sheet. | 0 findings / 20 samples. Two people in 14 samples and two hands in 12, but zero object proposals. The visible transfer was missed; no cash-vs-document discrimination claim. |

Observed wall times were 18.661, 5.746 and 29.285 seconds respectively, including decoding/seeking and first-call overhead. They were measured while other development work was running, **not a controlled latency benchmark**. The contact sheets were visually inspected; the raw installed-model output is `evaluation.json` in that directory. There is no demonstrated real-video positive detection in this evaluation. The baseline is not ready to claim reliable visual bribery detection.

The additional envelope control completed in **12.829 seconds** on 7 November; raw output is `evaluation-document.json`. This was a standalone actual-model execution after the sustained stream test, not a statistical performance benchmark. Its bytes and attribution were verified with the other three controls.

The compact measured results for all four controls are preserved in `evaluation/visual-controls/results-20261107.json`; source/checksum manifests sit beside it. Original detailed outputs and contact sheets remain in `.local/visual-exchange-evaluation/`.

An earlier [document handover by cottonbro studio on Pexels](https://www.pexels.com/video/a-person-handing-the-documents-to-a-client-5971457/) could not be downloaded (HTTP 403) and was **not tested**. The successfully downloaded Mixkit envelope video above provides the ordinary document/exchange control instead. Temporal unit tests also cover document-like transfers using explicit synthetic detector observations; those are logic tests, not accuracy results. Other Mixkit document examples had a restricted personal-use license and were not downloaded for this project.

## Setup and reproduction

Use the documented Python 3.11 project runtime. This workstation already contains the verified model files. On a fresh machine:

```powershell
python -m pip install -r requirements-vision.txt -r requirements-ai.txt -r requirements-exchange.txt
python -m backend.setup_models --download --only visual
python -m backend.setup_exchange --download
```

Restart the backend after model selection. An explicit `SENTINEL_EXCHANGE_MODEL` overrides the local selection; an empty value disables this component. `SENTINEL_GESTURE_MODEL` is also required. Runtime inference does not download missing weights. The official YOLO release checksum is verified before loading. See [YOLO details and licensing](YOLO_EVALUATION.md); its AGPL/commercial licensing still applies.

```powershell
python -m backend.evaluate_exchange --directory .local/visual-exchange-evaluation
# A new single control can be evaluated without replacing the earlier combined report:
python -m backend.evaluate_exchange --directory .local/visual-exchange-evaluation --clip document
python -m backend.verify_pipeline --video .local/visual-exchange-evaluation/cash.mp4
python -m pytest tests/test_visual_exchange.py tests/test_vision_only_pipeline.py tests/test_preserved_visual.py tests/test_streaming.py -o addopts= -q
npm.cmd test
```

The pipeline check uses a separate temporary database, actual installed models, protected media and audit verification. Injected test observations are explicitly labeled as such; they verify application wiring, not model accuracy.

The versioned attribution manifests are in `evaluation/visual-controls/`. `python -m backend.setup_visual_controls` verifies existing local downloads; add `--download` only to fetch missing controls from the recorded public sources. It checks the displayed license and expected checksum and stops on access or license failure. It does not fetch the blocked Pexels document clip. Copy a downloaded MP4 to your phone's Downloads folder, choose **Capture & upload → Choose existing video**, check the test-recording and consent boxes, and submit a neutral title such as “Stock cash transfer control”. Expect the documented possible miss; do not present the clip as actual bribery evidence.

## What additional training and footage are required

The existing Kaggle RWF R3D-18 bundle remains a fight/nonfight clip model. It does not supply exchange labels or action boxes. Stock COCO YOLO has no banknote or bribery class. The existing hand-landmark model is not an object-transfer classifier.

Reliable exchange detection needs an explicitly licensed/consented temporal collection with money handovers, document/license/receipt transfers, handshakes, object retrieval, change returned after a lawful purchase, occlusion, multiple people, distance and varied lighting. Annotate frame times, person/hand/object boxes, track identities and handover intervals. Label observable actions, **not guilt**. A lightweight custom object detector plus temporal transfer classifier can replace the proposal/rule interfaces; banknotes need local-currency examples and document controls. Keep actors/sessions/camera scenes separated between training, development and a locked test set; screen exact and near duplicates. Tune thresholds only on development data. Report event precision/recall, missed transfers, false alarms per hour and CPU/RAM/latency on the held-out set.

The new [visual training path](../training/EXCHANGE.md) has downloaded, attributed SBU, Cornell, CAP and UT data. SBU/Cornell use fixed participant-separated splits; CAP keeps connected collector/subject groups together; all UT data stays in training because actor identities across sequences are unspecified. Custom CPU training and external evaluation have now been executed: see [measured results](EXCHANGE_MODEL_EVALUATION.md). The first three learned candidates failed screening. The fourth native DINOv2/GRU now passes reused detection checks and three CPU runs and is selected for local review; see [current integration](LEARNED_EXCHANGE_INTEGRATION.md). Independent generalization remains unvalidated. This is object-transfer supervision, not cash or bribery supervision. The original heuristic results above remain unchanged. Actual Android continuous-stream testing is postponed at the user's request. No English-vs-Pakistani language performance claim applies to this vision-only module.

### Candidate research datasets checked 7 November 2026

The following source status supersedes the initial 7 November survey. None labels bribery or supplies a verified currency-vs-document classifier for this application.

- [Visym People in Public / PIP-175k](https://visym.github.io/collector/pip_175k/) includes person-to-person transfer and handshake activities, with consented participants and a CC BY 4.0 license. The published archive is 54.02 GB. Its actor-centered labels do not supply all required hand/object boxes; new annotations and source-separated splits would still be needed. This is the most directly relevant candidate for learning observable transfer versus ordinary interaction. It has **not** been downloaded or trained here.
- [Cornell bimanual handover dataset](https://zenodo.org/records/7767535): the record's API confirmed CC BY 4.0. Downloaded the 720 RGB camera videos, phase CSVs and readme using bounded ZIP range requests; depth data was not downloaded. Forty-three unreadable videos are excluded with recorded reasons. Credit Alap Kshirsagar, Raphael Fortuna, Zhiming Xie and Guy Hoffman. This is controlled-laboratory object-transfer data, not policing or cash data.
- [SBU Kinect Interaction v2 clean subset](http://vision.cs.stonybrook.edu/~kiwon/Datasets/SBU_Kinect_Interactions/README.txt): downloaded nine participant pairs wholly inside the frozen training/development/test partitions. Research-only terms; credit Kiwon Yun, Jean Honorio, Debaleena Chattopadhyay, Tamara L. Berg and Dimitris Samaras. Class 07 is exchange and class 05 is handshake, checked visually. The publisher supplies HTTP links; local checksums record received data, not authenticated publisher checksums.
- [NTU RGB+D / RGB+D 120](https://rose1.ntu.edu.sg/dataset/actionRecognition/) includes giving objects, shaking hands and exchanging things. Its RGB archives are large (136 GB for the original plus 124 GB for the extension), and access requires researcher registration and approval under academic-use terms. It is not an unrestricted redistribution source. Not downloaded.

The [training protocol](VISUAL_TRAINING_PLAN.md) fixes observable labels, participant splits and development-only selection. The small temporal head trains locally on CPU; another Kaggle run is not required for this experiment. Reusing the fight notebook with renamed classes would not establish a valid transfer/currency model. Local cash/document recordings, continuous-video evaluation and currency recognition remain distinct requirements.
