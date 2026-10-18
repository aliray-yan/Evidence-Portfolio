export interface FloorPlanDraft {
  schemaVersion: number;
  unit: string;
  plot: {
    width: number;
    length: number;
  };
  walls: unknown[];
  rooms: unknown[];
  doors: unknown[];
  windows: unknown[];
  stairs: unknown[];
  columns: unknown[];
  metadata: {
    confidence?: number;
  };
}
/**
* One interface, swappable implementation — see docs/ARCHITECTURE.md. v1
* ships HeuristicBlueprintAnalyzer (OpenCV + Tesseract); a future paid,
* more-accurate vision model would be a second implementation of this
* same interface, selected by config, with nothing upstream or downstream
* needing to change.
*/
export interface BlueprintAnalyzer {
  analyze(input: {
    imagePath: string;
    plotWidthMeters?: number;
    plotLengthMeters?: number;
  }): Promise<FloorPlanDraft>;
}
