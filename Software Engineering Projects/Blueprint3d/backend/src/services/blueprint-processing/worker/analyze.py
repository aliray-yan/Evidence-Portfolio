#!/usr/bin/env python3
"""
Blueprint analysis worker for Blueprint3D (Phase 11).

Reads a rasterized blueprint image and prints a draft FloorPlan document
(matching docs/FLOORPLAN_SCHEMA.md) to stdout as JSON. This is a heuristic
pipeline, not a guaranteed-correct one -- see docs/BLUEPRINT_PIPELINE.md.
Its output is meant to be reviewed and corrected in the floor-plan editor,
never trusted blindly; that review step is mandatory by design, not a
workaround for this script's limitations.

Known, deliberate limitations of this v1:
  - Detects walls, room boundaries, and a best-effort room name per room.
    Does NOT attempt door/window detection -- reliably distinguishing a
    door-swing arc or window symbol from a wall line, across arbitrary
    blueprint drawing styles, is a meaningfully harder problem than wall/
    room detection, and a wrong guess here is worse than none: the editor
    already has one-click "+ Door"/"+ Window" buttons for a selected wall.
  - Scale calibration depends on finding a readable dimension label near
    the longest detected wall. When that fails, it falls back to assuming
    the drawing's longer side is about 12m, and flags the result with a
    low confidence score -- the absolute dimensions will likely need
    correcting in the editor, though relative proportions should be closer.

Usage: analyze.py <image_path>
"""
import json
import re
import sys
import uuid
import argparse
import os
import shutil

# Tesseract is often installed outside PATH on Windows.
tesseract_binary = os.environ.get("TESSERACT_BIN") or shutil.which("tesseract")
if not tesseract_binary and os.name == "nt":
    candidate = os.path.join(os.environ.get("ProgramFiles", "C:/Program Files"), "Tesseract-OCR", "tesseract.exe")
    if os.path.isfile(candidate):
        tesseract_binary = candidate

import cv2
import numpy as np
import pytesseract

if tesseract_binary:
    pytesseract.pytesseract.tesseract_cmd = tesseract_binary

ROOM_NAME_KEYWORDS = [
    "bedroom", "living", "kitchen", "bathroom", "dining", "garage",
    "hall", "closet", "office", "laundry", "master", "study", "foyer",
]

# Matches "12'-6"", "12'", or "3.5m" / "20 ft" / "150cm" style labels.
DIMENSION_PATTERN = re.compile(
    r"(\d+)\s*'\s*-?\s*(\d+)?\s*\"?|(\d+(?:\.\d+)?)\s*(m|ft|cm|in)\b",
    re.IGNORECASE,
)

FALLBACK_SPAN_METERS = 12.0


TARGET_MAX_DIMENSION = 1400


