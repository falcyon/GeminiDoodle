import planck from 'planck';
import { SCALE, COLORS, CAT_STICKMAN } from './constants.js';
import { registerObject } from './objects.js';

// ---------------------------------------------------------------------------
// Dimensions (half-sizes in meters)
// ---------------------------------------------------------------------------
const HEAD_R = 2;
const TORSO_HW = 1.5, TORSO_HH = 5;
const ARM_HW = 0.7, ARM_HH = 4.5;   // combined upper arm + forearm
const LEG_HW = 0.85, LEG_HH = 5.5;   // combined thigh + shin

// Masses
const HEAD_M = 1;
const TORSO_M = 3;
const ARM_M = 2;   // was 1 + 1
const LEG_M = 4;   // was 2 + 2

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let nextGroup = -1; // each stickman gets its own negative group

function makeCircle(world, x, y, radius, mass, color, group) {
  const body = world.createBody({ type: 'dynamic', position: new planck.Vec2(x, y) });
  body.createFixture(new planck.Circle(radius), {
    density: mass / (Math.PI * radius * radius),
    friction: 0.4,
    restitution: 0.1,
    filterCategoryBits: CAT_STICKMAN,
    filterGroupIndex: group,
  });
  registerObject({ body, type: 'circle', radius, color });
  return body;
}

function makeBox(world, x, y, hw, hh, mass, color, group) {
  const body = world.createBody({ type: 'dynamic', position: new planck.Vec2(x, y) });
  body.createFixture(new planck.Box(hw, hh), {
    density: mass / (4 * hw * hh),
    friction: 0.4,
    restitution: 0.1,
    filterCategoryBits: CAT_STICKMAN,
    filterGroupIndex: group,
  });
  registerObject({ body, type: 'rect', hw, hh, color });
  return body;
}

function revolute(world, bodyA, bodyB, anchor, lower, upper) {
  return world.createJoint(new planck.RevoluteJoint(
    { enableLimit: true, lowerAngle: lower, upperAngle: upper },
    bodyA, bodyB, anchor,
  ));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a simplified ragdoll stickman centred at (x, y) where y is the
 * torso centre.  No elbows or knees — single-piece arms and legs.
 * Returns { bodies, joints } for external reference.
 */
export function createStickman(world, x, y) {
  const G = nextGroup--;

  // --- Bodies -----------------------------------------------------------

  const torso = makeBox(world, x, y, TORSO_HW, TORSO_HH, TORSO_M, COLORS.torso, G);
  const head = makeCircle(world, x, y - TORSO_HH - HEAD_R, HEAD_R, HEAD_M, COLORS.head, G);

  // Shoulders sit near the top of the torso
  const shoulderY = y - TORSO_HH + 0.15;
  const armX = TORSO_HW + ARM_HW + 0.05;

  const lArm = makeBox(world, x - armX, shoulderY + ARM_HH, ARM_HW, ARM_HH, ARM_M, COLORS.leftArm, G);
  const rArm = makeBox(world, x + armX, shoulderY + ARM_HH, ARM_HW, ARM_HH, ARM_M, COLORS.rightArm, G);

  // Hips sit at the bottom of the torso
  const hipY = y + TORSO_HH;
  const legX = 0.22;

  const lLeg = makeBox(world, x - legX, hipY + LEG_HH, LEG_HW, LEG_HH, LEG_M, COLORS.leg, G);
  const rLeg = makeBox(world, x + legX, hipY + LEG_HH, LEG_HW, LEG_HH, LEG_M, COLORS.leg, G);

  // --- Joints -----------------------------------------------------------

  const V = (px, py) => new planck.Vec2(px, py);
  const PI = Math.PI;

  const neck = revolute(world, torso, head, V(x, y - TORSO_HH), -PI / 6, PI / 6);
  const lShoulder = revolute(world, torso, lArm, V(x - armX, shoulderY), -PI * 0.75, PI * 0.75);
  const rShoulder = revolute(world, torso, rArm, V(x + armX, shoulderY), -PI * 0.75, PI * 0.75);
  const lHip = revolute(world, torso, lLeg, V(x - legX, hipY), -PI / 3, PI / 2);
  const rHip = revolute(world, torso, rLeg, V(x + legX, hipY), -PI / 3, PI / 2);

  return {
    bodies: { head, torso, lArm, rArm, lLeg, rLeg },
    joints: { neck, lShoulder, rShoulder, lHip, rHip },
  };
}
