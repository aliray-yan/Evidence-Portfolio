import type { Column, FloorPlan, Furniture, Opening, Point2D, Room, Stair, Wall } from '../../types/floorPlan';
export function createEmptyFloorPlan():FloorPlan {
  return {schemaVersion:1,unit:'m',plot:{width:10,length:10,marlaSquareFeet:272.25},walls:[],rooms:[],doors:[],windows:[],stairs:[],columns:[],furniture:[],metadata:{}};
}
export type FloorPlanAction =
  | {type:'REPLACE_ALL';floorPlan:FloorPlan}
  | {type:'SET_PLOT';plot:{width:number;length:number}}
  | {type:'SET_MARLA';squareFeet:number}
  | {type:'SET_METADATA';changes:Partial<FloorPlan['metadata']>}
  | {type:'ADD_WALL';wall:Wall}
  | {type:'UPDATE_WALL';id:string;changes:Partial<Omit<Wall,'id'>>}
  | {type:'DELETE_WALL';id:string}
  | {type:'ADD_ROOM';room:Room}
  | {type:'UPDATE_ROOM';id:string;changes:Partial<Omit<Room,'id'>>}
  | {type:'DELETE_ROOM';id:string}
  | {type:'ADD_OPENING';kind:'doors'|'windows';opening:Opening}
  | {type:'UPDATE_OPENING';kind:'doors'|'windows';id:string;changes:Partial<Omit<Opening,'id'>>}
  | {type:'DELETE_OPENING';kind:'doors'|'windows';id:string}
  | {type:'ADD_FURNITURE';item:Furniture}
  | {type:'UPDATE_FURNITURE';id:string;changes:Partial<Omit<Furniture,'id'>>}
  | {type:'DELETE_FURNITURE';id:string}
  | {type:'UPDATE_STAIR';id:string;changes:Partial<Omit<Stair,'id'>>}
  | {type:'UPDATE_COLUMN';id:string;changes:Partial<Omit<Column,'id'>>};
function changed(state:FloorPlan):FloorPlan {
  return {...state,metadata:{...state.metadata,accuracyStatus:'draft',verifiedAt:undefined}};
}
export function floorPlanReducer(state:FloorPlan,action:FloorPlanAction):FloorPlan {
  switch(action.type) {
    case 'REPLACE_ALL': return action.floorPlan;
    case 'SET_METADATA':return {...state,metadata:{...state.metadata,...action.changes}};
    case 'SET_MARLA':return Number.isFinite(action.squareFeet)&&action.squareFeet>0?{...state,plot:{...state.plot,marlaSquareFeet:action.squareFeet}}:state;
    case 'SET_PLOT': {
      if(!Number.isFinite(action.plot.width)||!Number.isFinite(action.plot.length)||action.plot.width<=0||action.plot.length<=0||action.plot.width>500||action.plot.length>500)return state;
      const sx=action.plot.width/state.plot.width,sy=action.plot.length/state.plot.length;
      const point=(p:Point2D)=>({x:Math.round(p.x*sx*1e6)/1e6,y:Math.round(p.y*sy*1e6)/1e6});
      const walls=state.walls.map(w=>({...w,start:point(w.start),end:point(w.end)}));
      const opening=(o:Opening)=>{const before=state.walls.find(w=>w.id===o.wallId),after=walls.find(w=>w.id===o.wallId);if(!before||!after)return o;const ratio=Math.hypot(after.end.x-after.start.x,after.end.y-after.start.y)/(Math.hypot(before.end.x-before.start.x,before.end.y-before.start.y)||1);return {...o,offset:o.offset*ratio,width:o.width*ratio};};
      const registration=state.metadata.imageRegistration;
      const metadata={...state.metadata,imageRegistration:registration?{...registration,pixelsPerMeter:registration.pixelsPerMeter/sx,pixelsPerMeterY:(registration.pixelsPerMeterY??registration.pixelsPerMeter)/sy}:undefined};
      return changed({...state,metadata,plot:{...state.plot,...action.plot},walls,rooms:state.rooms.map(r=>({...r,boundary:r.boundary.map(point),dimensionStatus:r.declaredSize?'review':r.dimensionStatus})),doors:state.doors.map(opening),windows:state.windows.map(opening),stairs:state.stairs.map(s=>({...s,boundary:s.boundary.map(point)})),columns:state.columns.map(c=>({...c,position:point(c.position),width:c.width*sx,depth:c.depth*sy})),furniture:state.furniture?.map(f=>({...f,position:point(f.position)}))});
    }
    case 'ADD_WALL':return changed({...state,walls:[...state.walls,action.wall]});
    case 'UPDATE_WALL': {
      const old=state.walls.find(w=>w.id===action.id);if(!old)return state;
      const next={...old,...action.changes};
      let rooms=state.rooms;
      if(action.changes.start||action.changes.end) {
        const dx=old.end.x-old.start.x,dy=old.end.y-old.start.y,length=Math.hypot(dx,dy);
        const nx=next.end.x-next.start.x,ny=next.end.y-next.start.y,nl=Math.hypot(nx,ny);
        if(length>.001&&nl>.001)rooms=rooms.map(r=>({...r,dimensionStatus:r.declaredSize?'review':r.dimensionStatus,boundary:r.boundary.map(p=>{
          const t=((p.x-old.start.x)*dx+(p.y-old.start.y)*dy)/(length*length),normal=((p.x-old.start.x)*(-dy)+(p.y-old.start.y)*dx)/length;
          if(t<-.03||t>1.03||Math.abs(normal)>old.thickness+.06)return p;
          return {x:next.start.x+t*nx-normal*ny/nl,y:next.start.y+t*ny+normal*nx/nl};
        })}));
      }
      return changed({...state,walls:state.walls.map(w=>w.id===action.id?next:w),rooms});
    }
    case 'DELETE_WALL':return changed({...state,walls:state.walls.filter(w=>w.id!==action.id),doors:state.doors.filter(o=>o.wallId!==action.id),windows:state.windows.filter(o=>o.wallId!==action.id)});
    case 'ADD_ROOM':return changed({...state,rooms:[...state.rooms,action.room]});
    case 'UPDATE_ROOM':return changed({...state,rooms:state.rooms.map(r=>r.id===action.id?{...r,...action.changes}:r)});
    case 'DELETE_ROOM':return changed({...state,rooms:state.rooms.filter(r=>r.id!==action.id),furniture:state.furniture?.filter(f=>f.roomId!==action.id)});
    case 'ADD_OPENING':return changed({...state,[action.kind]:[...state[action.kind],action.opening]});
    case 'UPDATE_OPENING':return changed({...state,[action.kind]:state[action.kind].map(o=>o.id===action.id?{...o,...action.changes}:o)});
    case 'DELETE_OPENING':return changed({...state,[action.kind]:state[action.kind].filter(o=>o.id!==action.id)});
    case 'ADD_FURNITURE':return {...state,furniture:[...(state.furniture??[]),action.item]};
    case 'UPDATE_FURNITURE':return {...state,furniture:(state.furniture??[]).map(f=>f.id===action.id?{...f,...action.changes}:f)};
    case 'DELETE_FURNITURE':return {...state,furniture:(state.furniture??[]).filter(f=>f.id!==action.id)};
    case 'UPDATE_STAIR':return changed({...state,stairs:state.stairs.map(s=>s.id===action.id?{...s,...action.changes}:s)});
    case 'UPDATE_COLUMN':return changed({...state,columns:state.columns.map(c=>c.id===action.id?{...c,...action.changes}:c)});
  }
}
