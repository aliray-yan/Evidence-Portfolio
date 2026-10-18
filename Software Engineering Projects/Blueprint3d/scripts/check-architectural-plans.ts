import {readFileSync,readdirSync} from 'node:fs';
import {assertFloorPlan,checkFloorPlan} from '../frontend/src/utils/planValidation';
import {isValidFloorPlanShape} from '../backend/src/services/floor-plans/validateShape';
import {toMarlas} from '../frontend/src/utils/plotArea';
import assert from 'node:assert/strict';
for(const file of readdirSync('output/architectural-blueprints').filter(f=>f.endsWith('.json')&&f!=='manifest.json')){
 const p:unknown=JSON.parse(readFileSync('output/architectural-blueprints/'+file,'utf8'));assertFloorPlan(p);assert.ok(isValidFloorPlanShape(p));
 assert.deepEqual(checkFloorPlan(p).filter(e=>e.severity==='error'),[]);
 const marla=toMarlas(p.plot.width*p.plot.length,272.25);assert.ok([5,7,10,20].some(n=>Math.abs(n-marla)<1e-7));
 for(const r of p.rooms){const xs=r.boundary.map(v=>v.x),ys=r.boundary.map(v=>v.y);assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-r.declaredSize!.width)<1e-5);assert.ok(Math.abs(Math.max(...ys)-Math.min(...ys)-r.declaredSize!.length)<1e-5);}
 console.log('PASS',file,marla.toFixed(0)+' marla',p.rooms.length+' spaces',p.doors.length+' doors',p.windows.length+' windows');
}
