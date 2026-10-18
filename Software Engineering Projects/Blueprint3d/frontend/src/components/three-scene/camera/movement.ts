import * as THREE from 'three';
export const MOVE_SPEED = 3; // meters per second
export const KEY_TO_DIRECTION: Record<string, {
  right: number;
  forward: number;
}> = {
  KeyW: { right: 0, forward: 1 },
  ArrowUp: { right: 0, forward: 1 },
  KeyS: { right: 0, forward: -1 },
  ArrowDown: { right: 0, forward: -1 },
  KeyA: { right: -1, forward: 0 },
  ArrowLeft: { right: -1, forward: 0 },
  KeyD: { right: 1, forward: 0 },
  ArrowRight: { right: 1, forward: 0 },
};
/**
* Given the camera's current look direction and which movement keys are
* held, returns the position delta for this frame. Pulled out of the R3F
* component so it's plain, testable math — no camera/useFrame needed to
* verify it.
*/
export function computeMoveDelta(lookDirection: THREE.Vector3, up: THREE.Vector3, pressedCodes: Iterable<string>, speed: number, delta: number): THREE.Vector3 {
  const forward = lookDirection.clone().setY(0);
  if (forward.lengthSq() > 0) {
    forward.normalize();
  }
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  const move = new THREE.Vector3();
  for (const code of pressedCodes) {
    const direction = KEY_TO_DIRECTION[code];
    if (!direction) {
      continue;
    }
    move.addScaledVector(right, direction.right);
    move.addScaledVector(forward, direction.forward);
  }
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
  }
  return move;
}