def load_grayscale(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def normalize_size(gray):
    """Every detection threshold below (minLineLength, dedup distance, etc.)
    is tuned in pixel terms for roughly this working size. Without this, a
    blueprint rasterized at a different effective DPI -- a PDF at 150 DPI
    vs. a phone photo vs. a small screenshot -- changes how many pixels an
    actual wall spans, and the same thresholds start either merging
    distinct walls or failing to merge duplicate detections of the same
    one. Normalizing first makes the rest of the pipeline behave
    consistently regardless of the input's original resolution."""
    height, width = gray.shape
    scale = TARGET_MAX_DIMENSION / max(height, width)
    if abs(scale - 1.0) < 0.05:
        return gray
    new_size = (int(width * scale), int(height * scale))
    interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    return cv2.resize(gray, new_size, interpolation=interpolation)


def deskew(gray):
    """Estimate rotation from the dominant near-axis-aligned Hough line
    angle and correct for it. Returns (corrected_image, angle_degrees)."""
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=150)
    if lines is None:
        return gray, 0.0

    angles = []
    for line in lines[:50]:
        _, theta = line[0]
        angle_deg = (theta * 180 / np.pi) - 90
        normalized = angle_deg % 90
        if normalized > 45:
            normalized -= 90
        if abs(normalized) < 20:
            angles.append(normalized)

    if not angles:
        return gray, 0.0

    correction = float(np.median(angles))
    height, width = gray.shape
    matrix = cv2.getRotationMatrix2D((width // 2, height // 2), correction, 1.0)
    rotated = cv2.warpAffine(
        gray, matrix, (width, height), flags=cv2.INTER_CUBIC, borderValue=255
    )
    return rotated, correction


def detect_wall_segments(gray):
    """Probabilistic Hough transform for straight line segments, snapped to
    axis-aligned where close (most architectural walls are), then
    deduplicated."""
    binary = (gray < 110).astype(np.uint8) * 255
    # Remove isolated text strokes before finding architectural lines.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
    cleaned = np.zeros_like(binary)
    minimum_area = max(150, gray.size * 0.00025)
    for component in range(1, count):
        if stats[component, cv2.CC_STAT_AREA] >= minimum_area:
            cleaned[labels == component] = 255
    edges = cv2.Canny(cleaned, 50, 150)
    raw_lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=60,
        minLineLength=max(60, max(gray.shape) * .055), maxLineGap=12
    )
    if raw_lines is None:
        return []

    segments = []
    for line in raw_lines:
        x1, y1, x2, y2 = (float(v) for v in line[0])
        length = float(np.hypot(x2 - x1, y2 - y1))
        if length < 25:
            continue

        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(angle % 90) < 8 or abs(angle % 90 - 90) < 8:
            snapped = round(angle / 90) * 90
            mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
            rad = np.radians(snapped)
            dx, dy = np.cos(rad) * length / 2, np.sin(rad) * length / 2
            x1, y1, x2, y2 = mid_x - dx, mid_y - dy, mid_x + dx, mid_y + dy

        segments.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "length": length})

    return deduplicate_segments(segments)


def deduplicate_segments(segments, distance_threshold=15, angle_threshold=6):
    """Non-max suppression: Hough transforms commonly find the same wall
    edge several times over. Keep the longest detection in each cluster of
    near-duplicates rather than trying to merge them into one longer line."""
    ordered = sorted(segments, key=lambda s: -s["length"])
    kept = []

    for seg in ordered:
        angle = np.degrees(np.arctan2(seg["y2"] - seg["y1"], seg["x2"] - seg["x1"]))
        mid = ((seg["x1"] + seg["x2"]) / 2, (seg["y1"] + seg["y2"]) / 2)

        duplicate = False
        for k in kept:
            k_angle = np.degrees(np.arctan2(k["y2"] - k["y1"], k["x2"] - k["x1"]))
            angle_diff = abs(((angle - k_angle) + 90) % 180 - 90)
            if angle_diff > angle_threshold:
                continue
            k_mid = ((k["x1"] + k["x2"]) / 2, (k["y1"] + k["y2"]) / 2)
            if np.hypot(mid[0] - k_mid[0], mid[1] - k_mid[1]) < distance_threshold:
                duplicate = True
                break

        if not duplicate:
            seg["confidence"] = 0.75
            kept.append(seg)

    return kept


def detect_rooms(gray):
    """Closed regions -> room candidates, via contour detection. Filters out
    both tiny noise and anything close to the full image (the outer plot
    boundary, not an individual room)."""
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 10
    )
    closed = cv2.morphologyEx(
        binary, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2
    )
    contours, hierarchy = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return []

    image_area = gray.shape[0] * gray.shape[1]
    rooms = []

    for contour_index, contour in enumerate(contours):
        # Only holes enclosed by a wall contour represent rooms.
        if hierarchy[0][contour_index][3] < 0:
            continue
        area = cv2.contourArea(contour)
        if area < image_area * 0.01 or area > image_area * 0.6:
            continue

        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) < 4:
            continue

        boundary = [{"x": float(p[0][0]), "y": float(p[0][1])} for p in approx]
        rooms.append({"boundary": boundary, "confidence": 0.45})

    return rooms


