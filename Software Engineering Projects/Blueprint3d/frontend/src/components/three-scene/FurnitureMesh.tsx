import { useRef } from 'react';
import { Edges, RoundedBox, TransformControls } from '@react-three/drei';
import type { Group } from 'three';
import type { Furniture } from '../../types/floorPlan';
type Vec=[number,number,number];
function Box({position,size,color}:{position:Vec;size:Vec;color:string}) {
  return <RoundedBox position={position} args={size} radius={Math.min(.045,...size.map(v=>v/5))} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.72}/></RoundedBox>;
}
export function FurnitureMesh({item,selected,onSelect,onChange,gizmo='translate',editable=false}:{item:Furniture;selected?:boolean;onSelect?:()=>void;onChange?:(changes:Partial<Furniture>)=>void;gizmo?:'translate'|'rotate';editable?:boolean}) {
  const group=useRef<Group>(null);
  const w=item.width,d=item.depth,h=item.height,c=item.color;
  let body;
  if(item.kind==='bed') body=<><Box position={[0,h*.35,0]} size={[w,h*.7,d]} color="#b49d82"/><Box position={[0,h*.85,0]} size={[w*.98,h*.3,d*.98]} color="#f2eee2"/><Box position={[0,h*1.08,d*.18]} size={[w,h*.12,d*.62]} color={c}/><Box position={[0,h*.95,-d/2]} size={[w+.04,h*1.9,.08]} color="#b8a78f"/>{[-1,1].map(side=><Box key={side} position={[side*w*.24,h*1.09,-d*.31]} size={[w*.4,h*.18,d*.23]} color="#fff9ef"/>)}</>;
  else if(item.kind==='sofa') body=<><Box position={[0,h*.3,0]} size={[w,h*.6,d]} color={c}/><Box position={[0,h*.73,-d*.4]} size={[w,h*.56,d*.18]} color={c}/>{[-1,1].map(s=><Box key={s} position={[s*w*.46,h*.66,0]} size={[w*.08,h*.35,d]} color={c}/>)}{[-1,0,1].map(s=><Box key={s} position={[s*w*.29,h*.63,.04]} size={[w*.27,h*.12,d*.7]} color={c}/>)}</>;
  else if(item.kind==='table') body=<><Box position={[0,h-.05,0]} size={[w,.1,d]} color={c}/>{[-1,1].flatMap(x=>[-1,1].map(y=><Box key={x+','+y} position={[x*w*.4,(h-.1)/2,y*d*.36]} size={[.07,h-.1,.07]} color="#856b4f"/>))}</>;
  else if(item.kind==='plant') body=<><mesh position={[0,h*.2,0]} castShadow><cylinderGeometry args={[w*.29,w*.23,h*.4,18]}/><meshStandardMaterial color="#ceba9d"/></mesh><mesh position={[0,h*.68,0]} scale={[w*.5,h*.38,d*.5]} castShadow><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={c}/></mesh></>;
  else if(item.kind==='toilet') body=<><mesh position={[0,h*.35,d*.1]} scale={[w*.5,h*.35,d*.5]} castShadow><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={c} roughness={.25}/></mesh><Box position={[0,h*.65,-d*.32]} size={[w,h*.7,d*.23]} color={c}/><mesh position={[0,h*.6,d*.12]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[w*.3,w*.08,12,30]}/><meshStandardMaterial color="#fcfaf2"/></mesh></>;
  else if(item.kind==='basin')body=<><Box position={[0,h*.45,0]} size={[w,h*.9,d]} color={c}/><Box position={[0,h*.94,0]} size={[w*1.04,h*.1,d*1.04]} color="#f0eee4"/><mesh position={[0,h*1.01,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[Math.min(w,d)*.3,.025,10,28]}/><meshStandardMaterial color="#9ca9ab"/></mesh></>;
  else if(item.kind==='car')body=<><Box position={[0,h*.38,0]} size={[w,h*.5,d]} color={c}/><Box position={[0,h*.75,-d*.05]} size={[w*.83,h*.48,d*.55]} color="#536978"/>{[-1,1].flatMap(x=>[-1,1].map(y=><mesh key={x+','+y} position={[x*w*.49,h*.23,y*d*.3]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[h*.22,h*.22,w*.1,24]}/><meshStandardMaterial color="#262b2e"/></mesh>))}</>;
  else body=<><Box position={[0,h/2,0]} size={[w,h,d]} color={c}/>{item.kind==='cabinet'&&<Box position={[0,h+.025,0]} size={[w+.05,.05,d+.05]} color="#e6e2d6"/>}{item.kind==='chair'&&<Box position={[0,h*.8,-d*.42]} size={[w,h*.45,d*.12]} color={c}/>}</>;
  return <><group ref={group} name={'furniture-'+item.id} position={[item.position.x,item.elevation??0,item.position.y]} rotation={[0,-item.rotation*Math.PI/180,0]} onClick={e=>{if(onSelect){e.stopPropagation();onSelect();}}}>{body}{selected&&<mesh position={[0,h*.6,0]}><boxGeometry args={[w+.08,h*1.25,d+.08]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/><Edges color="#dc9b45"/></mesh>}</group>
    {selected&&editable&&onChange&&<TransformControls object={group as React.RefObject<Group>} mode={gizmo} translationSnap={.05} rotationSnap={Math.PI/36} showX={gizmo==='translate'} showY={gizmo==='rotate'} showZ={gizmo==='translate'} size={.75} onMouseUp={()=>{const object=group.current;if(object)onChange({position:{x:object.position.x,y:object.position.z},rotation:-object.rotation.y*180/Math.PI,elevation:object.position.y});}}/>}
  </>;
}
