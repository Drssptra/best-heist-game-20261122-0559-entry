// Midnight Vault — the security cameras: wall-mounted, sweeping their sight-line back
// and forth across the hall. A camera that sees the thief feeds the alarm just like a
// guard's eyes do. The loop device (E) freezes every camera on a still frame for a while,
// so the thief can cross a watched lane in the open.

import { CAMERA_SPOTS, lineBlocked } from './level.js';

export const LOOP_SECONDS = 8;

export function createCameras() {
  return CAMERA_SPOTS.map((spot) => ({
    name: spot.name,
    x: spot.x,
    y: spot.y,
    baseAngle: spot.baseAngle,
    sweep: spot.sweep,
    sweepSpeed: spot.sweepSpeed,
    range: spot.range,
    halfAngle: spot.halfAngle,
    angle: spot.baseAngle,
    phase: 0,
    loopLeft: 0,
    seesPlayer: false,
  }));
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this camera see the thief right now? A looped camera sees nothing.
export function cameraSeesPlayer(camera, player, smoked) {
  if (camera.loopLeft > 0 || smoked) return false;
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const distance = Math.hypot(dx, dy);
  if (distance > camera.range) return false;
  const angleToPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToPlayer, camera.angle)) > camera.halfAngle) return false;
  if (lineBlocked(camera.x, camera.y, player.x, player.y)) return false;
  return true;
}

export function updateCameras(cameras, player, smoked, dt) {
  let anySees = false;
  for (const camera of cameras) {
    if (camera.loopLeft > 0) {
      camera.loopLeft -= dt;
    } else {
      camera.phase += dt * camera.sweepSpeed;
      camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
    }
    camera.seesPlayer = cameraSeesPlayer(camera, player, smoked);
    if (camera.seesPlayer) anySees = true;
  }
  return anySees;
}

// Freeze every camera for LOOP_SECONDS. Returns false when the loop device is spent.
export function loopCameras(cameras, player) {
  if (player.loopsLeft <= 0) return false;
  player.loopsLeft -= 1;
  for (const camera of cameras) camera.loopLeft = LOOP_SECONDS;
  return true;
}

export function anyCameraLooped(cameras) {
  return cameras.some((camera) => camera.loopLeft > 0);
}
