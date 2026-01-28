import {
  CRASH_INITIAL_RADIUS,
  CRASH_MAX_RADIUS,
  CRASH_GROW_RATE,
} from './combatConstants.js';

/**
 * Combat state machine.
 * States: 'idle' → 'entering' → 'combat' → 'victory' | 'defeat'
 */
export function createGameState(healthBar) {
  let state = 'idle';
  let visualRadius = CRASH_INITIAL_RADIUS;
  let elapsed = 0;
  let damageFlash = 0;

  function start() {
    if (state !== 'idle') return;
    state = 'entering';
    visualRadius = CRASH_INITIAL_RADIUS;
    elapsed = 0;
  }

  function enterCombat() {
    if (state === 'entering') state = 'combat';
  }

  function update(dt) {
    if (state !== 'entering' && state !== 'combat') return;

    elapsed += dt;

    // Grow the visual radius over time
    if (state === 'combat') {
      visualRadius += CRASH_GROW_RATE * dt;
    }

    // Decay damage flash
    if (damageFlash > 0) {
      damageFlash = Math.max(0, damageFlash - dt);
    }

    // Win condition: health depleted
    if (healthBar.getHealth() <= 0 && state === 'combat') {
      state = 'victory';
      return;
    }

    // Lose condition: crash fills screen
    if (visualRadius >= CRASH_MAX_RADIUS) {
      state = 'defeat';
      return;
    }
  }

  function triggerDamageFlash() {
    damageFlash = 0.2;
  }

  function isActive() {
    return state === 'entering' || state === 'combat';
  }

  function getState() {
    return state;
  }

  return {
    start,
    enterCombat,
    update,
    triggerDamageFlash,
    isActive,
    getState,
    get visualRadius() { return visualRadius; },
    get elapsed() { return elapsed; },
    get damageFlash() { return damageFlash; },
  };
}
