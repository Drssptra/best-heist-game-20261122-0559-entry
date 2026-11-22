// Midnight Vault — the guards: patrols, vision cones, investigation and the chase.
// A guard walks its waypoints and looks where it walks. When the thief is inside its cone
// with a clear line of sight, the guard raises the alarm; when the alarm trips, every guard
// runs to the thief's last seen spot, and a guard that reaches the thief ends the heist.

import { GUARD_PATROLS, lineBlocked } from './level.js';

export const GUARD_RADIUS = 15;
export const CHASE_SPEED = 132;
export const CATCH_DISTANCE = 22;

export function createGuards() {
  return GUARD_PATROLS.map((patrol) => ({
    name: patrol.name,
    waypoints: patrol.waypoints,
    waypointIndex: 1,
    x: patrol.waypoints[0].x,
    y: patrol.waypoints[0].y,
    facing: 0,
    speed: patrol.speed,
    range: patrol.range,
    halfAngle: patrol.halfAngle,
    color: patrol.color,
    pauseLeft: 0,
    mode: 'patrol',
    investigateX: 0,
    investigateY: 0,
    seesPlayer: false,
    lookTimer: 0,
  }));
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetAngle, dt) {
  const diff = angleDifference(targetAngle, guard.facing);
  const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  guard.facing += turn;
}

// Can this guard see the thief right now? Range, cone angle and a clear line of sight.
export function guardSeesPlayer(guard, player, smoked) {
  if (smoked) return false;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > guard.range) return false;
  const angleToPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToPlayer, guard.facing)) > guard.halfAngle) return false;
  if (lineBlocked(guard.x, guard.y, player.x, player.y)) return false;
  return true;
}

function patrolStep(guard, dt) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 6) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = 0.9;
    return;
  }
  const moveAngle = Math.atan2(dy, dx);
  turnToward(guard, moveAngle, dt);
  guard.x += (dx / distance) * guard.speed * dt;
  guard.y += (dy / distance) * guard.speed * dt;
}

function chaseStep(guard, targetX, targetY, speed, dt) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return;
  const moveAngle = Math.atan2(dy, dx);
  turnToward(guard, moveAngle, dt);
  guard.x += (dx / distance) * speed * dt;
  guard.y += (dy / distance) * speed * dt;
}

// Send every guard to the thief's last seen position.
export function sendGuardsToInvestigate(guards, x, y) {
  for (const guard of guards) {
    guard.mode = 'investigate';
    guard.investigateX = x;
    guard.investigateY = y;
  }
}

// Stand the guards down: back to their patrol routes.
export function calmGuards(guards) {
  for (const guard of guards) {
    if (guard.mode !== 'patrol') guard.mode = 'return';
  }
}

export function updateGuards(guards, player, alarmed, smoked, dt) {
  let anySees = false;
  for (const guard of guards) {
    guard.seesPlayer = guardSeesPlayer(guard, player, smoked);
    if (guard.seesPlayer) anySees = true;
    if (alarmed) {
      chaseStep(guard, player.x, player.y, CHASE_SPEED, dt);
    } else if (guard.mode === 'investigate') {
      chaseStep(guard, guard.investigateX, guard.investigateY, guard.speed * 1.5, dt);
      const dx = guard.investigateX - guard.x;
      const dy = guard.investigateY - guard.y;
      if (Math.hypot(dx, dy) < 14) {
        guard.mode = 'return';
        guard.lookTimer = 1.6;
      }
    } else if (guard.mode === 'return') {
      const home = guard.waypoints[0];
      chaseStep(guard, home.x, home.y, guard.speed, dt);
      const dx = home.x - guard.x;
      const dy = home.y - guard.y;
      if (Math.hypot(dx, dy) < 10) {
        guard.mode = 'patrol';
        guard.waypointIndex = 1;
      }
    } else {
      patrolStep(guard, dt);
    }
    if (guard.lookTimer > 0) {
      guard.lookTimer -= dt;
      guard.facing += 1.4 * dt;
    }
  }
  return anySees;
}

// True when any guard is close enough to grab the thief.
export function guardCaughtPlayer(guards, player) {
  for (const guard of guards) {
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    if (dx * dx + dy * dy < CATCH_DISTANCE * CATCH_DISTANCE) return guard;
  }
  return null;
}
