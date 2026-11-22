// Midnight Vault — the thief: movement, sneaking, tools and pickups.
// The thief moves with WASD / arrow keys or by clicking a spot to walk to. Holding Shift
// sneaks: half speed, half the alarm gained while seen. Q throws a smoke pellet, E loops
// the cameras. Both tools are limited, so spending them is the heist's real cost.

import { circleHitsWorld, EXIT, GEMS, IDOL, PLAYER_SPAWN } from './level.js';

export const PLAYER_RADIUS = 14;
export const WALK_SPEED = 165;
export const SNEAK_SPEED = 82;

export function createPlayer() {
  return {
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
    radius: PLAYER_RADIUS,
    facing: -Math.PI / 2,
    moving: false,
    sneaking: false,
    moveTarget: null,
    smokeLeft: 2,
    loopsLeft: 1,
    smokeClouds: [],
    loot: 0,
    gemsTaken: 0,
    idolTaken: false,
    steps: 0,
  };
}

function tryStep(player, dx, dy) {
  const nx = player.x + dx;
  if (!circleHitsWorld(nx, player.y, player.radius)) player.x = nx;
  const ny = player.y + dy;
  if (!circleHitsWorld(player.x, ny, player.radius)) player.y = ny;
}

// Direction from the held keys, or toward the clicked move target. Returns null when idle.
export function readMoveDirection(player, keys) {
  let dx = 0;
  let dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx !== 0 || dy !== 0) {
    player.moveTarget = null;
    const length = Math.hypot(dx, dy);
    return { x: dx / length, y: dy / length };
  }
  if (player.moveTarget) {
    const tx = player.moveTarget.x - player.x;
    const ty = player.moveTarget.y - player.y;
    const distance = Math.hypot(tx, ty);
    if (distance < 8) {
      player.moveTarget = null;
      return null;
    }
    return { x: tx / distance, y: ty / distance };
  }
  return null;
}

export function updatePlayer(player, keys, dt) {
  player.sneaking = keys.has('shift');
  const direction = readMoveDirection(player, keys);
  player.moving = direction !== null;
  if (direction) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    player.facing = Math.atan2(direction.y, direction.x);
    tryStep(player, direction.x * speed * dt, direction.y * speed * dt);
    player.steps += speed * dt;
  }
  for (const cloud of player.smokeClouds) cloud.life -= dt;
  player.smokeClouds = player.smokeClouds.filter((cloud) => cloud.life > 0);
}

// True when the thief stands inside any smoke cloud: unseen, even in a cone.
export function insideSmoke(player) {
  for (const cloud of player.smokeClouds) {
    const dx = player.x - cloud.x;
    const dy = player.y - cloud.y;
    if (dx * dx + dy * dy < cloud.radius * cloud.radius) return true;
  }
  return false;
}

// Q: drop a smoke pellet at the thief's feet. Returns false when none are left.
export function throwSmoke(player) {
  if (player.smokeLeft <= 0) return false;
  player.smokeLeft -= 1;
  player.smokeClouds.push({ x: player.x, y: player.y, radius: 95, life: 3.5 });
  return true;
}

// Pick up whatever loot the thief is standing on. Returns the value grabbed, or 0.
export function grabLoot(player) {
  let gained = 0;
  for (const gem of GEMS) {
    if (gem.taken) continue;
    const dx = player.x - gem.x;
    const dy = player.y - gem.y;
    if (dx * dx + dy * dy < 34 * 34) {
      gem.taken = true;
      player.gemsTaken += 1;
      player.loot += gem.value;
      gained += gem.value;
    }
  }
  if (!player.idolTaken) {
    const dx = player.x - IDOL.x;
    const dy = player.y - IDOL.y;
    if (dx * dx + dy * dy < 40 * 40) {
      player.idolTaken = true;
      player.loot += IDOL.value;
      gained += IDOL.value;
    }
  }
  return gained;
}

// True when the thief stands in the getaway doorway with the idol in hand.
export function atExit(player) {
  if (!player.idolTaken) return false;
  return (
    player.x > EXIT.x - 6 &&
    player.x < EXIT.x + EXIT.w + 6 &&
    player.y > EXIT.y - 6 &&
    player.y < EXIT.y + EXIT.h + 6
  );
}

export function resetLoot() {
  for (const gem of GEMS) gem.taken = false;
}
