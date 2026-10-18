import { useEffect, useRef, type ComponentRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { FirstPersonMovement } from './FirstPersonMovement';
import type { FloorPlan } from '../../../types/floorPlan';
interface FirstPersonControlsProps {
  floorPlan: FloorPlan;
  onLockChange: (locked: boolean) => void;
  registerLock: (lockFn: () => void) => void;
}
export function FirstPersonControls({ floorPlan, onLockChange, registerLock, }: FirstPersonControlsProps) {
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null);
  useEffect(() => {
    const controls = controlsRef.current;
    registerLock(() => controls?.lock());
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') controls?.unlock(); };
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('keydown', onEscape); controls?.unlock(); registerLock(() => { }); };
  }, [registerLock]);
  return (<>
   <PointerLockControls ref={controlsRef} onLock={() => onLockChange(true)} onUnlock={() => onLockChange(false)}/>
   <FirstPersonMovement floorPlan={floorPlan}/>
  </>);
}
