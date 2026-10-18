import type { FloorPlan, LengthUnit } from '../../types/floorPlan';
import type { Selection } from '../floor-plan-2d/types';
import type { FloorPlanAction } from '../floor-plan-2d/floorPlanReducer';
import { fromMeters,toMeters,roundDisplay } from '../../utils/units';
import { polygonBounds,polygonCentroid } from '../../utils/geometry2d';
interface Props { plan:FloorPlan;selection:Selection;dispatch:(action:FloorPlanAction)=>void;unit:LengthUnit;onClose?:()=>void; }
export function NumberField({label,value,onChange,step=.1,min,max}:{label:string;value:number;onChange:(v:number)=>void;step?:number;min?:number;max?:number}) {
  return <label>{label}<input aria-label={label} type="number" step={step} min={min} max={max} value={roundDisplay(value)} onChange={e=>{if(e.target.value!==''&&Number.isFinite(Number(e.target.value))&&(min===undefined||Number(e.target.value)>=min)&&(max===undefined||Number(e.target.value)<=max))onChange(Number(e.target.value));}}/></label>;
}
export function ColorField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) {
  return <label className="color-field">{label}<span><input aria-label={label} type="color" value={value} onChange={e=>onChange(e.target.value)}/><code>{value}</code></span></label>;
}
export function ComponentInspector({plan,selection,dispatch,unit,onClose}:Props) {
  const num=(label:string,value:number,change:(v:number)=>void)=><NumberField label={label+' ('+unit+')'} value={fromMeters(value,unit)} min={/width|depth|height|thickness|rise/i.test(label)?fromMeters(.05,unit):/elevation|sill/i.test(label)?0:undefined} onChange={v=>change(toMeters(v,unit))}/>;
  const color=(label:string,value:string|undefined,fallback:string,change:(v:string)=>void)=><ColorField label={label} value={value??fallback} onChange={change}/>;
  function addOpening(kind:'doors'|'windows',wallId:string){const w=plan.walls.find(w=>w.id===wallId);if(!w)return;const length=Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y),width=Math.min(kind==='doors'?.9:1.2,length-.2);if(width<.3)return;const occupied=[...plan.doors,...plan.windows].filter(o=>o.wallId===wallId).sort((a,b)=>a.offset-b.offset);let offset=.1;for(const o of occupied){if(offset+width<o.offset-.1)break;offset=Math.max(offset,o.offset+o.width+.15);}if(offset+width>length-.1)return;dispatch({type:'ADD_OPENING',kind,opening:{id:crypto.randomUUID(),wallId,offset,width,height:Math.min(kind==='doors'?2.1:1.15,w.height*.8),sillHeight:kind==='windows'?Math.min(.9,w.height*.2):undefined,swing:kind==='doors'?'left':undefined,source:'manual'}});}
  let content, name:string,source:string|undefined;
  if(selection.type==='furniture') {
    const item=plan.furniture?.find(f=>f.id===selection.id);if(!item)return null;
    name=item.name;source=item.source;
    const patch=(changes:Parameters<typeof dispatch>[0] & {type:'UPDATE_FURNITURE'})=>dispatch(changes);
    const update=(changes:Partial<typeof item>)=>patch({type:'UPDATE_FURNITURE',id:item.id,changes});
    content=<><label>Name<input value={item.name} onChange={e=>update({name:e.target.value})}/></label>
      <div className="inspector-grid">{num('X position',item.position.x,x=>update({position:{...item.position,x}}))}{num('Y position',item.position.y,y=>update({position:{...item.position,y}}))}
      {num('Width',item.width,width=>update({width}))}{num('Depth',item.depth,depth=>update({depth}))}{num('Height',item.height,height=>update({height}))}{num('Elevation',item.elevation??0,elevation=>update({elevation}))}</div>
      <NumberField label="Rotation (degrees)" value={item.rotation} step={5} onChange={rotation=>update({rotation})}/>
      {color('Object color',item.color,'#8caa87',color=>update({color}))}
      <div className="inspector-actions"><button onClick={()=>update({rotation:(item.rotation+90)%360})}>Rotate 90°</button><button onClick={()=>dispatch({type:'ADD_FURNITURE',item:{...item,id:crypto.randomUUID(),name:item.name+' copy',position:{x:item.position.x+.5,y:item.position.y+.5},source:'manual'}})}>Duplicate</button></div>
      <button className="properties-panel__delete" onClick={()=>{dispatch({type:'DELETE_FURNITURE',id:item.id});onClose?.();}}>Delete object</button></>;
  } else if(selection.type==='wall') {
    const wall=plan.walls.find(w=>w.id===selection.id);if(!wall)return null;
    name='Wall';source=wall.source;
    const update=(changes:Partial<typeof wall>)=>dispatch({type:'UPDATE_WALL',id:wall.id,changes});
    const length=Math.hypot(wall.end.x-wall.start.x,wall.end.y-wall.start.y),rotation=Math.atan2(wall.end.y-wall.start.y,wall.end.x-wall.start.x)*180/Math.PI;
    content=<><div className="inspector-grid">{num('Start X',wall.start.x,x=>update({start:{...wall.start,x}}))}{num('Start Y',wall.start.y,y=>update({start:{...wall.start,y}}))}{num('End X',wall.end.x,x=>update({end:{...wall.end,x}}))}{num('End Y',wall.end.y,y=>update({end:{...wall.end,y}}))}{num('Wall height',wall.height,height=>update({height}))}{num('Wall thickness',wall.thickness,thickness=>update({thickness}))}</div>
      <NumberField label="Wall rotation (degrees)" value={rotation} step={5} onChange={angle=>{const c={x:(wall.start.x+wall.end.x)/2,y:(wall.start.y+wall.end.y)/2},r=angle*Math.PI/180;update({start:{x:c.x-Math.cos(r)*length/2,y:c.y-Math.sin(r)*length/2},end:{x:c.x+Math.cos(r)*length/2,y:c.y+Math.sin(r)*length/2}});}}/>
      {color('Wall color',wall.color,'#f0ede5',color=>update({color}))}<div className='inspector-actions'><button onClick={()=>addOpening('doors',wall.id)}>Add door</button><button onClick={()=>addOpening('windows',wall.id)}>Add window</button></div><button className='properties-panel__delete' onClick={()=>{dispatch({type:'DELETE_WALL',id:wall.id});onClose?.();}}>Delete wall</button><p>Nearby floor-boundary vertices follow wall movements. Check shared corners after structural changes.</p></>;
  } else if(selection.type==='door'||selection.type==='window') {
    const kind=selection.type==='door'?'doors':'windows',opening=plan[kind].find(o=>o.id===selection.id);if(!opening)return null;
    name=selection.type==='door'?'Door':'Window';source=opening.source;
    const update=(changes:Partial<typeof opening>)=>dispatch({type:'UPDATE_OPENING',kind,id:opening.id,changes});
    content=<><div className="inspector-grid">{num('Offset along wall',opening.offset,offset=>update({offset}))}{num('Opening width',opening.width,width=>update({width}))}{num('Opening height',opening.height,height=>update({height}))}{selection.type==='window'&&num('Sill height',opening.sillHeight??0,sillHeight=>update({sillHeight}))}</div>
      {selection.type==='door'&&<><label>Door swing<select value={opening.swing??'left'} onChange={e=>update({swing:e.target.value as 'left'|'right'|'none'|'sliding'})}><option value="left">Left hinge</option><option value="right">Right hinge</option><option value="none">Open archway</option><option value="sliding">Sliding</option></select></label><NumberField label="Door open angle (degrees)" value={opening.openAngle??80} min={0} max={170} step={5} onChange={openAngle=>update({openAngle})}/></>}
      {color('Opening color',opening.color,selection.type==='door'?'#ac8059':'#b9d5de',color=>update({color}))}
      {color('Frame color',opening.frameColor,'#627271',frameColor=>update({frameColor}))}
      {source!=='manual'&&<button className="secondary-button" onClick={()=>update({source:'manual',confidence:1})}>Confirm against drawing</button>}
      <button className="properties-panel__delete" onClick={()=>{dispatch({type:'DELETE_OPENING',kind,id:opening.id});onClose?.();}}>Delete {name.toLowerCase()}</button></>;
  } else if(selection.type==='room') {
    const room=plan.rooms.find(r=>r.id===selection.id);if(!room)return null;
    name=room.name;source=room.source;
    const update=(changes:Partial<typeof room>)=>dispatch({type:'UPDATE_ROOM',id:room.id,changes});
    const b=polygonBounds(room.boundary);
    const minX=Math.min(...room.boundary.map(p=>p.x)),minY=Math.min(...room.boundary.map(p=>p.y));
    const resize=(width:number,length:number)=>update({boundary:room.boundary.map(p=>({x:minX+(p.x-minX)*width/b.width,y:minY+(p.y-minY)*length/b.length})),dimensionStatus:'review'});
    content=<><label>Room name<input value={room.name} onChange={e=>update({name:e.target.value})}/></label><p>Floor extent: {fromMeters(b.width,unit).toFixed(2)} × {fromMeters(b.length,unit).toFixed(2)} {unit}</p>
      {room.declaredSize&&<p className="declared-dimension">Drawing: {room.declaredSize.sourceText}<br/>Status: {room.dimensionStatus??'review'}</p>}
      <div className="inspector-grid">{num('Floor width',b.width,width=>resize(width,b.length))}{num('Floor length',b.length,length=>resize(b.width,length))}</div>
      <details className="boundary-editor"><summary>Edit floor boundary points</summary>{room.boundary.map((p,i)=><div className="inspector-grid" key={i}>{num('Point '+(i+1)+' X',p.x,x=>update({boundary:room.boundary.map((v,j)=>j===i?{...v,x}:v),dimensionStatus:'review'}))}{num('Point '+(i+1)+' Y',p.y,y=>update({boundary:room.boundary.map((v,j)=>j===i?{...v,y}:v),dimensionStatus:'review'}))}</div>)}<p>These points change the floor independently. Move the corresponding walls when changing the layout.</p></details>
      <button className="secondary-button" onClick={()=>{const center=polygonCentroid(room.boundary);update({boundary:room.boundary.map(p=>({x:center.x-(p.y-center.y),y:center.y+(p.x-center.x)})),dimensionStatus:'review'});}}>Rotate floor 90°</button>
      {num('Ceiling height',room.ceilingHeight??2.8,ceilingHeight=>update({ceilingHeight}))}
      <label>Space type<select value={room.outdoor?'outdoor':'indoor'} onChange={e=>update({outdoor:e.target.value==='outdoor'})}><option value="indoor">Indoor</option><option value="outdoor">Outdoor / porch</option></select></label>
      <label>Floor finish<select value={room.floorMaterialKey??'wood'} onChange={e=>update({floorMaterialKey:e.target.value})}><option value="wood">Wood</option><option value="tile">Tile</option><option value="concrete">Concrete</option></select></label>
      {color('Floor color',room.floorColor,'#ffffff',floorColor=>update({floorColor}))}{color('Ceiling color',room.ceilingColor,'#f0ede5',ceilingColor=>update({ceilingColor}))}
      <button className="secondary-button" onClick={()=>update({dimensionStatus:'confirmed',source:'manual'})}>Confirm room dimensions</button><button className="properties-panel__delete" onClick={()=>{dispatch({type:'DELETE_ROOM',id:room.id});onClose?.();}}>Delete floor and its furniture</button></>;
  } else if(selection.type==='stair') {
    const stair=plan.stairs.find(s=>s.id===selection.id);if(!stair)return null;
    name='Staircase';source=stair.source;
    const update=(changes:Partial<typeof stair>)=>dispatch({type:'UPDATE_STAIR',id:stair.id,changes});
    content=<>{num('Stair rise',stair.height??2.8,height=>update({height}))}<NumberField label="Steps" value={stair.steps??16} min={3} max={40} step={1} onChange={steps=>update({steps:Math.round(steps)})}/><NumberField label="Stair rotation (degrees)" value={stair.rotation??0} step={5} onChange={rotation=>update({rotation})}/>{color('Stair color',stair.color,'#baab8b',color=>update({color}))}</>;
  } else {
    const column=plan.columns.find(c=>c.id===selection.id);if(!column)return null;
    name='Column';source='manual';
    const update=(changes:Partial<typeof column>)=>dispatch({type:'UPDATE_COLUMN',id:column.id,changes});
    content=<>{num('Column X',column.position.x,x=>update({position:{...column.position,x}}))}{num('Column Y',column.position.y,y=>update({position:{...column.position,y}}))}{num('Column width',column.width,width=>update({width}))}{num('Column depth',column.depth,depth=>update({depth}))}{num('Column height',column.height,height=>update({height}))}<button className="secondary-button" onClick={()=>update({width:column.depth,depth:column.width})}>Rotate column 90°</button>{color('Column color',column.color,'#d3ccbd',color=>update({color}))}</>;
  }
  return <section className="component-inspector"><div className="inspector-heading"><h3>{name}</h3>{onClose&&<button aria-label="Close component inspector" onClick={onClose}>×</button>}</div>{source&&<span className={`element-source ${source}`}>{source==='detected'?'Detected · review':source==='proposed'?'Proposed · editable':'User confirmed / edited'}</span>}{content}</section>;
}
