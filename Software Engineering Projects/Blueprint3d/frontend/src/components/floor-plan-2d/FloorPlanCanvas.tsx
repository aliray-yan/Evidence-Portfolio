import { useEffect, useState, type Dispatch, type PointerEvent as ReactMouseEvent, type MouseEvent } from 'react';
import type { FloorPlan, Opening, Point2D, Wall } from '../../types/floorPlan';
import type { FloorPlanAction } from './floorPlanReducer';
import type { Selection, Tool } from './types';
const PX_PER_METER = 40;
const GRID_STEP_METERS = 0.5;
const SNAP_METERS = 0.1;
function snap(value: number): number {
  return Math.round(Math.round(value / SNAP_METERS) * SNAP_METERS * 1000) / 1000;
}
function openingSegment(wall: Wall, opening: Opening): {
  start: Point2D;
  end: Point2D;
} {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    start: { x: wall.start.x + ux * opening.offset, y: wall.start.y + uy * opening.offset },
    end: {
      x: wall.start.x + ux * (opening.offset + opening.width),
      y: wall.start.y + uy * (opening.offset + opening.width),
    },
  };
}
interface FloorPlanCanvasProps {
  floorPlan: FloorPlan;
  dispatch: Dispatch<FloorPlanAction>;
  tool: Tool;
  selection: Selection | null;
  onSelectionChange: (selection: Selection | null) => void;
  sourceImage?: string;
  showSource?: boolean;
}
export function FloorPlanCanvas({ floorPlan, dispatch, tool, selection, onSelectionChange, sourceImage, showSource, }: FloorPlanCanvasProps) {
  const [pendingWallStart, setPendingWallStart] = useState<Point2D | null>(null);
  const [pendingRoomPoints, setPendingRoomPoints] = useState<Point2D[]>([]);
  const [dragHandle, setDragHandle] = useState<{
    wallId: string;
    end: 'start' | 'end';
  } | null>(null);
  const widthPx = Math.max(floorPlan.plot.width * PX_PER_METER, 200);
  const heightPx = Math.max(floorPlan.plot.length * PX_PER_METER, 200);
  useEffect(() => { const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') {
    setPendingRoomPoints([]);
    setPendingWallStart(null);
    setDragHandle(null);
  } }; window.addEventListener('keydown', cancel); return () => window.removeEventListener('keydown', cancel); }, []);
  function toWorld(event: ReactMouseEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>): Point2D {
    const svg = event.currentTarget;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const matrix = svg.getScreenCTM();
    const local = matrix ? p.matrixTransform(matrix.inverse()) : p;
    return {
      x: Math.max(0, Math.min(floorPlan.plot.width, snap(local.x / PX_PER_METER))),
      y: Math.max(0, Math.min(floorPlan.plot.length, snap(local.y / PX_PER_METER))),
    };
  }
  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const point = toWorld(event);
    if (tool === 'wall') {
      if (!pendingWallStart) {
        setPendingWallStart(point);
      }
      else {
        if (pendingWallStart.x !== point.x || pendingWallStart.y !== point.y) {
          dispatch({
            type: 'ADD_WALL',
            wall: {
              id: crypto.randomUUID(),
              start: pendingWallStart,
              end: point,
              thickness: 0.2,
              height: 2.7,
              type: 'interior',
            },
          });
        }
        setPendingWallStart(null);
      }
      return;
    }
    if (tool === 'room') {
      const first = pendingRoomPoints[0];
      const closesLoop = first !== undefined &&
        Math.hypot(point.x - first.x, point.y - first.y) < SNAP_METERS * 2 &&
        pendingRoomPoints.length >= 3;
      if (closesLoop) {
        dispatch({
          type: 'ADD_ROOM',
          room: { id: crypto.randomUUID(), name: 'Room', boundary: pendingRoomPoints },
        });
        setPendingRoomPoints([]);
      }
      else {
        setPendingRoomPoints((points) => [...points, point]);
      }
      return;
    }
    onSelectionChange(null);
  }
  function handleWallHandleDown(wallId: string, end: 'start' | 'end', event: ReactMouseEvent) {
    event.stopPropagation();
    if (tool !== 'select') {
      return;
    }
    onSelectionChange({ type: 'wall', id: wallId });
    (event.currentTarget as Element).closest('svg')?.setPointerCapture(event.pointerId);
    setDragHandle({ wallId, end });
  }
  function handleCanvasMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    if (!dragHandle) {
      return;
    }
    const point = toWorld(event);
    const changes = dragHandle.end === 'start' ? { start: point } : { end: point };
    dispatch({ type: 'UPDATE_WALL', id: dragHandle.wallId, changes });
  }
  function handleCanvasMouseUp() {
    setDragHandle(null);
  }
  const gridLinesV = [];
  for (let x = 0; x <= floorPlan.plot.width; x += GRID_STEP_METERS) {
    gridLinesV.push(x);
  }
  const gridLinesH = [];
  for (let y = 0; y <= floorPlan.plot.length; y += GRID_STEP_METERS) {
    gridLinesH.push(y);
  }
  return (<svg className="floor-plan-canvas" width={widthPx} height={heightPx} viewBox={`-12 -12 ${widthPx + 24} ${heightPx + 24}`} role="img" aria-label="Editable floor plan. Select an element to edit it, or choose Add wall or Add room." onClick={handleCanvasClick} onPointerMove={handleCanvasMouseMove} onPointerUp={handleCanvasMouseUp} onPointerCancel={handleCanvasMouseUp}>
   {showSource&&sourceImage&&floorPlan.metadata.imageRegistration&&<image href={sourceImage} x={-floorPlan.metadata.imageRegistration.left/floorPlan.metadata.imageRegistration.pixelsPerMeter*PX_PER_METER} y={-floorPlan.metadata.imageRegistration.top/(floorPlan.metadata.imageRegistration.pixelsPerMeterY??floorPlan.metadata.imageRegistration.pixelsPerMeter)*PX_PER_METER} width={floorPlan.metadata.imageRegistration.width/floorPlan.metadata.imageRegistration.pixelsPerMeter*PX_PER_METER} height={floorPlan.metadata.imageRegistration.height/(floorPlan.metadata.imageRegistration.pixelsPerMeterY??floorPlan.metadata.imageRegistration.pixelsPerMeter)*PX_PER_METER} opacity={.65} style={{pointerEvents:'none'}}/>}
   {gridLinesV.map((x) => (<line key={`v-${x}`} x1={x * PX_PER_METER} y1={0} x2={x * PX_PER_METER} y2={floorPlan.plot.length * PX_PER_METER} className="floor-plan-canvas__grid-line"/>))}
   {gridLinesH.map((y) => (<line key={`h-${y}`} x1={0} y1={y * PX_PER_METER} x2={floorPlan.plot.width * PX_PER_METER} y2={y * PX_PER_METER} className="floor-plan-canvas__grid-line"/>))}

   <rect x={0} y={0} width={floorPlan.plot.width * PX_PER_METER} height={floorPlan.plot.length * PX_PER_METER} className="floor-plan-canvas__plot"/>

   {floorPlan.rooms.map((room) => (<polygon key={room.id} fillOpacity={showSource?.12:1} points={room.boundary.map((p) => `${p.x * PX_PER_METER},${p.y * PX_PER_METER}`).join(' ')} className={`floor-plan-canvas__room${selection?.type === 'room' && selection.id === room.id ? ' is-selected' : ''}`} onClick={(event) => {
        if (tool === 'select') {
          event.stopPropagation();
          onSelectionChange({ type: 'room', id: room.id });
        }
      }}/>))}
   {floorPlan.rooms.map((room) => {
      const cx = room.boundary.reduce((sum, p) => sum + p.x, 0) / room.boundary.length;
      const cy = room.boundary.reduce((sum, p) => sum + p.y, 0) / room.boundary.length;
      return (<text key={`${room.id}-label`} x={cx * PX_PER_METER} y={cy * PX_PER_METER} className="floor-plan-canvas__room-label">
      {room.name}
     </text>);
    })}

   {pendingRoomPoints.length > 0 && (<polyline points={pendingRoomPoints.map((p) => `${p.x * PX_PER_METER},${p.y * PX_PER_METER}`).join(' ')} className="floor-plan-canvas__pending"/>)}

   {floorPlan.walls.map((wall) => (<g key={wall.id}>
     <line x1={wall.start.x * PX_PER_METER} y1={wall.start.y * PX_PER_METER} x2={wall.end.x * PX_PER_METER} y2={wall.end.y * PX_PER_METER} strokeWidth={Math.max(wall.thickness * PX_PER_METER, 2)} className={`floor-plan-canvas__wall floor-plan-canvas__wall--${wall.type}${selection?.type === 'wall' && selection.id === wall.id ? ' is-selected' : ''}`} onClick={(event) => {
        if (tool === 'select') {
          event.stopPropagation();
          onSelectionChange({ type: 'wall', id: wall.id });
        }
      }}/>
     {selection?.type === 'wall' && selection.id === wall.id && tool === 'select' && (<>
       <circle cx={wall.start.x * PX_PER_METER} cy={wall.start.y * PX_PER_METER} r={5} onClick={(event) => event.stopPropagation()} className="floor-plan-canvas__handle" onPointerDown={(event) => handleWallHandleDown(wall.id, 'start', event)}/>
       <circle cx={wall.end.x * PX_PER_METER} cy={wall.end.y * PX_PER_METER} r={5} onClick={(event) => event.stopPropagation()} className="floor-plan-canvas__handle" onPointerDown={(event) => handleWallHandleDown(wall.id, 'end', event)}/>
      </>)}
    </g>))}

   {floorPlan.doors.map((door) => {
      const wall = floorPlan.walls.find((w) => w.id === door.wallId);
      if (!wall) {
        return null;
      }
      const segment = openingSegment(wall, door);
      return (<line key={door.id} x1={segment.start.x * PX_PER_METER} y1={segment.start.y * PX_PER_METER} x2={segment.end.x * PX_PER_METER} y2={segment.end.y * PX_PER_METER} className={`floor-plan-canvas__opening floor-plan-canvas__opening--door${selection?.type === 'door' && selection.id === door.id ? ' is-selected' : ''}`} onClick={(event) => {
          if (tool === 'select') {
            event.stopPropagation();
            onSelectionChange({ type: 'door', id: door.id });
          }
        }}/>);
    })}
   {floorPlan.windows.map((win) => {
      const wall = floorPlan.walls.find((w) => w.id === win.wallId);
      if (!wall) {
        return null;
      }
      const segment = openingSegment(wall, win);
      return (<line key={win.id} x1={segment.start.x * PX_PER_METER} y1={segment.start.y * PX_PER_METER} x2={segment.end.x * PX_PER_METER} y2={segment.end.y * PX_PER_METER} className={`floor-plan-canvas__opening floor-plan-canvas__opening--window${selection?.type === 'window' && selection.id === win.id ? ' is-selected' : ''}`} onClick={(event) => {
          if (tool === 'select') {
            event.stopPropagation();
            onSelectionChange({ type: 'window', id: win.id });
          }
        }}/>);
    })}

   {(floorPlan.furniture??[]).map(item=><g key={item.id} transform={`translate(${item.position.x*PX_PER_METER} ${item.position.y*PX_PER_METER}) rotate(${item.rotation})`} onClick={event=>{if(tool==='select'){event.stopPropagation();onSelectionChange({type:'furniture',id:item.id});}}}><rect x={-item.width*PX_PER_METER/2} y={-item.depth*PX_PER_METER/2} width={item.width*PX_PER_METER} height={item.depth*PX_PER_METER} rx={3} fill={item.color} fillOpacity={.8} stroke={selection?.type==='furniture'&&selection.id===item.id?'#d89443':'#6e7a63'} strokeWidth={selection?.id===item.id?2:1}/><text textAnchor='middle' y={3} fontSize={8} fill='#334635' style={{pointerEvents:'none'}}>{item.kind}</text></g>)}
   {pendingWallStart && (<circle cx={pendingWallStart.x * PX_PER_METER} cy={pendingWallStart.y * PX_PER_METER} r={4} className="floor-plan-canvas__pending-point"/>)}
  </svg>);
}
