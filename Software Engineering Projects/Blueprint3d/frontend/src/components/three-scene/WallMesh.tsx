import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { computeWallSegments, segmentTransform, wallLength, type OpeningSpan } from './geometry';
import { getMaterial } from './materials';
import type { Opening, Wall } from '../../types/floorPlan';
import type { Selection } from '../floor-plan-2d/types';
export function WallMesh({wall,doors,windows,selection,onSelect}:{wall:Wall;doors:Opening[];windows:Opening[];selection?:Selection|null;onSelect?:(s:Selection)=>void}) {
  const length=wallLength(wall),dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,material=getMaterial(wall.materialKey??'painted-wall');
  const segments=useMemo(()=>{
    const spans:OpeningSpan[]=[...doors.map(o=>({offset:o.offset,width:o.width,holeYStart:0,holeYEnd:o.height})),...windows.map(o=>({offset:o.offset,width:o.width,holeYStart:o.sillHeight??0,holeYEnd:(o.sillHeight??0)+o.height}))];
    return computeWallSegments(wall,spans);
  },[wall,doors,windows]);
  const click=(type:Selection['type'],id:string)=>(e:{stopPropagation:()=>void})=>{if(onSelect){e.stopPropagation();onSelect({type,id});}};
  return <group position={[(wall.start.x+wall.end.x)/2,0,(wall.start.y+wall.end.y)/2]} rotation={[0,-Math.atan2(dy,dx),0]}>
    {segments.map((segment,i)=>{const {position,dimensions}=segmentTransform(wall,segment);return <mesh key={i} position={position} castShadow receiveShadow onClick={click('wall',wall.id)}><boxGeometry args={dimensions}/><meshStandardMaterial color={wall.color??material.color} roughness={material.roughness}/>{selection?.type==='wall'&&selection.id===wall.id&&<Edges color="#dba14c"/>}</mesh>;})}
    {doors.map(o=>{
      const h=o.height,right=o.swing==='right',hinge=o.offset+(right?o.width:0)-length/2;
      const selected=selection?.type==='door'&&selection.id===o.id;
      if(o.swing==='none')return <mesh key={o.id} position={[o.offset+o.width/2-length/2,h*.95,0]} onClick={click('door',o.id)}><boxGeometry args={[o.width,.06,wall.thickness+.02]}/><meshStandardMaterial color={o.frameColor??'#b9aa95'}/>{selected&&<Edges color="#dba14c"/>}</mesh>;
      const sliding=o.swing==='sliding';
      return <group key={o.id} onClick={click('door',o.id)}>
       <group position={[o.offset+o.width/2-length/2,0,0]}>
        {[-1,1].map(side=><mesh key={side} position={[side*o.width/2,h/2,0]}><boxGeometry args={[.05,h,wall.thickness+.025]}/><meshStandardMaterial color={o.frameColor??'#b9aa95'}/></mesh>)}
        <mesh position={[0,h,0]}><boxGeometry args={[o.width+.05,.05,wall.thickness+.025]}/><meshStandardMaterial color={o.frameColor??'#b9aa95'}/></mesh>
       </group>
       <group position={[hinge-(sliding?o.width*Math.min(o.openAngle??80,90)/90:0),0,sliding?wall.thickness*.7:0]} rotation={[0,sliding?0:(right?-1:1)*(o.openAngle??80)*Math.PI/180,0]}>
        <mesh position={[(right?-1:1)*o.width/2,h/2,0]} castShadow><boxGeometry args={[o.width*.94,h*.97,.05]}/><meshStandardMaterial color={o.color??'#ad835c'} roughness={.68}/>{selected&&<Edges color="#dba14c"/>}</mesh>
        <mesh position={[(right?-1:1)*o.width*.87,h*.45,.055]}><sphereGeometry args={[.025,10,8]}/><meshStandardMaterial color="#c8b078" metalness={.7} roughness={.3}/></mesh>
       </group>
      </group>;
    })}
    {windows.map(o=>{
      const sill=o.sillHeight??0,h=o.height,x=o.offset+o.width/2-length/2;
      const selected=selection?.type==='window'&&selection.id===o.id;
      return <group key={o.id} position={[x,sill+h/2,0]} onClick={click('window',o.id)}>
        <mesh><boxGeometry args={[o.width,h,wall.thickness*.25]}/><meshStandardMaterial color={o.color??'#b9d5de'} transparent opacity={.42} roughness={.1} metalness={.2} depthWrite={false}/>{selected&&<Edges color="#dba14c"/>}</mesh>
        {[-1,1].map(s=><group key={s}><mesh position={[s*o.width/2,0,0]}><boxGeometry args={[.045,h+.07,wall.thickness*.8]}/><meshStandardMaterial color={o.frameColor??'#64716c'}/></mesh><mesh position={[0,s*h/2,0]}><boxGeometry args={[o.width+.04,.045,wall.thickness*.8]}/><meshStandardMaterial color={o.frameColor??'#64716c'}/></mesh></group>)}
        <mesh><boxGeometry args={[.025,h,wall.thickness*.6]}/><meshStandardMaterial color={o.frameColor??'#64716c'}/></mesh>
      </group>;
    })}
  </group>;
}
