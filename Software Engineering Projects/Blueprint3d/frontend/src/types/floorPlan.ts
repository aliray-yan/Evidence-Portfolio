// Geometry is always stored in metres. unit is the preferred display unit.
export type LengthUnit = 'm' | 'cm' | 'ft' | 'in';
export type ElementSource = 'detected' | 'proposed' | 'manual';
export interface Point2D { x: number; y: number; }
export interface Plot { width: number; length: number; marlaSquareFeet?: number; }
export interface Wall {
  id: string; start: Point2D; end: Point2D; thickness: number; height: number;
  type: 'exterior' | 'interior'; materialKey?: string; color?: string; source?: ElementSource;
}
export interface Opening {
  id: string; wallId: string; offset: number; width: number; height: number; sillHeight?: number;
  swing?: 'left' | 'right' | 'sliding' | 'none'; materialKey?: string; color?: string;
  frameColor?: string; openAngle?: number; source?: ElementSource; confidence?: number;
}
export interface Room {
  id: string; name: string; boundary: Point2D[]; floorMaterialKey?: string;
  ceilingMaterialKey?: string; floorColor?: string; ceilingColor?: string;
  ceilingHeight?: number; outdoor?: boolean; source?: ElementSource;
  declaredSize?: { width: number; length: number; sourceText: string; confidence: number };
  dimensionStatus?: 'matched' | 'review' | 'confirmed';
}
export interface Stair {
  id: string; boundary: Point2D[]; fromLevel: number; toLevel: number;
  direction: 'up' | 'down'; shape?: 'straight' | 'curved' | 'u-shaped'; height?: number;
  steps?: number; rotation?: number; color?: string; source?: ElementSource;
}
export interface Column {
  id: string; position: Point2D; width: number; depth: number; height: number; color?: string;
}
export type FurnitureKind = 'bed' | 'sofa' | 'table' | 'chair' | 'cabinet' | 'wardrobe' | 'toilet' | 'basin' | 'plant' | 'car';
export interface Furniture {
  id: string; roomId?: string; name: string; kind: FurnitureKind; position: Point2D;
  width: number; depth: number; height: number; rotation: number; elevation?: number;
  color: string; materialKey?: string; source?: ElementSource;
}
export interface ReadDimension {
  id: string; text: string; axis: 'x' | 'y' | 'room'; valueMeters: number;
  lengthMeters?: number; roomId?: string; confidence: number; status: 'review' | 'confirmed';
}
export interface FloorPlan {
  schemaVersion: number; unit: LengthUnit; plot: Plot; walls: Wall[]; rooms: Room[];
  doors: Opening[]; windows: Opening[]; stairs: Stair[]; columns: Column[]; furniture?: Furniture[];
  metadata: {
    sourceBlueprintId?: string; verifiedAt?: string; confidence?: number; analysisNotes?: string[];
    analysisEngine?: 'browser-structural' | 'cv-ocr' | 'reviewed-trace';
    accuracyStatus?: 'draft' | 'reviewed'; stagingApplied?: boolean; dimensions?: ReadDimension[];
    imageRegistration?: { width: number; height: number; left: number; top: number; pixelsPerMeter: number; pixelsPerMeterY?: number };
  };
}
