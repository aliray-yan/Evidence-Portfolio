export type ConcernLabel =
  | "acne"
  | "blackheads"
  | "whiteheads"
  | "visible_pores"
  | "redness"
  | "dark_spots"
  | "pigmentation"
  | "wrinkles"
  | "acne_scars";

export type ConfidenceLevel = "high" | "medium" | "low";
export type ConcernStatus = "detected" | "possible" | "not_detected";
// Deliberately a plain string, not a fixed union: detector class names
// come from whatever the currently-loaded YOLO checkpoint was trained
// with (e.g. "blackheads", "dark spot" — not the earlier placeholder
// set of "comedone"/"papule"/etc). A fixed union here would need to
// change every time the backend team trains a new detector on a
// differently-labeled dataset. See components/results/image-panel.tsx
// for how unrecognized class names still get a sensible fallback
// color/label instead of breaking.
export type LesionClass = string;

export interface QualityWarning {
  code: string;
  message: string;
}

export interface ImageQuality {
  usable: boolean;
  face_count: number;
  quality_score: number;
  warnings: QualityWarning[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Concern {
  label: ConcernLabel;
  display_name: string;
  probability: number;
  confidence_level: ConfidenceLevel;
  status: ConcernStatus;
  explanation: string;
}

export interface Detection {
  id: string;
  class: LesionClass;
  confidence: number;
  bbox: BoundingBox;
}

export interface Recommendation {
  id: string;
  concern: ConcernLabel;
  title: string;
  text: string;
  priority: "general" | "professional_evaluation";
  source_type: "educational";
}

export interface ModelStatus {
  classifier: "trained" | "heuristic_placeholder";
  detector: "trained" | "heuristic_placeholder";
  registry_version: string;
  note: string;
}

export interface AnalyzeResponse {
  request_id: string;
  quality: ImageQuality;
  concerns: Concern[];
  detections: Detection[];
  recommendations: Recommendation[];
  professional_evaluation_suggested: boolean;
  model_status: ModelStatus;
}
