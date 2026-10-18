import type { Room } from '../../types/floorPlan';
import { polygonBounds } from '../../utils/geometry2d';
type Vec = [
  number,
  number,
  number
];
function Box({ position, size, color, roughness = .8 }: {
  position: Vec;
  size: Vec;
  color: string;
  roughness?: number;
}) { return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>; }
export function Furnishings({ room }: {
  room: Room;
}) {
  const { width, length } = polygonBounds(room.boundary);
  // Furniture is illustrative; only stage simple rectangular rooms with sufficient clearance.
  if (room.boundary.length !== 4 || width < 2.4 || length < 2.4 || new Set(room.boundary.map(p => p.x)).size !== 2 || new Set(room.boundary.map(p => p.y)).size !== 2)
    return null;
  const x = Math.min(...room.boundary.map(p => p.x)), z = Math.min(...room.boundary.map(p => p.y));
  const name = room.name.toLowerCase();
  if (/bed|suite/.test(name))
    return <group position={[x + .45, 0, z + .45]}>
  <Box position={[.85, .2, 1.12]} size={[1.7, .4, 2.15]} color="#99816a"/>
  <Box position={[.85, .45, 1.12]} size={[1.66, .17, 2.12]} color="#f7f4eb"/>
  <Box position={[.85, .59, 1.6]} size={[1.68, .11, 1.16]} color="#8b9c86"/>
  <Box position={[.85, .63, .05]} size={[1.76, 1.25, .09]} color="#bfab90"/>
  {[.43, 1.26].map(px => <Box key={px} position={[px, .59, .44]} size={[.68, .14, .46]} color="#ece5d6"/>)}
  <Box position={[2.12, .28, .33]} size={[.43, .56, .5]} color="#bca585"/>
  <mesh position={[2.12, .66, .33]}><sphereGeometry args={[.13, 16, 12]}/><meshStandardMaterial color="#efe1c0"/></mesh>
 </group>;
  if (/bath/.test(name))
    return <group position={[x + .4, 0, z + .4]}>
  <Box position={[.6, .18, .6]} size={[1.2, .36, 1.2]} color="#eeeeea" roughness={.3}/>
  <Box position={[.6, .38, .6]} size={[1, .02, 1]} color="#b2cfcc"/>
  <Box position={[width - 1.25, .42, .45]} size={[.65, .84, .7]} color="#c7baa5"/>
  <Box position={[width - 1.25, .86, .45]} size={[.68, .06, .74]} color="#f7f5ee"/>
  <mesh position={[width - 1.25, .9, .45]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.17, .035, 8, 24]}/><meshStandardMaterial color="#fff"/></mesh>
 </group>;
  if (/kitchen/.test(name))
    return <group position={[x + .35, 0, z + .35]}>
  <Box position={[1, .45, .32]} size={[2, .9, .64]} color="#637567"/>
  <Box position={[1, .93, .32]} size={[2.08, .07, .7]} color="#e4ded0" roughness={.35}/>
  <Box position={[1.45, .975, .32]} size={[.47, .015, .42]} color="#637b7d"/>
  <Box position={[.4, .977, .32]} size={[.5, .02, .45]} color="#323d3a"/>
  {width > 3.2 && length > 3.4 && <><Box position={[1.6, .42, 2.08]} size={[1.8, .84, .75]} color="#b5a185"/><Box position={[1.6, .87, 2.08]} size={[1.88, .06, .82]} color="#ece8de"/></>}
 </group>;
  if (/living|dining|lounge/.test(name))
    return <group position={[x + .5, 0, z + .7]}>
  <Box position={[1.45, .014, 1.6]} size={[2.8, .028, 2.6]} color="#e6dbc5"/>
  <Box position={[1.3, .26, .43]} size={[2.55, .5, .85]} color="#7b9180"/>
  <Box position={[1.3, .65, .05]} size={[2.55, .62, .16]} color="#7b9180"/>
  <Box position={[.1, .54, .43]} size={[.2, .42, .85]} color="#718877"/>
  <Box position={[2.5, .54, .43]} size={[.2, .42, .85]} color="#718877"/>
  {[.55, 1.3, 2.05].map(px => <Box key={px} position={[px, .54, .45]} size={[.69, .14, .69]} color="#91a18c"/>)}
  <Box position={[1.3, .3, 1.8]} size={[1.1, .6, .6]} color="#b9a17e"/>
  <mesh position={[1.3, .63, 1.8]}><cylinderGeometry args={[.13, .1, .06, 24]}/><meshStandardMaterial color="#eee5d7"/></mesh>
  <mesh position={[.3, .25, 3]}><cylinderGeometry args={[.2, .15, .5, 16]}/><meshStandardMaterial color="#d7c8b1"/></mesh>
  <mesh position={[.3, .78, 3]} castShadow><sphereGeometry args={[.42, 16, 16]}/><meshStandardMaterial color="#7c936a"/></mesh>
 </group>;
  return null;
}
