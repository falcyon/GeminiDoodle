import planck from 'planck';
import { SCALE, CAT_CURSOR } from './constants.js';
import { registerObject } from './objects.js';

// Arrow tip collision shape — small triangle (meters)
const TIP_H = 3.5;
const TIP_W = 2;

/**
 * Creates a Box2D body shaped like an arrow cursor that tracks the mouse.
 * Zero gravity, snaps to mouse position each frame.
 * Only collides with other bodies while the mouse button is held down.
 */
export function createCursorBody(world, canvas) {
  const body = world.createBody({
    type: 'dynamic',
    position: new planck.Vec2(-20, -20),
    fixedRotation: true,
    bullet: true,
  });

  body.setGravityScale(0);
  body.setUserData({ isCursor: true });

  // Triangle polygon for the arrow tip
  const fixture = body.createFixture(new planck.Polygon([
    new planck.Vec2(0, 0),
    new planck.Vec2(TIP_W * 0.4, TIP_H),
    new planck.Vec2(TIP_W, TIP_H * 0.7),
  ]), {
    density: 2,
    friction: 0.3,
    restitution: 0.1,
    filterCategoryBits: CAT_CURSOR,
    filterMaskBits: 0, // start with no collisions
  });

  const obj = {
    body,
    type: 'cursor',
    tipH: TIP_H,
    tipW: TIP_W,
  };
  registerObject(obj);

  // Track mouse position in world coords
  let mouseWorldX = -20;
  let mouseWorldY = -20;
  let visible = false;

  canvas.addEventListener('mousemove', (e) => {
    mouseWorldX = e.clientX / SCALE;
    mouseWorldY = e.clientY / SCALE;
    visible = true;
  });
  canvas.addEventListener('mouseleave', () => {
    visible = false;
  });

  // Toggle collisions on mouse down/up
  canvas.addEventListener('mousedown', () => {
    fixture.setFilterData({
      categoryBits: CAT_CURSOR,
      maskBits: 0xFFFF,
      groupIndex: 0,
    });
  });
  canvas.addEventListener('mouseup', () => {
    fixture.setFilterData({
      categoryBits: CAT_CURSOR,
      maskBits: 0,
      groupIndex: 0,
    });
  });

  function update() {
    if (!visible) {
      body.setLinearVelocity(new planck.Vec2(0, 0));
      body.setTransform(new planck.Vec2(-20, -20), 0);
      return;
    }
    // Snap directly to mouse position
    body.setTransform(new planck.Vec2(mouseWorldX, mouseWorldY), 0);
    body.setLinearVelocity(new planck.Vec2(0, 0));
  }

  return { body, update };
}
