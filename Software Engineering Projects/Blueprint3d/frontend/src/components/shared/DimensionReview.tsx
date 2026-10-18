import type { FloorPlan,LengthUnit } from '../../types/floorPlan';
import type { FloorPlanAction } from '../floor-plan-2d/floorPlanReducer';
import { formatLength,fromMeters } from '../../utils/units';
import { polygonBounds } from '../../utils/geometry2d';
export function DimensionReview({plan,dispatch,unit='ft',initiallyOpen}:{plan:FloorPlan;dispatch:(a:FloorPlanAction)=>void;unit?:LengthUnit;initiallyOpen?:boolean}) {
  const dimensions=plan.metadata.dimensions??[];
  const pending=plan.rooms.filter(r=>r.dimensionStatus==='review'||(!r.declaredSize&&plan.metadata.analysisEngine==='cv-ocr')).length;
  if(!plan.metadata.analysisEngine)return null;
  return <details className="dimension-review" open={initiallyOpen??pending>0}><summary>Drawing accuracy · {plan.metadata.accuracyStatus==='reviewed'?'reviewed':'needs review'} <span>{dimensions.length} read dimensions · {pending} uncertain spaces</span></summary>
    <p>Dimensions read from the drawing are kept separately from geometry. Confirm legibility and room boundaries against the original; an unreadable label is never treated as a verified measurement.</p>
    <div className="dimension-table-wrap"><table><thead><tr><th>Space</th><th>Drawing label</th><th>Current footprint</th><th>Review</th></tr></thead><tbody>{plan.rooms.map(r=>{const b=polygonBounds(r.boundary);return <tr key={r.id}><td>{r.name}</td><td>{r.declaredSize?.sourceText??'Not reliably read'}</td><td>{fromMeters(b.width,unit).toFixed(2)} × {fromMeters(b.length,unit).toFixed(2)} {unit}</td><td><button className={r.dimensionStatus==='confirmed'?'confirmed':''} onClick={()=>dispatch({type:'UPDATE_ROOM',id:r.id,changes:{dimensionStatus:'confirmed'}})}>{r.dimensionStatus==='confirmed'?'Confirmed':'Confirm after checking'}</button></td></tr>;})}</tbody></table></div>
    {dimensions.filter(d=>d.axis!=='room').map(d=><p key={d.id}>{d.axis==='x'?'Plot width':'Plot length'}: {d.text} → {formatLength(d.valueMeters,unit)} · {d.status}</p>)}
    <p>Proposed windows and furniture are design suggestions. Door candidates and stair rises also need checking; the plan image may not specify them.</p>
    <button className="secondary-button" disabled={plan.rooms.some(r=>r.dimensionStatus!=='confirmed')} onClick={()=>dispatch({type:'SET_METADATA',changes:{accuracyStatus:'reviewed',verifiedAt:new Date().toISOString()}})}>Mark layout reviewed</button>
  </details>;
}
