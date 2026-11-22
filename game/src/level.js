// Midnight Vault — level layout: one museum hall, its cover, loot, guards and cameras.
// All coordinates are in the game's logical 1280 x 800 canvas space. The HUD bar owns the
// top 64 pixels; the playable room runs from y=84 down to y=780.

export const WORLD = { width: 1280, height: 800, hudHeight: 64 };

export const ROOM = { x: 40, y: 84, width: 1200, height: 696 };

// Rectangles that block movement and block line of sight: display cases, pillars and the
// glass vault case around the idol. The carpet runner is decoration, not cover.
export const OBSTACLES = [
  { x: 300, y: 220, w: 180, h: 90, kind: 'case', label: 'Emerald Case' },
  { x: 700, y: 220, w: 180, h: 90, kind: 'case', label: 'Ruby Case' },
  { x: 300, y: 520, w: 180, h: 90, kind: 'case', label: 'Sapphire Case' },
  { x: 700, y: 520, w: 180, h: 90, kind: 'case', label: 'Opal Case' },
  { x: 560, y: 330, w: 44, h: 44, kind: 'pillar', label: 'Pillar' },
  { x: 560, y: 640, w: 44, h: 44, kind: 'pillar', label: 'Pillar' },
  { x: 940, y: 130, w: 170, h: 110, kind: 'vault', label: 'Vault Case' },
];

// The prize: the golden idol on its pedestal just in front of the vault case, so the
// thief can reach it by slipping around the case's open south side.
export const IDOL = { x: 1025, y: 268, radius: 16, value: 1000, name: 'Golden Idol' };

// Small gems scattered around the hall: optional loot, worth grabbing on the way past.
export const GEMS = [
  { x: 200, y: 400, value: 150, taken: false },
  { x: 640, y: 680, value: 150, taken: false },
  { x: 1120, y: 640, value: 150, taken: false },
];

// The getaway: the side door at the bottom left. It only opens once the idol is taken.
export const EXIT = { x: 56, y: 692, w: 96, h: 72, label: 'GETAWAY' };

export const PLAYER_SPAWN = { x: 210, y: 730 };

// Guard patrols: each guard walks its waypoint list and turns around at the ends.
export const GUARD_PATROLS = [
  {
    name: 'Bruno',
    waypoints: [{ x: 210, y: 360 }, { x: 1060, y: 360 }],
    speed: 72, range: 225, halfAngle: 0.61, color: '#e8b13c',
  },
  {
    name: 'Mara',
    waypoints: [{ x: 640, y: 150 }, { x: 640, y: 700 }],
    speed: 58, range: 210, halfAngle: 0.61, color: '#e8b13c',
  },
  {
    name: 'Kip',
    waypoints: [{ x: 320, y: 620 }, { x: 1140, y: 620 }],
    speed: 84, range: 200, halfAngle: 0.61, color: '#e8b13c',
  },
];

// Wall cameras: fixed to a wall, sweeping their cone back and forth.
export const CAMERA_SPOTS = [
  {
    name: 'Cam A',
    x: 480, y: 88, baseAngle: Math.PI / 2, sweep: 0.85, sweepSpeed: 0.55,
    range: 265, halfAngle: 0.38,
  },
  {
    name: 'Cam B',
    x: 1236, y: 430, baseAngle: Math.PI, sweep: 0.8, sweepSpeed: 0.7,
    range: 265, halfAngle: 0.38,
  },
];

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

// True when the straight segment from (x1,y1) to (x2,y2) is blocked by any obstacle.
export function lineBlocked(x1, y1, x2, y2) {
  for (let step = 0; step <= 14; step += 1) {
    const t = step / 14;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const obstacle of OBSTACLES) {
      if (pointInRect(px, py, obstacle)) return true;
    }
  }
  return false;
}

// True when a circle of `radius` at (x,y) overlaps an obstacle or leaves the room.
export function circleHitsWorld(x, y, radius) {
  if (x - radius < ROOM.x + 8 || x + radius > ROOM.x + ROOM.width - 8) return true;
  if (y - radius < ROOM.y + 8 || y + radius > ROOM.y + ROOM.height - 8) return true;
  for (const obstacle of OBSTACLES) {
    const nearestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.w));
    const nearestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
