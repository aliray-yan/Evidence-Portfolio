import { polygonArea, polygonBounds } from '../../utils/geometry2d';
import { formatArea, formatLength } from '../../utils/units';
import type { LengthUnit, Room } from '../../types/floorPlan';
interface RoomInfoOverlayProps {
  room: Room;
  unit: LengthUnit;
}
export function RoomInfoOverlay({ room, unit }: RoomInfoOverlayProps) {
  const bounds = polygonBounds(room.boundary);
  const area = polygonArea(room.boundary);
  return (<div className="room-info-overlay">
   <strong>{room.name}</strong>
   <span>
    {formatLength(bounds.width, unit)} × {formatLength(bounds.length, unit)}
   </span>
   <span>Area: {formatArea(area, unit)}</span>
  </div>);
}
