import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { computeMoveDelta, KEY_TO_DIRECTION, MOVE_SPEED } from './movement';
import { buildCollisionSegments, PLAYER_RADIUS, resolveCircleAgainstWalls } from '../collision';
import { EYE_HEIGHT } from '../geometry';
import type { FloorPlan } from '../../../types/floorPlan';
// How quickly the camera's height settles onto the floor it's standing on.
// Framerate-independent via THREE.MathUtils.damp, not a fixed-fraction lerp.
const FLOOR_FOLLOW_RATE = 10;
const RAYCAST_START_HEIGHT = 3;
interface FirstPersonMovementProps {
  floorPlan: FloorPlan;
}
/**
* WASD/arrow-key movement: relative to where the camera is looking but
* flattened to the horizontal plane, resolved against the wall collision
* segments so you can walk through doors (and floor-level windows) but not
* through solid walls or a standard window's sill. Also keeps the camera's
* height settled on whatever floor mesh is beneath it via a downward
* raycast — a real mechanism, even though v1's single flat level means it
* currently always resolves to the same height everywhere.
*/
export function FirstPersonMovement({ floorPlan }: FirstPersonMovementProps) {
  const { camera, scene } = useThree();
  const pressed = useRef<Set<string>>(new Set());
  const collisionSegments = useMemo(() => buildCollisionSegments(floorPlan), [floorPlan]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (document.pointerLockElement && event.code in KEY_TO_DIRECTION) {
        event.preventDefault();
        pressed.current.add(event.code);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      pressed.current.delete(event.code);
    }
    function clearKeys() { pressed.current.clear(); }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('pointerlockchange', clearKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('pointerlockchange', clearKeys);
    };
  }, []);
  const lookDirection = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const rayOrigin = useRef(new THREE.Vector3());
  const downVector = useRef(new THREE.Vector3(0, -1, 0));
  useFrame((_, delta) => {
    if (document.pointerLockElement && pressed.current.size > 0) {
      camera.getWorldDirection(lookDirection.current);
      const move = computeMoveDelta(lookDirection.current, camera.up, pressed.current, MOVE_SPEED, Math.min(delta, 0.04));
      const desired = {
        x: camera.position.x + move.x,
        z: camera.position.z + move.z,
      };
      const resolved = resolveCircleAgainstWalls({ x: desired.x, z: desired.z, radius: PLAYER_RADIUS }, collisionSegments);
      // Three.js objects returned by useThree() aren't React state — R3F's
      // whole per-frame animation model is built on mutating them directly
      // inside useFrame instead of triggering a re-render 60 times a
      // second. The generic "don't modify a hook's return value" heuristic
      // doesn't know about that R3F-specific exception.
      // oxlint-disable-next-line react/immutability
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }
    rayOrigin.current.set(camera.position.x, camera.position.y + RAYCAST_START_HEIGHT, camera.position.z);
    raycaster.current.set(rayOrigin.current, downVector.current);
    const hits = raycaster.current.intersectObjects(scene.children, true);
    const floorHit = hits.find((hit) => hit.object.name === 'floor');
    const floorY = floorHit ? floorHit.point.y : 0;
    camera.position.y = THREE.MathUtils.damp(camera.position.y, floorY + EYE_HEIGHT, FLOOR_FOLLOW_RATE, delta);
  });
  return null;
}
