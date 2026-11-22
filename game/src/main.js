// Midnight Vault — the game loop: screens, input, one fixed step of the heist at a time.
// Screens: title -> play -> caught | won, with pause. The step is shared by live play and
// by the staged screenshot scenes, so a screenshot frame is a real moment of the game.

import { createAlarm, updateAlarm, ALARM_TRIP } from './alarm.js';
import {
  createCameras, updateCameras, loopCameras,
} from './camera.js';
import {
  createGuards, updateGuards, guardCaughtPlayer, sendGuardsToInvestigate, calmGuards,
} from './guard.js';
import {
  createPlayer, updatePlayer, throwSmoke, grabLoot, atExit, resetLoot, insideSmoke,
} from './player.js';
import { WORLD } from './level.js';
import { render, drawTitle } from './render.js';
import {
  createSound, unlockSound, soundPickup, soundIdol, soundSmoke, soundLoop,
  soundCaught, soundWin, soundClick, toggleMute,
} from './audio.js';

export function createGame() {
  resetLoot();
  return {
    screen: 'title',
    player: createPlayer(),
    guards: createGuards(),
    cameras: createCameras(),
    alarm: createAlarm(),
    sound: createSound(),
    keys: new Set(),
    elapsed: 0,
    score: 0,
    timeBonus: 0,
    seenNow: false,
    caughtBy: null,
    now: 0,
  };
}

function nearestWatcherDistance(game) {
  let nearest = 9999;
  for (const guard of game.guards) {
    if (!guard.seesPlayer) continue;
    const dx = game.player.x - guard.x;
    const dy = game.player.y - guard.y;
    nearest = Math.min(nearest, Math.hypot(dx, dy));
  }
  for (const camera of game.cameras) {
    if (!camera.seesPlayer) continue;
    const dx = game.player.x - camera.x;
    const dy = game.player.y - camera.y;
    nearest = Math.min(nearest, Math.hypot(dx, dy));
  }
  return nearest;
}

// One fixed step of live play. `keys` is the set of currently held key names.
export function stepGame(game, dt) {
  if (game.screen !== 'play') return;
  game.elapsed += dt;
  game.now += dt;
  const { player } = game;
  const smoked = insideSmoke(player);
  updatePlayer(player, game.keys, dt);
  const guardSees = updateGuards(game.guards, player, game.alarm.tripped, smoked, dt);
  const cameraSees = updateCameras(game.cameras, player, smoked, dt);
  const seen = (guardSees || cameraSees) && !smoked;
  game.seenNow = seen;
  const wasTripped = game.alarm.tripped;
  updateAlarm(game.alarm, seen, nearestWatcherDistance(game), player.sneaking, dt);
  if (game.alarm.tripped && !wasTripped) {
    sendGuardsToInvestigate(game.guards, player.x, player.y);
  }
  if (!game.alarm.tripped && wasTripped) calmGuards(game.guards);

  const gained = grabLoot(player);
  if (gained > 0) {
    if (player.idolTaken && gained >= 1000) soundIdol(game.sound);
    else soundPickup(game.sound);
  }
  game.score = player.loot;

  const catcher = guardCaughtPlayer(game.guards, player);
  if (catcher) {
    game.screen = 'caught';
    game.caughtBy = catcher.name;
    soundCaught(game.sound);
    return;
  }
  if (atExit(player)) {
    game.screen = 'won';
    game.timeBonus = Math.max(0, Math.round((300 - game.elapsed) * 5));
    game.score = player.loot + game.timeBonus;
    soundWin(game.sound);
  }
}

export function startHeist(game) {
  const fresh = createGame();
  Object.assign(game, fresh, { screen: 'play' });
}

function canvasPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WORLD.width / rect.width;
  const scaleY = WORLD.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function bindInput(game, canvas) {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    unlockSound(game.sound);
    if (event.repeat) return;
    if (key === 'enter' && game.screen === 'title') {
      startHeist(game);
      soundClick(game.sound);
      return;
    }
    if (key === 'r' && (game.screen === 'caught' || game.screen === 'won')) {
      startHeist(game);
      return;
    }
    if (key === 'r' && game.screen === 'play') {
      startHeist(game);
      return;
    }
    if (key === 'p' && (game.screen === 'play' || game.screen === 'paused')) {
      game.screen = game.screen === 'play' ? 'paused' : 'play';
      return;
    }
    if (key === 'm') {
      toggleMute(game.sound);
      return;
    }
    if (key === 'q' && game.screen === 'play' && throwSmoke(game.player)) {
      soundSmoke(game.sound);
      return;
    }
    if (key === 'e' && game.screen === 'play' && loopCameras(game.cameras, game.player)) {
      soundLoop(game.sound);
      return;
    }
    game.keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    game.keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => game.keys.clear());
  canvas.addEventListener('mousedown', (event) => {
    unlockSound(game.sound);
    if (game.screen === 'title') {
      startHeist(game);
      soundClick(game.sound);
      return;
    }
    if (game.screen === 'caught' || game.screen === 'won') {
      startHeist(game);
      return;
    }
    if (game.screen !== 'play') return;
    game.player.moveTarget = canvasPosition(canvas, event);
  });
}

function resizeCanvas(canvas) {
  const scale = Math.min(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
  canvas.style.width = `${Math.floor(WORLD.width * scale)}px`;
  canvas.style.height = `${Math.floor(WORLD.height * scale)}px`;
}

export async function boot() {
  const canvas = document.getElementById('game');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  const ctx = canvas.getContext('2d');
  const game = createGame();
  window.__midnight = game;
  bindInput(game, canvas);
  resizeCanvas(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    // Staged screenshot: play the real rules forward with a scripted thief, then hold
    // one frame still so the browser can capture it.
    const shots = await import('./shots.js');
    shots.stageShot(shot, game);
    render(ctx, game, game.now);
    document.title = `Midnight Vault — ${shot}`;
    return;
  }

  drawTitle(ctx);
  let last = performance.now();
  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    if (game.screen === 'play') stepGame(game, dt);
    else game.now += dt;
    render(ctx, game, game.now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
