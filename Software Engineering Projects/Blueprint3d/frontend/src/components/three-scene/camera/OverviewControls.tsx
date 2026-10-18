import { OrbitControls } from '@react-three/drei';
interface OverviewControlsProps {
  target: [
    number,
    number,
    number
  ];
  radius: number;
  top?:boolean;
}
/** Rotate, zoom, pan around the whole house — Step 6A of the spec. */
export function OverviewControls({ target, radius,top=false }: OverviewControlsProps) {
  return (<OrbitControls makeDefault enableRotate={!top} target={target} minDistance={radius * 0.3} maxDistance={radius * 8} maxPolarAngle={top ? Math.PI / 2 : Math.PI / 2 - 0.02}/>);
}
