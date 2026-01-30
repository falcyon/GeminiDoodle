import planck from 'planck';
import { CAT_CRASH } from '../constants.js';
import { getObjects, unregisterObject } from '../objects.js';
import {
  CRASH_INITIAL_RADIUS,
  CRASH_ENTRY_SPEED,
  VOID_BODY_RADIUS,
  EYE_RADIUS_FRAC,
  EYE_MIN_RADIUS,
  EYE_RESTITUTION,
  EYE_MOMENTUM_SCALE,
  EYE_ROAM_SPEED,
  SUCTION_STRENGTH,
  SUCTION_GROWTH,
  DETACH_FORCE_THRESHOLD,
} from './combatConstants.js';

/**
 * Creates The Crash entity — a void/corruption boss with two Box2D bodies.
 *
 * - Void core: tiny kinematic sensor that destroys anything it touches
 * - Eye: kinematic body offset to the right — the weak point that takes damage
 * @param {object} geminiIcon - The Gemini icon instance (for danger zone tracking)
 */
export function createCrash(world, gameState, healthBar, W, H, geminiIcon = null) {
  // --- Spawn position: off-screen left, centered vertically ---
  const startRadius = CRASH_INITIAL_RADIUS;
  let cx = -startRadius;
  let cy = H * 0.65;

  // --- Entry target: just enough to be fully on screen ---
  let targetX = startRadius + 10; // stop once visual is fully visible
  let enteredScreen = false;

  // --- Eye roaming state (top-right arc: -PI/2 to 0) ---
  const EYE_ARC_MIN = -Math.PI / 2; // straight up
  const EYE_ARC_MAX = 0;            // straight right
  let eyeAngle = -Math.PI / 4;      // start at 45° (middle of arc)
  let eyeVelocity = EYE_ROAM_SPEED; // current angular velocity (smooth)
  let eyeTargetDir = 1;             // 1 = toward right, -1 = toward top
  let eyeJitterTimer = 0;           // time until next target change
  let currentEyeRadius = Math.max(EYE_MIN_RADIUS, startRadius * EYE_RADIUS_FRAC);

  // --- Screen shake state ---
  let shakeIntensity = 0;
  let shakeTime = 0;
  const SHAKE_DURATION = 0.3;       // seconds
  const SHAKE_INTENSITY = 4;        // max pixel offset

  // --- Gemini danger zone state ---
  const GEMINI_DANGER_RADIUS = 40;     // meters - when Gemini starts getting sucked
  const GEMINI_SUCTION_STRENGTH = 8;   // base suction force on Gemini
  const GEMINI_VOID_RADIUS = 5;        // meters - instant death zone
  let geminiDangerLevel = 0;           // 0 = safe, 1 = max danger (for visual feedback)

  // --- Create void core body (tiny sensor) ---
  const voidBody = world.createBody({
    type: 'kinematic',
    position: new planck.Vec2(cx, cy),
  });
  voidBody.setUserData({ isCrash: true, isVoidCore: true });
  const voidFixture = voidBody.createFixture(new planck.Circle(VOID_BODY_RADIUS), {
    isSensor: true,
    filterCategoryBits: CAT_CRASH,
    filterMaskBits: 0xFFFF,
  });

  // --- Create eye body (hittable weak point) ---
  const eyeBody = world.createBody({
    type: 'kinematic',
    position: new planck.Vec2(cx + startRadius, cy),
  });
  eyeBody.setUserData({ isCrash: true, isEye: true });
  let eyeFixture = eyeBody.createFixture(new planck.Circle(currentEyeRadius), {
    restitution: EYE_RESTITUTION,
    friction: 0.1,
    density: 1,
    filterCategoryBits: CAT_CRASH,
    filterMaskBits: 0xFFFF,
  });

  // Track last fixture radius so we only rebuild when it changes meaningfully
  let lastFixtureRadius = currentEyeRadius;

  // --- Contact handling ---
  world.on('begin-contact', (contact) => {
    if (!gameState.isActive()) return;

    const fA = contact.getFixtureA();
    const fB = contact.getFixtureB();

    // Check void core contacts
    handleVoidContact(fA, fB);
    handleVoidContact(fB, fA);

    // Check eye contacts
    handleEyeContact(fA, fB);
    handleEyeContact(fB, fA);
  });

  function handleVoidContact(crashFixture, otherFixture) {
    if (crashFixture !== voidFixture) return;

    const otherBody = otherFixture.getBody();
    const ud = otherBody.getUserData();

    // Don't consume walls, cursor, gemini icon, crash parts, or particles
    if (ud?.isCursor || ud?.isGeminiIcon || ud?.isCrash || ud?.isEphemeral) return;
    if (otherBody.getType() === 'static') return;

    // Mark as consumed immediately so updaters stop
    const ud2 = otherBody.getUserData() || {};
    ud2.isConsumed = true;
    otherBody.setUserData(ud2);

    // Schedule destruction (can't destroy during contact callback)
    scheduledDestroys.push(otherBody);
    gameState.trackObjectConsumed();

    // Trigger screen shake
    triggerShake();
  }

  function handleEyeContact(crashFixture, otherFixture) {
    if (crashFixture !== eyeFixture) return;

    const otherBody = otherFixture.getBody();
    const ud = otherBody.getUserData();

    // Don't take damage from walls, cursor, gemini icon, or crash parts
    if (ud?.isCursor || ud?.isGeminiIcon || ud?.isCrash) return;
    if (otherBody.getType() === 'static') return;

    const vel = otherBody.getLinearVelocity();
    const speed = vel.length();
    const mass = otherBody.getMass();
    const momentum = speed * mass;
    const damage = momentum * EYE_MOMENTUM_SCALE;

    if (damage > 0.1) {
      healthBar.takeDamage(damage);
      gameState.triggerDamageFlash();
      gameState.trackDamage(damage);
    }

    // Destroy ephemeral objects (bullets, particles) on eye contact
    if (ud?.isEphemeral) {
      scheduledDestroys.push(otherBody);
    }
  }

  // Bodies queued for destruction (can't destroy during contact callbacks)
  const scheduledDestroys = [];

  // --- Screen shake functions ---
  function triggerShake() {
    shakeIntensity = SHAKE_INTENSITY;
    shakeTime = SHAKE_DURATION;
  }

  function getShake(dt) {
    if (shakeTime <= 0) return { x: 0, y: 0 };

    shakeTime -= dt;
    const progress = Math.max(0, shakeTime / SHAKE_DURATION);
    const currentIntensity = shakeIntensity * progress;

    // Random offset within intensity bounds
    const x = (Math.random() - 0.5) * 2 * currentIntensity;
    const y = (Math.random() - 0.5) * 2 * currentIntensity;

    return { x, y };
  }

  // --- Movement ---
  function updateMovement(dt) {
    const radius = gameState.visualRadius;

    if (!enteredScreen) {
      // Entry phase: move horizontally from the left
      if (cx < targetX) {
        cx += CRASH_ENTRY_SPEED * dt;
        if (cx >= targetX) {
          cx = targetX;
          enteredScreen = true;
          gameState.enterCombat();
        }
      }
    }
    // After entry: stationary. The orb stays put and just grows + sucks.

    // --- Eye roaming: smooth haphazard drift along top-right arc ---
    eyeJitterTimer -= dt;
    if (eyeJitterTimer <= 0) {
      // Randomly pick a new target direction
      eyeTargetDir = Math.random() < 0.4 ? -eyeTargetDir : eyeTargetDir;
      eyeJitterTimer = 0.5 + Math.random() * 1.5;
    }
    // Smoothly lerp velocity toward target direction
    const targetVel = EYE_ROAM_SPEED * eyeTargetDir;
    eyeVelocity += (targetVel - eyeVelocity) * Math.min(dt * 2, 1);
    eyeAngle += eyeVelocity * dt;
    // Soft bounce at arc edges
    if (eyeAngle <= EYE_ARC_MIN) { eyeAngle = EYE_ARC_MIN; eyeTargetDir = 1; eyeVelocity = Math.abs(eyeVelocity) * 0.5; }
    if (eyeAngle >= EYE_ARC_MAX) { eyeAngle = EYE_ARC_MAX; eyeTargetDir = -1; eyeVelocity = -Math.abs(eyeVelocity) * 0.5; }

    // Eye sits at the visual radius edge (half in, half out)
    const eyeX = cx + Math.cos(eyeAngle) * radius;
    const eyeY = cy + Math.sin(eyeAngle) * radius;

    // --- Eye grows proportionally with the orb ---
    currentEyeRadius = Math.max(EYE_MIN_RADIUS, radius * EYE_RADIUS_FRAC);

    // Rebuild fixture if radius changed significantly (>10%)
    if (Math.abs(currentEyeRadius - lastFixtureRadius) > lastFixtureRadius * 0.1) {
      eyeBody.destroyFixture(eyeFixture);
      eyeFixture = eyeBody.createFixture(new planck.Circle(currentEyeRadius), {
        restitution: EYE_RESTITUTION,
        friction: 0.1,
        density: 1,
        filterCategoryBits: CAT_CRASH,
        filterMaskBits: 0xFFFF,
      });
      lastFixtureRadius = currentEyeRadius;
    }

    // Position both bodies
    voidBody.setTransform(new planck.Vec2(cx, cy), 0);
    voidBody.setLinearVelocity(new planck.Vec2(0, 0));

    eyeBody.setTransform(new planck.Vec2(eyeX, eyeY), 0);
    eyeBody.setLinearVelocity(new planck.Vec2(0, 0));
  }

  // --- Suction (inverse-square falloff, everything is in range) ---
  function applySuction() {
    const radius = gameState.visualRadius;
    const growDelta = radius - CRASH_INITIAL_RADIUS;
    const strength = SUCTION_STRENGTH + SUCTION_GROWTH * growDelta;

    for (let b = world.getBodyList(); b; b = b.getNext()) {
      const ud = b.getUserData();
      if (ud?.isCursor || ud?.isGeminiIcon || ud?.isCrash || ud?.isEphemeral) continue;

      const bodyType = b.getType();

      // Skip kinematic bodies entirely
      if (bodyType === 'kinematic') continue;

      const pos = b.getWorldCenter();
      const dx = cx - pos.x;
      const dy = cy - pos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < 1) continue; // avoid singularity at center

      // 1/r falloff
      const dist = Math.sqrt(distSq);
      const force = strength / dist;

      // Auto-detach: convert static page elements to dynamic when force is strong enough
      if (bodyType === 'static' && ud?.isPageElement && force >= DETACH_FORCE_THRESHOLD) {
        b.setType('dynamic');
      }

      // Only apply force to dynamic bodies
      if (b.getType() === 'dynamic') {
        b.applyForce(
          new planck.Vec2((dx / dist) * force, (dy / dist) * force),
          b.getWorldCenter(),
        );
      }
    }
  }

  // --- Gemini danger zone: apply suction when too close ---
  function updateGeminiDanger() {
    if (!geminiIcon || !geminiIcon.body) {
      geminiDangerLevel = 0;
      return;
    }

    const geminiPos = geminiIcon.body.getPosition();
    const dx = cx - geminiPos.x;
    const dy = cy - geminiPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check for instant death (touching void core)
    if (dist < GEMINI_VOID_RADIUS) {
      gameState.triggerDefeat('gemini_consumed');
      geminiDangerLevel = 1;
      return;
    }

    // Check if in danger zone
    if (dist < GEMINI_DANGER_RADIUS) {
      // Calculate danger level (0 at edge, 1 at void radius)
      geminiDangerLevel = 1 - (dist - GEMINI_VOID_RADIUS) / (GEMINI_DANGER_RADIUS - GEMINI_VOID_RADIUS);
      geminiDangerLevel = Math.max(0, Math.min(1, geminiDangerLevel));

      // Apply suction force - stronger as Gemini gets closer
      // Use exponential scaling so it's gentle at edge, strong near center
      const suctionMultiplier = Math.pow(geminiDangerLevel, 1.5);
      const force = GEMINI_SUCTION_STRENGTH * suctionMultiplier;

      // Apply force toward void center
      const forceX = (dx / dist) * force;
      const forceY = (dy / dist) * force;

      // Get current velocity and add suction (don't override mouse following completely)
      const vel = geminiIcon.body.getLinearVelocity();
      geminiIcon.body.setLinearVelocity(new planck.Vec2(
        vel.x + forceX * 0.016, // scale by approx dt
        vel.y + forceY * 0.016
      ));
    } else {
      geminiDangerLevel = 0;
    }
  }

  // --- Process scheduled destroys ---
  function processDestroys() {
    while (scheduledDestroys.length > 0) {
      const body = scheduledDestroys.pop();
      // Find and remove from objects array
      const objs = getObjects();
      for (let i = objs.length - 1; i >= 0; i--) {
        if (objs[i].body === body) {
          unregisterObject(objs[i]);
          break;
        }
      }
      try {
        world.destroyBody(body);
      } catch (e) {
        // Body may already be destroyed
      }
    }
  }

  // --- Main update ---
  function update(dt) {
    if (!gameState.isActive()) return;

    updateMovement(dt);
    applySuction();
    updateGeminiDanger();
    processDestroys();
  }

  // --- Cleanup ---
  function destroy() {
    try { world.destroyBody(voidBody); } catch (e) { /* already gone */ }
    try { world.destroyBody(eyeBody); } catch (e) { /* already gone */ }
  }

  return {
    update,
    destroy,
    getShake,
    getGeminiDangerLevel() { return geminiDangerLevel; },
    getCenter() { return { x: cx, y: cy }; },
    getEyePosition() {
      const radius = gameState.visualRadius;
      return {
        x: cx + Math.cos(eyeAngle) * radius,
        y: cy + Math.sin(eyeAngle) * radius,
      };
    },
    getEyeRadius() { return currentEyeRadius; },
    get voidBody() { return voidBody; },
    get eyeBody() { return eyeBody; },
  };
}
