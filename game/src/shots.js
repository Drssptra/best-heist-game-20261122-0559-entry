// Midnight Vault — staged screenshot scenes behind ?shot=cover|alarm|loot|win.
// Each scene plays the real rules forward from a fresh heist for a fixed number of steps,
// steered by a cautious autopilot: the thief walks a waypoint route and waits whenever the
// next step would walk into a guard cone or a camera sight-line, throwing smoke if it has
// to wait too long. The frame is therefore a moment a real game reaches, and the same
// shot always gives the same frame.

import { stepGame, startHeist } from './main.js';
import { guardSeesPlayer } from './guard.js';
import { cameraSeesPlayer } from './camera.js';
import { insideSmoke, throwSmoke } from './player.js';
import { circleHitsWorld } from './level.js';

const STEP = 1 / 60;

const ROUTES = {
  // Mid-heist: thief crossing the hall between the cases, cones sweeping around them.
  cover: {
    waypoints: [
      { x: 210, y: 730 }, { x: 210, y: 430 }, { x: 430, y: 430 }, { x: 430, y: 300 },
    ],
    seconds: 11,
  },
  // Caught in the open: thief walks into Bruno's lane and waits in his cone.
  alarm: {
    waypoints: [{ x: 210, y: 730 }, { x: 600, y: 470 }, { x: 600, y: 360 }],
    seconds: 16,
    stopWhen: (game) => game.alarm.value >= 60 || game.screen !== 'play',
  },
  // The prize: the long way round to the idol, hugging the walls and the cases.
  loot: {
    waypoints: [
      { x: 210, y: 730 }, { x: 210, y: 470 }, { x: 210, y: 180 },
      { x: 900, y: 180 }, { x: 1025, y: 300 },
    ],
    seconds: 45,
    stopWhen: (game) => game.player.idolTaken || game.screen !== 'play',
  },
  // The whole job: idol, then down the right wall and along the bottom to the getaway.
  win: {
    waypoints: [
      { x: 210, y: 730 }, { x: 210, y: 470 }, { x: 210, y: 180 },
      { x: 900, y: 180 }, { x: 1025, y: 300 }, { x: 1150, y: 700 },
      { x: 1150, y: 745 }, { x: 104, y: 728 },
    ],
    seconds: 110,
    stopWhen: (game) => game.screen === 'won' || game.screen === 'caught',
  },
};

// Would the thief be seen standing at (x, y) right now?
function seenAt(game, x, y) {
  const smoked = insideSmoke(game.player);
  const probe = { x, y };
  for (const guard of game.guards) {
    if (guardSeesPlayer(guard, probe, smoked)) return true;
  }
  for (const camera of game.cameras) {
    if (cameraSeesPlayer(camera, probe, smoked)) return true;
  }
  return false;
}

// One autopilot step: walk toward the current waypoint unless the next step is watched.
function autopilotStep(game, route, state) {
  const player = game.player;
  const target = route.waypoints[state.waypointIndex];
  if (!target) return;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 10) {
    state.waypointIndex += 1;
    state.waited = 0;
    return;
  }
  const speed = 165;
  const nx = player.x + (dx / distance) * speed * STEP;
  const ny = player.y + (dy / distance) * speed * STEP;
  const currentlySeen = seenAt(game, player.x, player.y);
  const nextSeen = seenAt(game, nx, ny);
  if (!currentlySeen && nextSeen && !circleHitsWorld(nx, ny, player.radius)) {
    // Wait for the cone to sweep past; smoke out if the wait drags on.
    state.waited += STEP;
    if (state.waited > 2.5 && player.smokeLeft > 0) {
      throwSmoke(player);
      state.waited = 0;
    }
    game.keys.clear();
    return;
  }
  state.waited = 0;
  game.keys.clear();
  // Steer with the keys, exactly as a player would, so the step is the real one.
  if (dx < -4) game.keys.add('a');
  if (dx > 4) game.keys.add('d');
  if (dy < -4) game.keys.add('w');
  if (dy > 4) game.keys.add('s');
}

// Set `game` to the named scene and leave it on the frame to capture.
export function stageShot(name, game) {
  const route = ROUTES[name] || ROUTES.cover;
  startHeist(game);
  const state = { waypointIndex: 0, waited: 0 };
  const limit = Math.floor(route.seconds / STEP);
  for (let index = 0; index < limit; index += 1) {
    autopilotStep(game, route, state);
    stepGame(game, STEP);
    if (route.stopWhen && route.stopWhen(game)) break;
  }
  game.keys.clear();
  game.seenNow = false;
  for (const guard of game.guards) {
    guard.seesPlayer = guardSeesPlayer(guard, game.player, insideSmoke(game.player));
  }
  for (const camera of game.cameras) {
    camera.seesPlayer = cameraSeesPlayer(camera, game.player, insideSmoke(game.player));
  }
  game.seenNow = game.guards.some((guard) => guard.seesPlayer)
    || game.cameras.some((camera) => camera.seesPlayer);
  window.__midnightShot = {
    shot: name,
    screen: game.screen,
    alarm: Math.round(game.alarm.value),
    tripped: game.alarm.tripped,
    player: { x: Math.round(game.player.x), y: Math.round(game.player.y) },
    loot: game.player.loot,
    idolTaken: game.player.idolTaken,
    score: game.score,
  };
}
