import planck from 'planck';
import { SCALE, RECT_HALF_WIDTH, RECT_HALF_HEIGHT, COLORS } from './constants.js';

/**
 * Every tracked object has:
 *   { body, type: 'circle'|'rect', radius?, hw?, hh?, color }
 */
const objects = [];

export function getObjects() {
  return objects;
}

export function registerObject(obj) {
  objects.push(obj);
}

export function unregisterObject(obj) {
  const i = objects.indexOf(obj);
  if (i !== -1) objects.splice(i, 1);
}

/**
 * Remove all spawned objects (created by executor) from the world.
 * Used on victory to clean up the screen.
 */
export function clearSpawnedObjects(world) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.spawned) {
      try {
        world.destroyBody(obj.body);
      } catch (e) {
        // Body may already be destroyed
      }
      objects.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createBall(world, x, y, radius, mass, color) {
  const body = world.createBody({
    type: 'dynamic',
    position: new planck.Vec2(x, y),
  });
  const area = Math.PI * radius * radius;
  body.createFixture(new planck.Circle(radius), {
    density: mass / area,
    friction: 0.4,
    restitution: 0.55,
  });
  objects.push({ body, type: 'circle', radius, color });
  return body;
}

export function createRect(world, x, y, hw, hh, mass, color) {
  const body = world.createBody({
    type: 'dynamic',
    position: new planck.Vec2(x, y),
  });
  const area = 4 * hw * hh;
  body.createFixture(new planck.Box(hw, hh), {
    density: mass / area,
    friction: 0.4,
    restitution: 0.2,
  });
  objects.push({ body, type: 'rect', hw, hh, color });
  return body;
}

// ---------------------------------------------------------------------------
// Scene setup — creates all initial objects and joints, returns joint ref
// ---------------------------------------------------------------------------

export function createScene(world) {
  const W = window.innerWidth / SCALE;
  const H = window.innerHeight / SCALE;
  const hw = RECT_HALF_WIDTH;
  const hh = RECT_HALF_HEIGHT;

  // Two balls (mass 0.4 and 0.6)
  createBall(world, W * 0.2, H * 0.2, 0.8, 0.4, COLORS.ball1);
  createBall(world, W * 0.45, H * 0.15, 1.0, 0.6, COLORS.ball2);

  // Standalone rectangle (mass 2)
  createRect(world, W * 0.6, H * 0.15, hw, hh, 2, COLORS.rectStandalone);

  // Two connected rectangles (mass 2 each) joined at short edges
  const jointX = W * 0.78;
  const jointY = H * 0.4;
  const rectA = createRect(world, jointX, jointY + hh, hw, hh, 2, COLORS.rectJointA);
  const rectB = createRect(world, jointX, jointY - hh, hw, hh, 2, COLORS.rectJointB);

  const revoluteJoint = world.createJoint(
    new planck.RevoluteJoint({}, rectA, rectB, new planck.Vec2(jointX, jointY))
  );

  return { revoluteJoint };
}