def detect_text(gray):
    """Groups Tesseract's word-level detections into phrases by proximity,
    not just Tesseract's own line index -- that index can span unrelated
    labels that just happen to sit in the same horizontal band (seen on the
    very first test image: "Living Room" and "Bedroom" shared a line
    index despite being on opposite sides of the drawing). A small gap
    relative to text height means "same label"; a large one doesn't."""
    data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)

    words = []
    for i, text in enumerate(data["text"]):
        text = text.strip()
        if not text or int(data["conf"][i]) < 40:
            continue
        words.append({
            "text": text,
            "left": data["left"][i],
            "right": data["left"][i] + data["width"][i],
            "top": data["top"][i],
            "height": data["height"][i],
            "line_key": (data["block_num"][i], data["par_num"][i], data["line_num"][i]),
        })
    words.sort(key=lambda w: (w["line_key"], w["left"]))

    phrases = []
    current = None
    for word in words:
        close_enough = (
            current is not None
            and word["line_key"] == current["line_key"]
            and (word["left"] - current["right"]) < current["height"] * 4
        )
        if close_enough:
            current["words"].append(word["text"])
            current["right"] = word["right"]
            current["xs"].append((word["left"] + word["right"]) / 2)
            current["ys"].append(word["top"] + word["height"] / 2)
        else:
            if current is not None:
                phrases.append(current)
            current = {
                "words": [word["text"]],
                "right": word["right"],
                "height": word["height"],
                "line_key": word["line_key"],
                "xs": [(word["left"] + word["right"]) / 2],
                "ys": [word["top"] + word["height"] / 2],
            }
    if current is not None:
        phrases.append(current)

    return [
        {"text": " ".join(p["words"]), "x": sum(p["xs"]) / len(p["xs"]), "y": sum(p["ys"]) / len(p["ys"])}
        for p in phrases
    ]


def parse_dimension_to_meters(match):
    feet, inches, number, unit = match.groups()
    if feet is not None:
        total_feet = float(feet) + (float(inches) / 12 if inches else 0.0)
        return total_feet * 0.3048
    if number is not None:
        value = float(number)
        per_unit = {"m": 1.0, "cm": 0.01, "ft": 0.3048, "in": 0.0254}
        return value * per_unit.get((unit or "m").lower(), 1.0)
    return None


def find_scale(texts, wall_segments):
    """Calibrate pixels-per-meter from a dimension label near the longest
    wall. Returns (pixels_per_meter, confidence)."""
    if not wall_segments:
        return None, 0.0

    xs = [s[k] for s in wall_segments for k in ("x1", "x2")]
    ys = [s[k] for s in wall_segments for k in ("y1", "y2")]
    left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)
    candidates = []
    for text in texts:
        # Internal room sizes must not be mistaken for the total house span.
        match = DIMENSION_PATTERN.fullmatch(text["text"].strip())
        if not match:
            continue
        meters = parse_dimension_to_meters(match)
        if not meters or meters <= 0:
            continue
        if (text["y"] < top or text["y"] > bottom) and left <= text["x"] <= right:
            candidates.append((abs(text["x"] - (left + right) / 2) + min(abs(text["y"] - top), abs(text["y"] - bottom)), (right - left) / meters))
        elif (text["x"] < left or text["x"] > right) and top <= text["y"] <= bottom:
            candidates.append((abs(text["y"] - (top + bottom) / 2) + min(abs(text["x"] - left), abs(text["x"] - right)), (bottom - top) / meters))
    if not candidates:
        return None, 0.0
    candidates.sort()
    return candidates[0][1], 0.55


def point_in_polygon(x, y, boundary):
    inside = False
    j = len(boundary) - 1
    for i, point in enumerate(boundary):
        xi, yi = point["x"], point["y"]
        xj, yj = boundary[j]["x"], boundary[j]["y"]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def name_room(boundary, texts, index):
    inside = [t for t in texts if point_in_polygon(t["x"], t["y"], boundary)]
    for t in inside:
        if any(keyword in t["text"].lower() for keyword in ROOM_NAME_KEYWORDS):
            return t["text"].title()
    if inside:
        return inside[0]["text"].title()
    return f"Room {index + 1}"


def to_meters(value, pixels_per_meter):
    return round(value / pixels_per_meter, 3)


