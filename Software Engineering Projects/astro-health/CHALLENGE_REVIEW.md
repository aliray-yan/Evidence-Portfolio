# Astro Health: NASA Space Apps challenge review

Reviewed on October 13, 2026. Changes are in the supplied project folder.

## Verdict

**A relevant, working hackathon prototype for “Create Health Monitoring Software for Astronauts on Space Missions.”** Its strongest idea is a personal baseline with explainable deviations. The updated app now demonstrates a complete user workflow: simulated indicators and real self-reports → personal trend evaluation → recorded follow-up → an exportable mission report.

This is an assessment of fit and prototype quality, not an official judging score or a prediction of awards. Clinical validation and real sensor ingestion remain future work.

## What was verified online

The official [2026 challenge URL](https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/) returned a 502 error during this review. The official [Space Apps team page](https://www.spaceappschallenge.org/2026/find-a-team/space-labs/) exposes the matching challenge title and brief in indexed content: gather health indicators and enable astronauts to evaluate and act on their health during long missions. The linked [UAE local organizer challenge directory](https://nasaspaceapps.ae/challenges) corroborates the same brief and links to the official detail page.

The full objectives/resources tabs could not be inspected. Do not claim every detailed requirement has been checked. Recheck those tabs before submission.

The [official 2025 judging guidance](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf) is a useful reference for impact, creativity, validity, relevance, and presentation. It is not represented here as verified 2026 guidance.

## Assessment and improvements

| Area | Original gap | Improvement in this revision |
| --- | --- | --- |
| Gather | Only synthetic telemetry; little behavioral context | Daily self-reports for mood, energy, stress, sleep quality, and optional symptoms/context; saved in SQLite |
| Evaluate | Early radiation spike could escape detection; uncertainty underestimated a new reading | Include the last baseline dose when checking the first subsequent increment; include observation noise in the prediction band |
| Act | Suggested text with no record of the astronaut's response | Persistent awaiting-review, follow-up-planned, and reviewed states with notes; pending reviews stay visible after latest readings return to trend |
| Distance from Earth | Optional cloud explanations could be used implicitly | Local rule-based explanations by default; explicit opt-in for cloud summaries; deterministic demo actions |
| Communicate | No complete handoff artifact | Downloadable JSON report containing mission details, every reading, alerts and review notes, check-ins, provenance, and limitations |
| Scientific validity | Unsupported detector performance claims and unclear measurement assumptions | Clear descriptions of modeled bone density and experimental immune index; heuristic data mapping disclosed; no clinical accuracy claims |
| Usability | No direct wellbeing workflow or recovery action | Accessible score buttons, recent check-ins, report export, follow-up forms, source links, and connection retry |

## NASA data: accurate claims to make

- [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575): Inspiration4 blood serum metabolic and cytokine panels. The bundled processed statistics influence simulator noise through a heuristic mapping. They are not resting-heart-rate or daily bone-density observations.
- [OSD-656](https://osdr.nasa.gov/bio/repo/data/studies/OSD-656): Inspiration4 urine inflammation panel. Its bundled statistics inform noise on an experimental synthetic immune index; they do not validate that index or disease predictions.
- NASA's [Inspiration4 dataset overview](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/) and [OSDR spotlight](https://science.data.nasa.gov/blog/osdr-spotlight) establish the research context. Four crew members on a three-day mission cannot validate a long-duration astronaut forecast.
- NASA's [spaceflight hazards](https://www.nasa.gov/hrp/hazards/) explain the mission setting, including distance from Earth. Local processing reduces dependence on a cloud summary service; the app still needs its local frontend and backend running.
- NASA's [bone-change risk page](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/) supports the broad bone-loss range and describes before/after scans. The app's daily bone-density values are modeled examples.

The packaged project does not contain a reproducible raw-data extraction pipeline for its biomarker summary. Verify and document that processing before claiming independently reproduced NASA data analysis. Links and matching dataset titles alone do not verify the numerical summary.

## A clear two-minute demonstration

1. Start the frontend and backend. Keep optional cloud AI unchecked.
2. For a fresh demo, export any existing mission you want to keep, then create a new mission. A reset clears readings, check-ins, and follow-up notes.
3. Use **+7 days** to establish the baseline. Point out that readings are simulated and comparisons are personal.
4. Select **Cumulative Radiation Dose** and **Inject anomaly**. Open **Explain** in the alert log to see the local explanation and suggested protocol review.
5. Set **Follow-up planned**, enter “Verify dosimeter and review the approved shelter protocol,” and save. This logs a response; it does not medically clear the reading.
6. Save a crew check-in with a short workload or sleep note. Explain that this captures context sensors miss and is not a diagnostic questionnaire.
7. Export the mission report. Show how observations and follow-up travel together for a later medical review.

For an autonomous-monitoring demonstration, start monitoring and let the app pause on a new detector flag. Natural flags are stochastic; explicit injection gives predictable presentation timing.

## Validation

Seven isolated backend integration/regression tests pass: check-in validation/update/persistence, legacy database migration, predictive uncertainty, day-eight radiation detection, invalid review rejection, report/reset behavior, and simultaneous mission advances. Tests use temporary databases and do not reset the existing mission.

TypeScript checking and a production build pass. Local frontend checks confirm the dashboard responds successfully, local explanations work without cloud opt-in, reports include all five indicators and both integrated dataset citations, and malformed explanation requests are rejected. Browser accessibility inspection confirms the new controls are present; the desktop screenshot helper returned the wrong foreground window, so full visual and mobile verification remains incomplete.

These checks validate software workflows, not clinical performance, alarm sensitivity/specificity, or accuracy on astronaut telemetry.

## Next steps before submitting

Recheck the official challenge resources and 2026 submission/judging guide when accessible. Verify the bundled biomarker calculation against source tables and include a reproducible extraction method. Test the app with representative users, then prepare a public source/demo link and a concise pitch. A future sensor integration should include measurement provenance, timestamps, missing/stale-data handling, authentication, and consent. Sustained deterioration, clinical thresholds, and medical protocol content require separate expert validation.
