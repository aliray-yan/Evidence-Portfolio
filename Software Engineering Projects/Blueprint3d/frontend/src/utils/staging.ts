import type { FloorPlan, Furniture, FurnitureKind, Point2D, Room } from '../types/floorPlan';
import { pointInPolygon, polygonBounds } from './geometry2d';
export const FURNITURE_CATALOG:Record<FurnitureKind,{width:number;depth:number;height:number;color:string}> = {
  bed:{width:1.6,depth:2.1,height:.55,color:'#aabd9b'},sofa:{width:2.2,depth:.9,height:.85,color:'#7f9a87'},
  table:{width:1.1,depth:.6,height:.42,color:'#b68c65'},chair:{width:.55,depth:.6,height:.82,color:'#ad9575'},
  cabinet:{width:1.7,depth:.6,height:.92,color:'#6e8376'},wardrobe:{width:1.7,depth:.6,height:2.2,color:'#b19b7a'},
  toilet:{width:.5,depth:.7,height:.8,color:'#f4f3eb'},basin:{width:.7,depth:.5,height:.9,color:'#c4b49c'},
  plant:{width:.5,depth:.5,height:1.15,color:'#658a59'},car:{width:1.8,depth:4.2,height:1.4,color:'#576b7e'}
};
function corners(item:Furniture) {
  const r=item.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return [-1,1].flatMap(x=>[-1,1].map(y=>({x:item.position.x+x*item.width/2*c-y*item.depth/2*s,y:item.position.y+x*item.width/2*s+y*item.depth/2*c})));
}
export function furnitureFits(item:Furniture,room:Room) {
  return [...corners(item),item.position].every(p=>pointInPolygon(p,room.boundary));
}
function overlaps(a:Furniture,b:Furniture) {
  // Conservative circle broadphase followed by axis-aligned footprint bounds.
  const aa=corners(a),bb=corners(b);
  return Math.max(...aa.map(p=>p.x))>Math.min(...bb.map(p=>p.x))-.1 &&
    Math.min(...aa.map(p=>p.x))<Math.max(...bb.map(p=>p.x))+.1 &&
    Math.max(...aa.map(p=>p.y))>Math.min(...bb.map(p=>p.y))-.1 &&
    Math.min(...aa.map(p=>p.y))<Math.max(...bb.map(p=>p.y))+.1;
}
function nearOpening(item:Furniture,plan:FloorPlan) {
  return plan.doors.some(o=>{
    const w=plan.walls.find(w=>w.id===o.wallId);if(!w)return false;
    const l=Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y),t=(o.offset+o.width/2)/l;
    const p={x:w.start.x+(w.end.x-w.start.x)*t,y:w.start.y+(w.end.y-w.start.y)*t};
    return Math.hypot(item.position.x-p.x,item.position.y-p.y)<Math.max(item.width,item.depth)/2+.3;
  });
}
function nearStair(item:Furniture,plan:FloorPlan){return plan.stairs.some(s=>{const xs=s.boundary.map(p=>p.x),ys=s.boundary.map(p=>p.y);const c=corners(item);return Math.max(...c.map(p=>p.x))>Math.min(...xs)&&Math.min(...c.map(p=>p.x))<Math.max(...xs)&&Math.max(...c.map(p=>p.y))>Math.min(...ys)&&Math.min(...c.map(p=>p.y))<Math.max(...ys);});}
export function makeFurniture(kind:FurnitureKind,position:Point2D,roomId?:string):Furniture {
  return {id:crypto.randomUUID(),name:kind[0].toUpperCase()+kind.slice(1),kind,position,roomId,rotation:0,...FURNITURE_CATALOG[kind],source:'manual'};
}
export function stagePlan(plan:FloorPlan,replace=false):FloorPlan {
  const furniture: Furniture[]=replace?[]:[...(plan.furniture??[])];
  for(const room of plan.rooms) {
    if(!replace&&furniture.some(f=>f.roomId===room.id))continue;
    const name=room.name.toLowerCase(), kinds:FurnitureKind[]=/bed|suite/.test(name)?['bed','wardrobe']:/wardrobe/.test(name)?['wardrobe']:/bath/.test(name)?['toilet','basin']:/kitchen/.test(name)?['cabinet','table']:/porch|garage/.test(name)?['car']:/living|lounge|drawing|dining/.test(name)?['sofa','table','plant']:/laundry/.test(name)?['cabinet']:[];
    const {width,length}=polygonBounds(room.boundary);
    const x=Math.min(...room.boundary.map(p=>p.x)),y=Math.min(...room.boundary.map(p=>p.y));
    for(const kind of kinds) {
      const spec=FURNITURE_CATALOG[kind];let placed=false;
      for(const rotation of [0,90]) {
        if(placed)break;
        for(let row=1;row<11&&!placed;row++)for(let col=1;col<11&&!placed;col++) {
          const item: Furniture={id:crypto.randomUUID(),kind,name:`${room.name} · ${kind}`,roomId:room.id,position:{x:x+width*col/12,y:y+length*row/12},rotation,...spec,source:'proposed'};
          if(furnitureFits(item,room)&&!furniture.some(f=>overlaps(item,f))&&!nearOpening(item,plan)&&!nearStair(item,plan)) {furniture.push(item);placed=true;}
        }
      }
    }
  }
  return {...plan,furniture,metadata:{...plan.metadata,stagingApplied:true}};
}
export function proposeWindows(plan:FloorPlan):FloorPlan {
  if(plan.windows.length)return plan;
  const windows=plan.walls.filter(w=>w.type==='exterior').flatMap(w=>{
    const l=Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y);
    if(l<2.2)return [];
    const rooms=plan.rooms.filter(r=>!r.outdoor&&r.boundary.some(p=>{
      const dx=w.end.x-w.start.x,dy=w.end.y-w.start.y,t=Math.max(0,Math.min(1,((p.x-w.start.x)*dx+(p.y-w.start.y)*dy)/(l*l)));
      return Math.hypot(p.x-(w.start.x+t*dx),p.y-(w.start.y+t*dy))<.6;
    }));
    if(!rooms.length)return [];
    const width=/bath/.test(rooms[0].name.toLowerCase())?.65:1.25;
    const offset=(l-width)/2;
    if(plan.doors.some(o=>o.wallId===w.id&&Math.max(offset,o.offset)<Math.min(offset+width,o.offset+o.width)))return [];
    return [{id:crypto.randomUUID(),wallId:w.id,offset,width,height:1.15,sillHeight:.95,color:'#b9d5de',frameColor:'#627271',source:'proposed' as const,confidence:0}];
  });
  return {...plan,windows};
}

/** Stage fresh server drafts once, and preserve deliberate object deletions. */
export function prepareForViewer(plan:FloorPlan):FloorPlan {
  if(plan.metadata.stagingApplied)return plan;
  return plan.furniture===undefined||plan.metadata.analysisEngine==='cv-ocr'?stagePlan(proposeWindows(plan)):plan;
}