def assemble_floor_plan(wall_segments, rooms, texts, pixels_per_meter, confidence, shape):
    walls = [
        {
            "id": str(uuid.uuid4()),
            "start": {"x": to_meters(seg["x1"], pixels_per_meter), "y": to_meters(seg["y1"], pixels_per_meter)},
            "end": {"x": to_meters(seg["x2"], pixels_per_meter), "y": to_meters(seg["y2"], pixels_per_meter)},
            "thickness": 0.2,
            "height": 2.7,
            "type": "interior",
        }
        for seg in wall_segments
    ]

    room_objs = [
        {
            "id": str(uuid.uuid4()),
            "name": name_room(room["boundary"], texts, i),
            "boundary": [
                {"x": to_meters(p["x"], pixels_per_meter), "y": to_meters(p["y"], pixels_per_meter)}
                for p in room["boundary"]
            ],
        }
        for i, room in enumerate(rooms)
    ]

    all_points = [p for wall in walls for p in (wall["start"], wall["end"])]
    all_points.extend(p for room in room_objs for p in room["boundary"])
    if all_points:
        origin_x = min(p["x"] for p in all_points)
        origin_y = min(p["y"] for p in all_points)
        width = max(p["x"] for p in all_points) - origin_x
        length = max(p["y"] for p in all_points) - origin_y
        # Match the coordinates to the same cropped extent used by the plot.
        for point in all_points:
            point["x"] = round(point["x"] - origin_x, 3)
            point["y"] = round(point["y"] - origin_y, 3)
        plot = {"width": round(width, 3), "length": round(length, 3)}
        for wall in walls:
            a, b = wall["start"], wall["end"]
            at_edge = (abs(a["x"] - b["x"]) < .05 and min(a["x"], abs(a["x"] - width)) < .15) or (abs(a["y"] - b["y"]) < .05 and min(a["y"], abs(a["y"] - length)) < .15)
            wall["type"] = "exterior" if at_edge else "interior"
    else:
        raise ValueError("No wall or room geometry detected. Use a clearer plan.")

    return {
        "schemaVersion": 1,
        "unit": "m",
        "plot": plot,
        "walls": walls,
        "rooms": room_objs,
        "doors": [],
        "windows": [],
        "stairs": [],
        "columns": [],
        "metadata": {"confidence": round(confidence, 2)},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    parser.add_argument("--plot-width", type=float)
    args = parser.parse_args()
    if args.plot_width is not None and not 0 < args.plot_width <= 500:
        parser.error("Known plot width must be between 0 and 500 metres.")

    try:
        gray = load_grayscale(args.image_path)
        gray = normalize_size(gray)
        gray, _skew_angle = deskew(gray)

        wall_segments = detect_wall_segments(gray)
        rooms = detect_rooms(gray)
        notes = []
        try:
            texts = detect_text(gray)
        except pytesseract.TesseractNotFoundError:
            texts = []
            notes.append("OCR is unavailable. Room names and automatic scale labels were not read.")
        if not wall_segments:
            raise ValueError("No clear walls found. Use a straight, high-contrast floor plan.")

        pixels_per_meter, confidence = find_scale(texts, wall_segments)
        if args.plot_width:
            pixels_per_meter = (max(s[k] for s in wall_segments for k in ("x1", "x2")) - min(s[k] for s in wall_segments for k in ("x1", "x2"))) / args.plot_width
            confidence = 0.85
            notes.append("Scale uses the known plot width you supplied.")
        elif pixels_per_meter is None:
            xs = [s[k] for s in wall_segments for k in ("x1", "x2")]
            ys = [s[k] for s in wall_segments for k in ("y1", "y2")]
            pixels_per_meter = max(max(xs) - min(xs), max(ys) - min(ys)) / FALLBACK_SPAN_METERS
            confidence = 0.2
            notes.append("Scale assumes the longest side is 12 metres. Calibrate against the drawing.")
        notes.append("Review detected walls and rooms. Add doors and windows manually.")

        floor_plan = assemble_floor_plan(
            wall_segments, rooms, texts, pixels_per_meter, confidence, gray.shape
        )
        floor_plan["metadata"]["analysisNotes"] = notes
        print(json.dumps(floor_plan))
    except Exception as exc:  # noqa: BLE001 - report any failure as JSON, not a bare traceback
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
