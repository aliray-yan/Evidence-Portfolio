import type { Dispatch } from 'react';
import type { Material } from '../../api/materials';
import type { FloorPlan, LengthUnit, FurnitureKind } from '../../types/floorPlan';
import { fromMeters,toMeters,roundDisplay } from '../../utils/units';
import { fromMarlas,toMarlas,squareFeet } from '../../utils/plotArea';
import { makeFurniture,stagePlan } from '../../utils/staging';
import { roomInteriorPoint } from '../../utils/geometry2d';
import type { FloorPlanAction } from './floorPlanReducer';
import type { Selection } from './types';
import { ComponentInspector } from '../shared/ComponentInspector';
export function PropertiesPanel({floorPlan,dispatch,selection,onSelectionChange,displayUnit}:{floorPlan:FloorPlan;dispatch:Dispatch<FloorPlanAction>;selection:Selection|null;onSelectionChange:(s:Selection|null)=>void;displayUnit:LengthUnit;materials:Material[]}) {
  if(selection)return <ComponentInspector plan={floorPlan} selection={selection} dispatch={dispatch} unit={displayUnit} onClose={()=>onSelectionChange(null)}/>;
  const area=floorPlan.plot.width*floorPlan.plot.length,marla=floorPlan.plot.marlaSquareFeet??272.25;
  const add=(kind:FurnitureKind)=>{const room=floorPlan.rooms.find(r=>!r.outdoor)??floorPlan.rooms[0];const p=room?roomInteriorPoint(room.boundary):{x:floorPlan.plot.width/2,y:floorPlan.plot.length/2};const item=makeFurniture(kind,p,room?.id);dispatch({type:'ADD_FURNITURE',item});onSelectionChange({type:'furniture',id:item.id});};
  return <div className="properties-panel"><h3>Plan dimensions</h3>
    <label>Width ({displayUnit})<input type="number" min=".1" max={fromMeters(500,displayUnit)} step=".1" value={roundDisplay(fromMeters(floorPlan.plot.width,displayUnit))} onChange={e=>dispatch({type:'SET_PLOT',plot:{...floorPlan.plot,width:toMeters(Number(e.target.value),displayUnit)}})}/></label>
    <label>Length ({displayUnit})<input type="number" min=".1" max={fromMeters(500,displayUnit)} step=".1" value={roundDisplay(fromMeters(floorPlan.plot.length,displayUnit))} onChange={e=>dispatch({type:'SET_PLOT',plot:{...floorPlan.plot,length:toMeters(Number(e.target.value),displayUnit)}})}/></label>
    <label>Square feet per marla<select aria-label="Square feet per marla" value={marla} onChange={e=>dispatch({type:'SET_MARLA',squareFeet:Number(e.target.value)})}><option value={272.25}>272.25 sq ft · your default</option><option value={225}>225 sq ft</option><option value={250}>250 sq ft</option>{![272.25,225,250].includes(marla)&&<option value={marla}>{marla} sq ft · custom</option>}</select></label>
    <label>Custom marla size (sq ft)<input type="number" min="1" step=".25" value={marla} onChange={e=>dispatch({type:'SET_MARLA',squareFeet:Number(e.target.value)})}/></label>
    <label>Total plot area (marla)<input type="number" min=".1" step=".25" value={roundDisplay(toMarlas(area,marla))} onChange={e=>{const target=fromMarlas(Number(e.target.value),marla);if(target>0){const ratio=Math.sqrt(target/area);dispatch({type:'SET_PLOT',plot:{width:floorPlan.plot.width*ratio,length:floorPlan.plot.length*ratio}});}}}/></label>
    <p className="properties-panel__readout">{squareFeet(area).toFixed(0)} sq ft · {area.toFixed(1)} m²</p>
    <p className="properties-panel__hint">Changing the marla standard changes the area display only. Changing plot dimensions or total area explicitly rescales the layout; original drawing dimensions will need review.</p>
    <h3>Add an object</h3><select aria-label="Add furniture" defaultValue="" onChange={e=>{if(e.target.value)add(e.target.value as FurnitureKind);e.target.value='';}}><option value="" disabled>Choose furniture…</option>{['bed','sofa','table','chair','cabinet','wardrobe','toilet','basin','plant','car'].map(k=><option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>)}</select>
    <button className="secondary-button" onClick={()=>dispatch({type:'REPLACE_ALL',floorPlan:stagePlan(floorPlan)})}>Suggest room furniture</button>
    <p className="properties-panel__hint">Select a wall, room, opening or object. Each component has independent colors and editable properties. Furniture is proposed, never read as an architectural dimension.</p>
  </div>;
}
