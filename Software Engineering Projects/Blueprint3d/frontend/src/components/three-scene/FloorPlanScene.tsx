import { Grid,Html,Edges } from '@react-three/drei';
import type { FloorPlan } from '../../types/floorPlan';
import type { Selection } from '../floor-plan-2d/types';
import type { FloorPlanAction } from '../floor-plan-2d/floorPlanReducer';
import { RoomMesh } from './RoomMesh';
import { WallMesh } from './WallMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { StairMesh } from './StairMesh';
import { polygonCentroid } from '../../utils/geometry2d';
export function FloorPlanScene({floorPlan,cutaway=false,furnished=true,labels=false,selection,onSelect,onEdit,gizmo='translate'}:{floorPlan:FloorPlan;cutaway?:boolean;furnished?:boolean;labels?:boolean;selection?:Selection|null;onSelect?:(s:Selection)=>void;onEdit?:(a:FloorPlanAction)=>void;gizmo?:'translate'|'rotate'}) {
  const w=floorPlan.plot.width,l=floorPlan.plot.length,height=Math.max(2.8,...floorPlan.walls.map(w=>w.height));
  return <>
    <ambientLight intensity={.65}/><hemisphereLight args={['#ffffff','#d6cfbc',1.5]}/><directionalLight position={[-8,18,12]} intensity={2.8} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-Math.max(w,l)} shadow-camera-right={Math.max(w,l)} shadow-camera-top={Math.max(w,l)} shadow-camera-bottom={-Math.max(w,l)} shadow-normalBias={.04}><object3D attach="target" position={[w/2,0,l/2]}/></directionalLight><directionalLight position={[18,12,-10]} intensity={.65}/>
    <mesh position={[w/2,-.16,l/2]} receiveShadow><boxGeometry args={[w+.5,.3,l+.5]}/><meshStandardMaterial color="#deddd4" roughness={.95}/></mesh>
    <mesh position={[w/2,-.33,l/2]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#e9eae4"/></mesh><Grid position={[w/2,-.32,l/2]} args={[80,80]} cellSize={1} sectionSize={5} cellThickness={.45} sectionThickness={.7} cellColor="#d3d8cd" sectionColor="#c5cfc0" fadeDistance={50} infiniteGrid/>
    {floorPlan.rooms.map(r=><RoomMesh key={r.id} room={r} showCeiling={!cutaway} ceilingHeight={height} selected={selection?.type==='room'&&selection.id===r.id} onSelect={onSelect?()=>onSelect({type:'room',id:r.id}):undefined}/>)}
    {floorPlan.walls.map(w=>{const h=cutaway?Math.min(w.height,1.35):w.height;return <WallMesh key={w.id} wall={{...w,height:h}} doors={floorPlan.doors.filter(o=>o.wallId===w.id).map(o=>cutaway?{...o,height:Math.min(o.height,h)}:o)} windows={floorPlan.windows.filter(o=>o.wallId===w.id).map(o=>{if(!cutaway)return o;const sill=Math.min(o.sillHeight??0,h*.5);return {...o,sillHeight:sill,height:Math.min(o.height,h-sill)};})} selection={selection} onSelect={onSelect}/>;})}
    {floorPlan.columns.map(c=><mesh key={c.id} position={[c.position.x,(cutaway?Math.min(c.height,1.1):c.height)/2,c.position.y]} castShadow onClick={e=>{if(onSelect){e.stopPropagation();onSelect({type:'column',id:c.id});}}}><boxGeometry args={[c.width,cutaway?Math.min(c.height,1.1):c.height,c.depth]}/><meshStandardMaterial color={c.color??'#d3ccbd'}/>{selection?.type==='column'&&selection.id===c.id&&<Edges color="#dba14c"/>}</mesh>)}
    {floorPlan.stairs.map(s=><StairMesh key={s.id} stair={s} selected={selection?.type==='stair'&&selection.id===s.id} onSelect={onSelect?()=>onSelect({type:'stair',id:s.id}):undefined}/>)}
    {furnished&&(floorPlan.furniture??[]).map(item=><FurnitureMesh key={item.id} item={item} selected={selection?.type==='furniture'&&selection.id===item.id} onSelect={onSelect?()=>onSelect({type:'furniture',id:item.id}):undefined} editable={!!onEdit} gizmo={gizmo} onChange={onEdit?changes=>onEdit({type:'UPDATE_FURNITURE',id:item.id,changes}):undefined}/>)}
    {labels&&floorPlan.rooms.map(r=>{const p=polygonCentroid(r.boundary);return <Html key={r.id} position={[p.x,.08,p.y]} center zIndexRange={[10,0]} style={{pointerEvents:'none'}}><div className="scene-room-label">{r.name}</div></Html>;})}
  </>;
}
