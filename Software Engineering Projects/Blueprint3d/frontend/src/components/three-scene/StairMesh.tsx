import { useMemo } from 'react';
import { Shape } from 'three';
import { Edges } from '@react-three/drei';
import type { Stair } from '../../types/floorPlan';
import { polygonBounds } from '../../utils/geometry2d';
export function StairMesh({stair,selected,onSelect}:{stair:Stair;selected?:boolean;onSelect?:()=>void}) {
  const bounds=polygonBounds(stair.boundary),x=Math.min(...stair.boundary.map(p=>p.x)),z=Math.min(...stair.boundary.map(p=>p.y));
  const count=Math.max(3,Math.min(40,stair.steps??16)),height=stair.height??2.8;
  const shapes=useMemo(()=>Array.from({length:count},(_,i)=>{const shape=new Shape(),radius=bounds.width/2,inner=radius*.38,a=Math.PI*i/count,b=Math.PI*(i+1)/count;shape.moveTo(inner*Math.cos(a),inner*Math.sin(a));shape.lineTo(radius*Math.cos(a),radius*Math.sin(a));shape.absarc(0,0,radius,a,b,false);shape.lineTo(inner*Math.cos(b),inner*Math.sin(b));shape.absarc(0,0,inner,b,a,true);shape.closePath();return shape;}),[bounds.width,count]);

  if(stair.shape==='u-shaped') {
    const first=Math.ceil(count/2),second=count-first,landing=Math.min(bounds.width/2,bounds.length*.4),run=bounds.length-landing,flight=(bounds.width-.12)/2;
    const parts=[{x:0,z:-bounds.length/2+landing/2,w:bounds.width,d:landing,h:first*height/count}];
    for(let i=0;i<first;i++)parts.push({x:-(flight+.12)/2,z:bounds.length/2-(i+.5)*run/first,w:flight,d:run/first,h:(i+1)*height/count});
    for(let i=0;i<second;i++)parts.push({x:(flight+.12)/2,z:-bounds.length/2+landing+(i+.5)*run/second,w:flight,d:run/second,h:(first+i+1)*height/count});
    return <group position={[x+bounds.width/2,0,z+bounds.length/2]} rotation={[0,-(stair.rotation??0)*Math.PI/180,0]} onClick={e=>{if(onSelect){e.stopPropagation();onSelect();}}}>{parts.map((p,i)=><mesh key={i} position={[p.x,p.h/2,p.z]} castShadow receiveShadow><boxGeometry args={[p.w,p.h,p.d]}/><meshStandardMaterial color={stair.color??'#bbaa89'} roughness={.75}/>{selected&&<Edges color="#da9c42"/>}</mesh>)}</group>;
  }

  return <group position={[x+bounds.width/2,0,z+(stair.shape==='curved'?bounds.length:bounds.length/2)]} rotation={[0,-(stair.rotation??0)*Math.PI/180,0]} onClick={e=>{if(onSelect){e.stopPropagation();onSelect();}}}>
    {Array.from({length:count},(_,i)=>stair.shape==='curved'?<mesh key={i} position={[0,i*height/count,0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow><extrudeGeometry args={[shapes[i],{depth:.1,bevelEnabled:false,steps:1}]}/><meshStandardMaterial color={stair.color??'#bbaa89'} roughness={.75}/>{selected&&<Edges color="#da9c42"/>}</mesh>:<mesh key={i} position={[0,(i+1)*height/count/2,-bounds.length/2+(i+.5)*bounds.length/count]} castShadow receiveShadow><boxGeometry args={[bounds.width,(i+1)*height/count,bounds.length/count]}/><meshStandardMaterial color={stair.color??'#bbaa89'} roughness={.75}/>{selected&&<Edges color="#da9c42"/>}</mesh>)}
  </group>;
}
