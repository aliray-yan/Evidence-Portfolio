# Blueprint Processing Pipeline

Everything in this document is Phase 11 work (with the editor it feeds
into being Phase 4/12). Nothing here is implemented yet; this is the
design it will follow.

## Stages

Implemented in Phase 11 as `backend/src/services/blueprint-processing/worker/analyze.py`,
invoked from Node via `HeuristicBlueprintAnalyzer`. Everything below reflects
what actually ships, including two things that only became obvious once
real test images went through the pipeline (see "Implementation notes"
after the stages).

**1. Ingestion & validation (Phase 3)**
MIME-type sniffing (not just trusting the file extension), a file-size
cap, filename sanitization, and storing under a generated ID rather than
the original filename — see Step 15 of the spec and `ARCHITECTURE.md`'s
"never trust client input" stance. This happens at upload time, before
analysis ever runs.

**2. Preprocessing**
- PDF pages are rasterized to images via `poppler-utils` (`pdftoppm`) —
  free, open-source, no paid PDF SDK.
- Images are normalized: grayscale, deskew (Hough-transform-based angle
  correction), denoise, contrast normalization. All via OpenCV.

**3. Geometric detection (OpenCV)**
Line/contour detection to find candidate walls, closed regions to find
candidate rooms, and shape heuristics (parallel short lines, arcs) for
doors and simple rectangles for windows. The plot boundary is the
outermost closed contour.

**4. OCR (Tesseract)**
Text regions are detected and passed to Tesseract to read dimension
labels (`12'-6"`, `3.5m`, `20 x 15`, etc.) and room names. Each label is
associated with the nearest detected wall or room by proximity.

**5. Vectorization / assembly**
Detected walls, rooms, and OCR labels are assembled into a `FloorPlan`
document (see `FLOORPLAN_SCHEMA.md`), with a per-element `confidence`
score so the editor can visually flag low-confidence guesses.

**6. Human verification (Phase 4/12) — mandatory**
The draft `FloorPlan` always lands in the editor, never directly in the
3D generator. The "Generate 3D Model" button stays disabled until
`POST /floor-plan/validate` (Phase 14) comes back clean. This is
non-negotiable per the spec's own emphasis on this step.

## Implementation notes (found by testing against a real image, not assumed)

- **OCR text needs phrase-grouping, not just word-by-word matching.**
  Tesseract returns "20" and "ft" as two separate word detections for a
  label reading "20 ft" — matching the dimension regex against each word
  individually never finds anything. The fix groups nearby words into
  phrases by horizontal proximity relative to text height, not by
  Tesseract's own line index alone — that index turned out to span
  clearly unrelated labels ("Living Room" and "Bedroom" on opposite sides
  of a test drawing shared one line index).
- **Detection thresholds need the image normalized to a consistent size
  first.** The exact same drawing, rasterized from a PDF at 150 DPI,
  produced a different wall count than the original PNG — the
  minLineLength/dedup-distance thresholds are tuned in pixel terms, so a
  different effective resolution changes how many pixels a real wall
  spans. Fixed by resizing to a standard working dimension before any
  detection runs, so the rest of the pipeline behaves consistently
  regardless of whether the source was a screenshot, a scan, or a
  rasterized PDF.

## The analyzer is one interface, not a hard-coded pipeline

```ts
interface FloorPlanDraft extends FloorPlan {
  metadata: FloorPlan['metadata'] & { confidence: number };
}

interface BlueprintAnalyzer {
  analyze(input: { imagePath: string; mimeType: string }): Promise<FloorPlanDraft>;
}
```

`HeuristicBlueprintAnalyzer` (this document's approach) is the v1
implementation. It runs as a small Python script (OpenCV + pytesseract)
invoked as a subprocess from the Node API — see `ARCHITECTURE.md` for why
Python here specifically, even though the API itself is Node. Swapping in
a different analyzer later (a better heuristic, or an optional paid
vision model) means writing a second implementation of the same
interface — nothing upstream or downstream changes.

## Validation checks (Phase 14, implemented)

Run against the current `FloorPlan` on demand:

- Disconnected or overlapping walls
- Rooms without a closed boundary
- Impossible dimensions (zero/negative length, thickness, or height)
- Doors/windows whose `wallId` doesn't exist, or whose `offset` + `width`
  overruns the wall
- Missing critical dimensions
- Plot boundary not closed

Each issue carries a human-readable message (matching the spec's own
examples, e.g. *"Bedroom 2 has no detected door."*) and, where
applicable, the element ID it applies to, so the editor can highlight it
directly.
