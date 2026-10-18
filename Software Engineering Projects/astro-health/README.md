# Astro Health — Mission Monitor

A personal-baseline health dashboard for long-duration astronauts. Built for the **NASA Space Apps Challenge 2026**.

Five indicators are simulated against a running mission clock, compared to a personal baseline, and screened with a trend detector plus Isolation Forest. Local rules explain flags by default; cloud AI summaries are optional. Two NASA OSDR Inspiration4 datasets influence simulator noise through a heuristic mapping. Broad hazards and selected trend rates are research-informed; daily noise, anomaly magnitudes, and the immune index are demonstration assumptions.

The app also saves daily crew wellbeing check-ins, records alert follow-up, and exports a complete mission report. See [CHALLENGE_REVIEW.md](CHALLENGE_REVIEW.md) for the challenge assessment, verified sources, limitations, and demo walkthrough.

> **This is simulated telemetry**, clearly labeled as such everywhere in the UI. No real biosensor feed exists for this app — see [Data sources](#data-sources-what-is-real-and-what-isnt) for exactly what *is* real and how it's used.

---

## Quick start

You need two terminals — a Python backend and a Next.js frontend.

**1. Backend (FastAPI)** — needs Python 3.11 or 3.12 (very new Python versions may not have prebuilt wheels for scikit-learn/numpy yet, which makes `pip install` try to compile from source and fail)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Using `python -m uvicorn` (rather than a bare `uvicorn` command) makes sure it runs through the same Python your venv just activated, rather than a different `uvicorn` that happens to be earlier on your system PATH.

**2. Frontend (Next.js)**
```bash
cp .env.example .env.local      # then optionally add OPENROUTER_API_KEY (see below)
npm install
npm run dev
```

Open **http://localhost:3000**. Click **Start monitoring** — the system advances itself a day at a time, establishes its 7-day personal baseline, and pauses on its own the moment it has something to explain (see [Live monitoring](#live-monitoring) below). For precise demo timing, pause it and use **Inject anomaly** instead.

The explanation panel uses local rules by default. For optional cloud summaries, configure `OPENROUTER_API_KEY` and enable the dashboard's cloud AI checkbox. Flagged synthetic readings are then sent to OpenRouter; check-in notes are not included. If the service fails or times out, the app falls back to local rules. Suggested demo actions remain deterministic. No internet connection is needed for local simulation, detection, check-ins, follow-up, or reports after installation, but both local services must remain running. This is not a browser-only offline/PWA application.

### Windows: using the project environment

From the project folder, if an environment has not been created yet:

```powershell
python -m venv backend/venv
backend/venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Start the backend from the project folder:

```powershell
backend/venv/Scripts/python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In a second terminal, run `npm.cmd run dev` and open http://localhost:3000. The Python environment must match your Python version; do not reuse binary packages copied from a different Python installation.

### Crew check-ins and follow-up

Pause monitoring to enter a check-in for the current mission day. Mood, energy, stress, and sleep quality use subjective 1–5 scales; higher stress means more stress. These scores are context, not clinical assessments. One saved entry per day can be updated.

Open an alert explanation to save a review state and optional action note. Reviewed flags remain in the log and report; reviewing is not a medical clearance. Pending review or follow-up remains visible even when current readings return to their modeled trend.

**Export mission report** downloads JSON with mission details, all readings, alert review notes, check-ins, data provenance, and limitations. It contains any notes you entered. Export first before starting a new mission, which clears those records.

---

## What's actually being measured

Five indicators, each a NASA-documented spaceflight hazard, each with its own personal baseline and detector:

| Indicator | Hazard (NASA's Five Hazards framework) | What it models |
|---|---|---|
| **Bone Mineral Density** | Altered Gravity | Weight-bearing (hip/spine) BMD loss, ~1–1.5%/month |
| **Cardiovascular (resting HR)** | Altered Gravity | Cardiovascular deconditioning, orthostatic-intolerance-style spikes |
| **Sleep duration & quality** | Isolation/Confinement | NASA schedules 8.5h; astronauts average ~6–6.5h in flight |
| **Radiation dose (cumulative)** | Space Radiation | ISS-rate dose accumulation vs. NASA's 600 mSv career limit |
| **Immune Dysregulation Index** | Hostile/Closed Environment | Composite inflammatory signal — T-/NK-cell suppression, latent-virus reactivation risk |

Every rate is cited inline in the dashboard (`reference_note` on each indicator card) and in `backend/config.py`:
- Bone density: NASA bone-loss research; Lang et al., *J. Bone Miner. Res.* 2004; LeBlanc et al.
- Cardiovascular: Hughson et al., *J. Appl. Physiol.* 2012 (post-flight HR rise); orthostatic-intolerance literature
- Sleep: Barger et al., *Lancet Neurology* 2014; NASA OCHMO sleep brief
- Radiation: NASA radiation program technical briefs; ISS dose-rate literature; NASA's 600 mSv career limit
- Immune: Crucian et al., *Frontiers in Immunology* 2018; Mehta et al. 2013 (cytokine surges with viral reactivation)

The immune indicator is an experimental synthetic 0–100 index. OSD-656 biomarker variability influences its noise; it is not a validated assay, immune-function measurement, or disease-risk predictor. Bone-density readings are modeled trajectories, not daily wearable measurements. No real sensor is connected.

---

## Live monitoring

**Start monitoring** is the point of this app, not a convenience button. Nobody types in a heart rate anywhere in this system — the simulator generates every reading automatically, standing in for a real wearable/sensor feed the way a deployed version would eventually have one. Live mode makes that visible: toggle it on and the dashboard advances itself (one simulated day roughly every 1.8s client-side), the way a continuously-running monitor would, with no further clicks.

It stops itself, too. Each tick checks whether anything new got flagged; the instant it does, monitoring auto-pauses and the explanation panel opens on its own. That loop — watch, notice, explain, without a human driving each step — is the actual "automatic monitoring" story, not a detail buried in the architecture. The manual **+1 day** / **+7 days** / **Inject anomaly** controls stay available (disabled while live, so there's no ambiguity about which mode is driving) for setting up a specific moment precisely, e.g. for a demo recording.

---

## Data sources — what is real, and what isn't

**The simulator's day-to-day *trend rates* come from the published literature above — Inspiration4 was a 3-day mission, so it cannot supply a long-duration trend shape.** What real clinical panels on four real people *can* supply is real **inter-individual variability**: some people's biochemistry naturally swings more than others. Selecting a "data profile" (Crew A–D) in the mission-setup panel calibrates the simulator's day-to-day noise to a real crew member's own preflight variability — it does not mean the simulated 200-day trajectory *is* that person's real data. This distinction is documented in the app itself (the collapsible **Data sources** panel on the dashboard) as well as here.

### Numerically integrated

| Dataset | Title | Used for |
|---|---|---|
| **LSDS-8 / OSD-575** ([DOI](https://doi.org/10.26030/mc5d-p710)) | SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays | Bone density & cardio noise calibration (calcium, ALP, CRP, fibrinogen, haptoglobin) |
| **LSDS-64 / OSD-656** ([DOI](https://doi.org/10.26030/7cax-yj10)) | SpaceX Inspiration4 Urine Inflammation Panel (Multiplex, NULISAseq) | Immune-risk noise calibration (IL-6, TNF-α, IL-1β, IFN-γ) |

Processing: `backend/data_profiles.py` loads `backend/data/i4_biomarkers.json` (pre-computed per-subject preflight mean/SD for each marker, plus the real observed preflight→immediate-postflight % change), computes each subject's coefficient of variation per indicator, and turns it into a noise-scale multiplier, clamped to 0.65×–1.6× so one small real sample can't push the simulator to implausible extremes.

### Reviewed, not numerically integrated

- **OSD-687** — SpaceX Inspiration4 T-Cell Histone Modification Profiling (H3K4me1/H3K4me3/H3K27ac). Single crew member, single timepoint (R+194) — epigenomic proof-of-concept data with no cross-subject variability or trend to calibrate against.

### Related studies in the same mission's data family, not obtained

You mentioned wanting **OSD-573** (Dragon capsule metagenomic/metatranscriptomic swabs) and **OSD-630** (stool metagenome profiling) but couldn't — both are reported at 100GB+, impractical to download for this build. For completeness, the full related family (all from the same Inspiration4 biospecimen collection):

| Dataset | Title |
|---|---|
| OSD-573 | Dragon Capsule Metagenomic and Metatranscriptomic Microbial Swabs |
| OSD-630 | Stool Metagenome Profiling |
| OSD-572 | Oral, Nasal, and Skin Metagenomic and Metatranscriptomic Microbial Swabs |
| OSD-570 | PBMC Profiling (snRNA-seq, snATAC-seq, TCR/BCR repertoire) |
| OSD-571 | Plasma Profiling (Proteomics, EVs, Metabolomics, cfDNA/cfRNA-seq) |
| OSD-569 | Whole Blood Measurements (RNA-seq, epitranscriptome, WGS, CBC) |
| OSD-574 | Deltoid Skin and Microbiome Data (Spatial Transcriptomics, Metagenomics) |

All are raw sequencing/omics datasets requiring dedicated bioinformatics pipelines, not simple tabular vitals — outside this MVP's scope even where size wasn't a blocker. This full list is also queryable live via `GET /api/data-provenance` and rendered in the dashboard's **Data sources** panel, so it travels with the app rather than sitting only in this file.

---

## How the detection actually works

`backend/anomaly.py`, in three layers:

1. **Personal baseline.** Once an indicator has 7 days of readings, fit a line through them (mission day → value). This is the astronaut's *own* trend — a fast bone-loser's "normal" looks different from a slow one's.

2. **Early predictive uncertainty.** A seven-point trend has uncertainty. The fallback uses `residual_sd × √(1 + 1/n + (day − daȳ)² / Sxx)` to include both observation noise and fitted-trend uncertainty. This is a heuristic detection band using a simulator-informed noise floor, not a clinically validated confidence interval.

3. **Detection.** With fewer than ten post-baseline observations, use a three-standard-deviation fallback. With more history, locally detrend a trailing 30-day window and score the latest residual with `IsolationForest`. Its configured training contamination is 0.03; this is not a measured false-positive rate or clinical accuracy. Radiation is evaluated on daily increments, including the increment immediately after baseline day seven. Later chart bands approximate local variation; they do not exactly reproduce the Isolation Forest decision boundary.

Statistical normality does not imply health: sustained deterioration can be learned as a trend and missed. The detector has not been validated against clinical astronaut outcomes. Scripted anomaly tests are software checks and cannot establish medical sensitivity or specificity.

---

## Architecture

```
Browser
  │
  ▼
Next.js (app/) ── thin proxy layer (app/api/**) ──▶ FastAPI (backend/)
  │                                                        │
  └── app/api/explain/route.ts ──▶ OpenRouter              ├── simulator.py   (mission-day generator)
      (Vercel AI SDK, direct — not proxied)                ├── anomaly.py     (baseline + detection, above)
                                                            ├── data_profiles.py (real-data calibration)
                                                            └── database.py    (SQLite)
```

- **Why a proxy layer for everything except `/api/explain`?** Keeps `BACKEND_URL` server-side only — the browser only ever talks to the Next.js origin, so CORS never enters the picture even with two dev servers on different ports. `/api/explain` is the one route that isn't a proxy: it's a genuine Next.js server route calling OpenRouter directly via the Vercel AI SDK, since that's specifically where an LLM call belongs in this stack, not in the Python backend.
- **Why SQLite, not Postgres?** One astronaut, one mission, a demo tool — no need for the operational overhead.
- **Where would real sensors plug in?** Detection reads from one ingestion point — `simulator.generate_day_reading()` / `generate_cumulative_step()`, called once per indicator per day in `main.py`. A real wearable or flight-medical feed would fill that same point with a real value instead of a generated one; `anomaly.py` and everything downstream (baseline, detection, the dashboard, the explanation panel) wouldn't change at all. Real device/API integration is deliberately not built here — a hackathon team has no real astronaut biosensor to integrate with, and building toward one would be complexity with nothing real on the other end. The architecture just doesn't make that harder later.
  ```
  [ simulator (today) ]  →┐
  [ real sensor feed  ]  →┼→  one reading per indicator/day  →  anomaly.py  →  dashboard
  [ manual override   ]  →┘        (same shape either way)      (unchanged)    (unchanged)
  ```
- **Full file layout:**
  ```
  app/
    page.tsx                     dashboard — owns all data fetching/state
    components/                  IndicatorCard, TrendChart, MissionControls,
                                  ExplanationPanel, DataProvenance, FlagBadge
    api/                         proxy routes + the explain route
  lib/
    types.ts                     TS types mirroring backend/models.py
    backend.ts                   shared server-side fetch helper
    indicators.ts                per-indicator icon/color (presentation only —
                                  business meaning always comes from the API)
  backend/
    main.py                      FastAPI routes
    simulator.py                 mission-day reading generator
    anomaly.py                   detection (see above)
    data_profiles.py             real-dataset noise calibration
    config.py                    all 5 indicators' rates, citations, anomaly
                                  magnitudes — the single source of truth
    database.py                  SQLite schema + queries
    data/i4_biomarkers.json      processed real OSDR stats (source data itself
                                  isn't redistributed here — see citations above)
  ```

---

## Known limitations

- **No validated false-positive rate or clinical sensitivity.** Isolation Forest contamination is a training parameter. Local trend adaptation can miss sustained deterioration.
- **Cloud summaries are optional and unvalidated.** The model can misinterpret synthetic data. Local rules are the default and retain control of suggested demo actions.
- **Single-astronaut-at-a-time**, matching the PRD's core "MY vitals" user story. A multi-crew ground-support view is a natural extension, not built here.
- **Immune Dysregulation Index is a composite, not a named clinical assay** — labeled that way throughout (see its `description` field) precisely so it isn't mistaken for a single lab value.

---

## Environment variables

See `.env.example`. `BACKEND_URL` (default `http://localhost:8000`) and optionally `OPENROUTER_API_KEY` for live AI explanations.

## Verification

```powershell
npm.cmd run build
backend/venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Push-Location backend
venv/Scripts/python.exe -m unittest -v test_mission.py
Pop-Location
```

The seven tests use temporary databases, including migration of an older schema. They cover check-in updates and validation, alert review, report/reset consistency, concurrent advances, predictive uncertainty, and the first post-baseline radiation spike. They do not erase your current mission or establish clinical accuracy.
