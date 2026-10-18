import type { LengthUnit } from '../types/floorPlan';
const METERS_PER_UNIT: Record<LengthUnit, number> = {
  m: 1,
  cm: 0.01,
  ft: 0.3048,
  in: 0.0254,
};
export function toMeters(value: number, unit: LengthUnit): number {
  return value * METERS_PER_UNIT[unit];
}
export function fromMeters(valueInMeters: number, unit: LengthUnit): number {
  return valueInMeters / METERS_PER_UNIT[unit];
}
export function formatLength(valueInMeters: number, unit: LengthUnit): string {
  const converted = fromMeters(valueInMeters, unit);
  const decimals = unit === 'cm' || unit === 'in' ? 0 : 2;
  return `${converted.toFixed(decimals)} ${unit}`;
}
const AREA_UNIT_LABEL: Record<LengthUnit, string> = {
  m: 'm²',
  cm: 'cm²',
  ft: 'sq ft',
  in: 'sq in',
};
export function formatArea(areaInSquareMeters: number, unit: LengthUnit): string {
  const linearFactor = METERS_PER_UNIT[unit];
  const converted = areaInSquareMeters / (linearFactor * linearFactor);
  const decimals = unit === 'cm' || unit === 'in' ? 0 : 1;
  return `${converted.toFixed(decimals)} ${AREA_UNIT_LABEL[unit]}`;
}
export function roundDisplay(value: number): number {
  return Math.round(value * 100) / 100;
}
