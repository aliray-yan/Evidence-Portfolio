import { useLayoutEffect,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import type { FloorPlan,Room } from '../../../types/floorPlan';
import { EYE_HEIGHT } from '../geometry';
import { roomInteriorPoint,roomViewPoint } from '../../../utils/geometry2d';
export function CameraRig({plan,mode,room,touring}:{plan:FloorPlan;mode:string;room:Room|null;touring:boolean}) {
  const {camera,size}=useThree(),angle=useRef(0),width=plan.plot.width,length=plan.plot.length,boundary=room?.boundary;
  useLayoutEffect(()=>{
    angle.current=-Math.PI/4;const c:[number,number,number]=[width/2,1.2,length/2];
    const p=boundary?(mode==='room'?roomViewPoint(boundary):roomInteriorPoint(boundary)):{x:c[0],y:c[2]};
    if('fov' in camera) {
      // Three.js cameras are mutable scene objects.
      // oxlint-disable-next-line react/immutability
      camera.fov=(mode==='overview'||mode==='plan')?45:70;
    }
    if(mode==='overview'||mode==='plan'){const aspect=size.width/Math.max(1,size.height),tan=Math.tan(Math.PI/8),projected=(width+length)/Math.sqrt(2),distance=Math.max(projected/(2*tan*aspect),(projected*.54+2.8)/(2*tan))*1.16;camera.up.set(0,1,0);if(mode==='plan'){const topDistance=Math.max(length,width/aspect)/(2*tan)*1.1;camera.up.set(0,0,-1);camera.position.set(c[0],topDistance,c[2]+.001);camera.lookAt(c[0],0,c[2]);}else{camera.position.set(c[0]+distance*.598,c[1]+distance*.536,c[2]+distance*.598);camera.lookAt(...c);}}
    else {camera.up.set(0,1,0);camera.position.set(p.x,EYE_HEIGHT,p.y);camera.lookAt(p.x-1,EYE_HEIGHT-.35,p.y-1);}
    camera.updateProjectionMatrix();
  },[camera,width,length,mode,boundary,size.width,size.height]);
  useFrame((_,delta)=>{if(touring&&boundary){angle.current+=Math.min(delta,.05)*.22;const p=roomViewPoint(boundary);camera.lookAt(p.x+Math.sin(angle.current),EYE_HEIGHT-.25,p.y-Math.cos(angle.current));}});
  return null;
}
