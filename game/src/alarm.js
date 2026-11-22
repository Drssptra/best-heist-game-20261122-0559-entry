// Midnight Vault — the alarm meter: the heist's shared tension.
// The meter fills while any guard or camera sees the thief (faster up close, half as fast
// while sneaking) and drains slowly when nobody sees them. At 100 the alarm trips: guards
// sprint to the thief for a few seconds, then the meter falls back and the guards calm down
// and go back to patrol. Being seen while the alarm is already tripped keeps it tripped.

export const ALARM_TRIP = 100;
export const ALARM_AFTER_TRIP = 45;
export const ALARM_DURATION = 9;

export function createAlarm() {
  return {
    value: 0,
    tripped: false,
    tripLeft: 0,
    // How far away the nearest watcher was when the alarm last rose; the HUD reads it.
    nearestWatcher: 9999,
  };
}

// How fast the meter fills per second for a watcher `distance` away.
export function exposureRate(distance, sneaking) {
  const closeness = Math.max(0.35, 1 - distance / 320);
  const base = 26 + 44 * closeness;
  return sneaking ? base * 0.5 : base;
}

export function updateAlarm(alarm, seen, nearestDistance, sneaking, dt) {
  if (alarm.tripped) {
    alarm.tripLeft -= dt;
    if (seen) alarm.tripLeft = Math.max(alarm.tripLeft, 1.5);
    if (alarm.tripLeft <= 0) {
      alarm.tripped = false;
      alarm.value = ALARM_AFTER_TRIP;
    }
    return alarm;
  }
  if (seen) {
    alarm.value += exposureRate(nearestDistance, sneaking) * dt;
    alarm.nearestWatcher = nearestDistance;
    if (alarm.value >= ALARM_TRIP) {
      alarm.value = ALARM_TRIP;
      alarm.tripped = true;
      alarm.tripLeft = ALARM_DURATION;
    }
  } else {
    alarm.value = Math.max(0, alarm.value - 9 * dt);
    alarm.nearestWatcher = 9999;
  }
  return alarm;
}

// Text the HUD shows for the meter's current state.
export function alarmLabel(alarm) {
  if (alarm.tripped) return 'ALARM! GUARDS COMING';
  if (alarm.value >= 70) return 'ALMOST SPOTTED';
  if (alarm.value >= 35) return 'SUSPICIOUS';
  if (alarm.value > 0) return 'WATCHED';
  return 'UNSEEN';
}
