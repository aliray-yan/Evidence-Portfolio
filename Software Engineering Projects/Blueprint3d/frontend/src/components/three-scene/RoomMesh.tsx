import { useEffect,useMemo } from 'react';
import { DoubleSide } from 'three';
import { roomShape } from './geometry';
import { getMaterial } from './materials';
import type { Room } from '../../types/floorPlan';
import { createFloorTexture } from './FloorTexture';
export function RoomMesh({room,showCeiling=true,ceilingHeight=2.8,selected=false,onSelect}:{room:Room;showCeiling?:boolean;ceilingHeight?:number;selected?:boolean;onSelect?:()=>void}) {
  const shape=useMemo(()=>roomShape(room.boundary),[room.boundary]),material=getMaterial(room.floorMaterialKey??'wood');
  const texture=useMemo(()=>['wood','tile'].includes(room.floorMaterialKey??'wood')?createFloorTexture(room.floorMaterialKey??'wood'):null,[room.floorMaterialKey]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  const click=(e:{stopPropagation:()=>void})=>{if(onSelect){e.stopPropagation();onSelect();}};
  return <group><mesh name="floor" rotation={[Math.PI/2,0,0]} receiveShadow onClick={click}><shapeGeometry args={[shape]}/><meshStandardMaterial color={room.floorColor??(texture?'#ffffff':material.color)} map={texture} roughness={material.roughness} metalness={material.metalness} side={DoubleSide}/></mesh>
    {selected&&<mesh position={[0,.014,0]} rotation={[Math.PI/2,0,0]}><shapeGeometry args={[shape]}/><meshBasicMaterial color="#d5ac4c" transparent opacity={.16} side={DoubleSide} depthWrite={false}/></mesh>}
    {showCeiling&&!room.outdoor&&<mesh name="ceiling" position={[0,room.ceilingHeight??ceilingHeight,0]} rotation={[Math.PI/2,0,0]} onClick={click}><shapeGeometry args={[shape]}/><meshStandardMaterial color={room.ceilingColor??'#f0ede5'} roughness={.85} side={DoubleSide}/></mesh>}
  </group>;
}
