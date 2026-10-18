import assert from 'node:assert/strict';
import { SAMPLES } from '../frontend/src/data/samples';
import { assertFloorPlan, checkFloorPlan } from '../frontend/src/utils/planValidation';
import { floorPlanReducer } from '../frontend/src/components/floor-plan-2d/floorPlanReducer';
import { computeWallSegments } from '../frontend/src/components/three-scene/geometry';
import { buildCollisionSegments, resolveCircleAgainstWalls } from '../frontend/src/components/three-scene/collision';
import { isValidFloorPlanShape } from '../backend/src/services/floor-plans/validateShape';
import { extractRasterPlan } from '../frontend/src/utils/rasterPlan';
import { pointInPolygon, roomInteriorPoint } from '../frontend/src/utils/geometry2d';
import { readFileSync } from 'node:fs';
import { parseDimensionInput } from '../frontend/src/utils/dimensionInput';
import { fromMarlas,toMarlas,squareFeet } from '../frontend/src/utils/plotArea';
import { stagePlan,furnitureFits,prepareForViewer } from '../frontend/src/utils/staging';
for (const s of SAMPLES) {
  assertFloorPlan(s.plan);
  assert.ok(isValidFloorPlanShape(s.plan));
  assert.deepEqual(checkFloorPlan(s.plan).filter(i => i.severity === 'error'), []);
  console.log('PASS exact sample: ' + s.id);
}
const invalid = structuredClone(SAMPLES[0].plan);
(invalid.walls as unknown[])[0] = null;
assert.throws(() => assertFloorPlan(invalid));
assert.equal(isValidFloorPlanShape(invalid), false);
const overlap = structuredClone(SAMPLES[0].plan);
overlap.doors.push({ ...overlap.doors[0], id: 'duplicate-opening' });
assert.ok(checkFloorPlan(overlap).some(i => i.code === 'overlapping-openings'));
const malformed = structuredClone(SAMPLES[0].plan);
malformed.walls[0].start.x = NaN;
assert.throws(() => assertFloorPlan(malformed));
assert.equal(isValidFloorPlanShape(malformed), false);
const deleted = floorPlanReducer(SAMPLES[0].plan, { type: 'DELETE_WALL', id: 'south' });
assert.ok(!deleted.doors.some(o => o.wallId === 'south'));
const wall = SAMPLES[0].plan.walls[0];
const segments = computeWallSegments({ ...wall, height: 1.1 }, [{ offset: 1, width: 1, holeYStart: 0, holeYEnd: 2.2 }]);
assert.ok(segments.every(s => s.yEnd <= 1.1 && s.yStart >= 0 && s.xEnd > s.xStart));
const colliders = buildCollisionSegments(SAMPLES[0].plan);
const doorway = resolveCircleAgainstWalls({ x: 1.5, z: 7, radius: .3 }, colliders);
assert.ok(Math.abs(doorway.x - 1.5) < .001 && Math.abs(doorway.z - 7) < .001);
const concave = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 6 }, { x: 0, y: 6 }];
assert.ok(pointInPolygon(roomInteriorPoint(concave), concave));
function synthetic(plan: typeof SAMPLES[number]['plan']) { const width = 700, height = 700, pixels = new Uint8ClampedArray(width * height * 4); pixels.fill(255); const scale = 35, offset = 55; for (const wall of plan.walls) {
  const x1 = Math.round(offset + wall.start.x * scale), x2 = Math.round(offset + wall.end.x * scale), y1 = Math.round(offset + wall.start.y * scale), y2 = Math.round(offset + wall.end.y * scale);
  for (let y = Math.min(y1, y2) - 4; y <= Math.max(y1, y2) + 4; y++)
    for (let x = Math.min(x1, x2) - 4; x <= Math.max(x1, x2) + 4; x++) {
      const i = (y * width + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 30;
    }
} return { pixels, width, height }; }
for (const sample of SAMPLES) {
  const raster = synthetic(sample.plan);
  const p = extractRasterPlan(raster.pixels, raster.width, raster.height, sample.plan.plot.width);
  assert.equal(p.rooms.length, sample.plan.rooms.length);
  assert.equal(p.plot.width, sample.plan.plot.width);
  assert.ok(Math.abs(p.plot.length - sample.plan.plot.length) < .3);
  assert.deepEqual(checkFloorPlan(p).filter(i => i.severity === 'error'), []);
  console.log('PASS raster conversion: ' + sample.id);
}
assert.throws(() => extractRasterPlan(new Uint8ClampedArray(500 * 500 * 4).fill(255), 500, 500));
console.log('PASS malformed data, overlapping openings, wall deletion, cutaway geometry, doorway collisions, concave room spawn and blank image.');

const rescaled = floorPlanReducer(SAMPLES[1].plan,{type:'SET_PLOT',plot:{width:6,length:5}});
assert.equal(rescaled.walls.find(w=>w.id==='north')!.end.x,6);
assert.equal(rescaled.doors[0].offset,SAMPLES[1].plan.doors[0].offset/2);
assert.equal(rescaled.doors[0].width,SAMPLES[1].plan.doors[0].width/2);
assert.equal(rescaled.walls[0].height,SAMPLES[1].plan.walls[0].height);
assert.equal(rescaled.walls[0].thickness,SAMPLES[1].plan.walls[0].thickness);
assert.deepEqual(checkFloorPlan(rescaled).filter(i=>i.severity==='error'),[]);
assert.equal(floorPlanReducer(SAMPLES[1].plan,{type:'SET_PLOT',plot:{width:0,length:10}}),SAMPLES[1].plan);
console.log('PASS calibrated scaling preserves room layout, opening alignment, wall height and thickness; invalid plot dimensions are rejected.');

assert.equal(parseDimensionInput('', 'ft'),undefined);
assert.ok(Math.abs(parseDimensionInput('40′-1½″','m')!-12.2301)<1e-8);
assert.ok(Math.abs(parseDimensionInput('14\'-9"','m')!-4.4958)<1e-8);
assert.equal(parseDimensionInput('3.5 m','ft'),3.5);
assert.throws(()=>parseDimensionInput("0'",'ft'));
assert.throws(()=>parseDimensionInput("8'-104\"",'ft'));
assert.equal(toMarlas(fromMarlas(10)),10);
assert.ok(Math.abs(squareFeet(fromMarlas(10))-2722.5)<1e-8);
const marlaChanged=floorPlanReducer(SAMPLES[1].plan,{type:'SET_MARLA',squareFeet:225});
assert.deepEqual(marlaChanged.walls,SAMPLES[1].plan.walls);
assert.deepEqual(marlaChanged.rooms,SAMPLES[1].plan.rooms);
console.log('PASS feet/inches/fractions, typed units and configurable marla area without changing geometry.');

const reference:unknown=JSON.parse(readFileSync('frontend/public/reference/map1-retraced.json','utf8'));
assertFloorPlan(reference);
assert.ok(isValidFloorPlanShape(reference));
assert.deepEqual(checkFloorPlan(reference).filter(i=>i.severity==='error'),[]);
assert.equal(reference.rooms.find(r=>r.name==='Kitchen')?.declaredSize?.length,14.75*.3048);
assert.equal(reference.metadata.accuracyStatus,'draft');
assert.ok(reference.windows.every(w=>w.source==='proposed'));
assert.ok(reference.stairs.some(s=>s.shape==='curved'));
const staged=stagePlan(reference);
assert.ok(staged.furniture!.length>10);
for(const f of staged.furniture!)assert.ok(furnitureFits(f,staged.rooms.find(r=>r.id===f.roomId)!));
const item=staged.furniture![0];
const edited=floorPlanReducer(staged,{type:'UPDATE_FURNITURE',id:item.id,changes:{color:'#ba7766',rotation:90,position:{x:item.position.x+.1,y:item.position.y+.2}}});
const roundTrip:unknown=JSON.parse(JSON.stringify(edited));
assertFloorPlan(roundTrip);
assert.equal(roundTrip.furniture!.find(f=>f.id===item.id)!.rotation,90);
assert.deepEqual(roundTrip.walls,staged.walls);
assert.deepEqual(roundTrip.furniture!.filter(f=>f.id!==item.id),staged.furniture!.filter(f=>f.id!==item.id));
const resizedReference=floorPlanReducer(reference,{type:'SET_PLOT',plot:{width:reference.plot.width/2,length:reference.plot.length*1.5}});
assert.equal(resizedReference.metadata.imageRegistration!.pixelsPerMeter,reference.metadata.imageRegistration!.pixelsPerMeter*2);
assert.equal(resizedReference.metadata.imageRegistration!.pixelsPerMeterY,reference.metadata.imageRegistration!.pixelsPerMeterY!/1.5);
assert.deepEqual(resizedReference.rooms[0].declaredSize,reference.rooms[0].declaredSize);
assert.equal(resizedReference.rooms[0].dimensionStatus,'review');
for(const mutate of [(p:typeof reference)=>{p.metadata.imageRegistration!.pixelsPerMeter=0;},(p:typeof reference)=>{p.doors[0].openAngle=NaN;},(p:typeof reference)=>{p.furniture![0].rotation=NaN;}]){
  const bad=structuredClone(reference);mutate(bad);assert.throws(()=>assertFloorPlan(bad));assert.equal(isValidFloorPlanShape(bad),false);
}
console.log('PASS retraced architectural fixture, staged-object placement, independent edits through JSON persistence, aligned source after rescaling and malformed new fields.');

const emptyByChoice={...staged,furniture:[]};assert.equal(prepareForViewer(emptyByChoice),emptyByChoice);
const serverDraft={...reference,furniture:[],windows:[],metadata:{...reference.metadata,analysisEngine:'cv-ocr' as const,stagingApplied:undefined}};const prepared=prepareForViewer(serverDraft);assert.ok(prepared.furniture!.length>10);assert.equal(prepared.metadata.stagingApplied,true);
console.log('PASS fresh server drafts are staged once; deliberately cleared furniture stays cleared.');
