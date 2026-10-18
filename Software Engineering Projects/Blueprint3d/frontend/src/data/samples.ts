import type { FloorPlan, Room, Wall } from '../types/floorPlan';
export interface Sample {
  id: string;
  name: string;
  description: string;
  tag: string;
  beds: number;
  plan: FloorPlan;
}
const point = (x: number, y: number) => ({ x, y });
function makePlan(width: number, length: number, split: number, lower: number, names: string[], upperSplit = split): FloorPlan {
  const wall = (id: string, x: number, y: number, x2: number, y2: number, exterior = false): Wall => ({ id, start: point(x, y), end: point(x2, y2), thickness: exterior ? 0.22 : 0.14, height: 2.8, type: exterior ? 'exterior' : 'interior', materialKey: 'painted-wall' });
  const room = (id: string, name: string, x: number, y: number, x2: number, y2: number): Room => ({ id, name, boundary: [point(x, y), point(x2, y), point(x2, y2), point(x, y2)], floorMaterialKey: /bath|kitchen/i.test(name) ? 'tile' : 'wood' });
  const walls = [wall('south', 0, length, width, length, true), wall('west', 0, 0, 0, length, true), wall('north', 0, 0, width, 0, true), wall('east', width, 0, width, length, true), wall('divider', 0, lower, width, lower), wall('upper', upperSplit, 0, upperSplit, lower), wall('lower', split, lower, split, length)];
  const rooms = [room('living', names[0], 0, lower, split, length), room('kitchen', names[1], split, lower, width, length), room('bedroom', names[2], 0, 0, upperSplit, lower), room('bath', names[3], upperSplit, 0, width, lower)];
  return { schemaVersion: 1, unit: 'm', plot: { width, length }, walls, rooms,
    doors: [{ id: 'entrance', wallId: 'south', offset: 1, width: 1, height: 2.2, swing: 'left' }, { id: 'living-bedroom', wallId: 'divider', offset: Math.min(split, upperSplit) - 1.5, width: 0.9, height: 2.2, swing: 'left' }, { id: 'bed-bath', wallId: 'upper', offset: lower - 1.5, width: 0.85, height: 2.2, swing: 'right' }, { id: 'living-kitchen', wallId: 'lower', offset: 0.8, width: 1, height: 2.2, swing: 'left' }, { id: 'kitchen-bath', wallId: 'divider', offset: width - 1.5, width: 0.85, height: 2.2, swing: 'right' }],
    windows: [{ id: 'w-living', wallId: 'west', offset: length - 2.7, width: 1.5, height: 1.2, sillHeight: 0.9 }, { id: 'w-bed', wallId: 'north', offset: 1, width: 1.6, height: 1.2, sillHeight: 0.9 }, { id: 'w-bath', wallId: 'north', offset: width - 1.4, width: 0.8, height: 0.8, sillHeight: 1.4 }, { id: 'w-kitchen', wallId: 'east', offset: length - 2.2, width: 1.3, height: 1.2, sillHeight: 0.9 }], stairs: [], columns: [], metadata: {} };
}
const family = makePlan(12, 10, 7, 4, ['Living & dining', 'Kitchen', 'Bedroom 1', 'Bedroom 2'], 6);
// Separate bathroom at the back of the kitchen without duplicating shared walls.
family.walls.push({ id: 'bath-divider', start: point(7, 7), end: point(12, 7), thickness: 0.14, height: 2.8, type: 'interior' });
family.rooms[1] = { ...family.rooms[1], boundary: [point(7, 4), point(12, 4), point(12, 7), point(7, 7)] };
family.rooms.push({ id: 'bathroom', name: 'Bathroom', boundary: [point(7, 7), point(12, 7), point(12, 10), point(7, 10)], floorMaterialKey: 'tile' });
family.doors.push({ id: 'bathroom-door', wallId: 'bath-divider', offset: 1, width: 0.9, height: 2.2 });
family.windows.find(w => w.id === 'w-kitchen')!.offset = 4.8;
const villa = makePlan(14, 12, 8, 5, ['Living & dining', 'Kitchen', 'Primary suite', 'Bedroom 2'], 8);
villa.walls.push({ id: 'villa-bath', start: point(8, 8), end: point(14, 8), thickness: 0.14, height: 2.8, type: 'interior' }, { id: 'villa-bed', start: point(4, 0), end: point(4, 5), thickness: 0.14, height: 2.8, type: 'interior' });
villa.rooms[1] = { ...villa.rooms[1], boundary: [point(8, 5), point(14, 5), point(14, 8), point(8, 8)] };
villa.rooms[2] = { ...villa.rooms[2], boundary: [point(0, 0), point(4, 0), point(4, 5), point(0, 5)] };
villa.rooms.push({ id: 'bed3', name: 'Bedroom 3', boundary: [point(4, 0), point(8, 0), point(8, 5), point(4, 5)], floorMaterialKey: 'wood' }, { id: 'villa-bathroom', name: 'Bathroom & laundry', boundary: [point(8, 8), point(14, 8), point(14, 12), point(8, 12)], floorMaterialKey: 'tile' });
villa.doors.push({ id: 'villa-bed-door', wallId: 'villa-bed', offset: 3.3, width: 0.9, height: 2.2 }, { id: 'villa-bath-door', wallId: 'villa-bath', offset: 1, width: 0.9, height: 2.2 });
villa.windows.find(w => w.id === 'w-kitchen')!.offset = 5.8;
villa.windows.push({ id: 'w-bed3', wallId: 'north', offset: 5, width: 1.6, height: 1.2, sillHeight: 0.9 });
export const SAMPLES: Sample[] = [
  { id: 'studio', name: 'The city studio', description: 'A compact home with every space connected.', tag: 'START SIMPLE', beds: 1, plan: makePlan(8, 7, 5, 3, ['Living room', 'Kitchen', 'Bedroom', 'Bathroom']) },
  { id: 'family', name: 'The family home', description: 'Two bedrooms, generous living, room to grow.', tag: 'EVERYDAY LIVING', beds: 2, plan: family },
  { id: 'narrow', name: 'The urban retreat', description: 'A narrow plot with a practical, flowing layout.', tag: 'NARROW PLOT', beds: 1, plan: makePlan(6, 12, 3.7, 5, ['Living & dining', 'Kitchen', 'Bedroom', 'Bathroom'], 3.7) },
  { id: 'villa', name: 'The garden villa', description: 'Three bedrooms and an open living space.', tag: 'MORE TO EXPLORE', beds: 3, plan: villa },
];
