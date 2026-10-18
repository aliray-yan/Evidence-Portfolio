import { OrbitControls } from '@react-three/drei';
import { roomViewPoint } from '../../../utils/geometry2d';
import { EYE_HEIGHT } from '../geometry';
import type { Room } from '../../../types/floorPlan';
interface RoomViewControlsProps {
  room: Room;
}
/**
* "Enter a room and look around 360°" (spec Step 7) — rotation only, no
* pan/zoom. OrbitControls fundamentally orbits the camera around a target
* at some distance; locking that distance to a hair's width turns
* "orbiting" into "standing at one point and turning your head," which is
* what this mode is going for without the pointer-lock first-person
* controller Phase 9 adds.
*/
export function RoomViewControls({ room }: RoomViewControlsProps) {
  const centroid = roomViewPoint(room.boundary);
  const target: [
    number,
    number,
    number
  ] = [centroid.x - 0.007, EYE_HEIGHT - 0.0025, centroid.y - 0.007];
  return (<OrbitControls target={target} enableZoom={false} enablePan={false} minDistance={0.01} maxDistance={0.01}/>);
}
