import type { FloorPlan } from '../types/floorPlan';
export const DEFAULT_MARLA_SQUARE_FEET = 272.25;
export const SQUARE_METERS_PER_SQUARE_FOOT = .3048 ** 2;
export function squareFeet(squareMeters:number) { return squareMeters / SQUARE_METERS_PER_SQUARE_FOOT; }
export function toMarlas(squareMeters:number, squareFeetPerMarla=DEFAULT_MARLA_SQUARE_FEET) { return squareFeet(squareMeters)/squareFeetPerMarla; }
export function fromMarlas(marlas:number, squareFeetPerMarla=DEFAULT_MARLA_SQUARE_FEET) { return marlas*squareFeetPerMarla*SQUARE_METERS_PER_SQUARE_FOOT; }
export function formatPlotArea(plan:FloorPlan) {
  const sqm=plan.plot.width*plan.plot.length;
  return `${toMarlas(sqm,plan.plot.marlaSquareFeet).toFixed(2)} marla · ${squareFeet(sqm).toFixed(0)} sq ft`;
}
