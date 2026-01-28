import planck from 'planck';
import { SCALE, CAT_GEMINI } from './constants.js';
import { registerObject } from './objects.js';

const ICON_R = 3; // half-size in meters

/**
 * Creates a floating Gemini sparkle icon that follows the mouse cursor.
 * Uses a dynamic body with zero gravity and smooth velocity-based tracking.
 */
export function createGeminiIcon(world, canvas) {
  const initX = (canvas.width / SCALE) - 15;
  const initY = (canvas.height / SCALE) - 15;
  const body = world.createBody({
    type: 'dynamic',
    position: new planck.Vec2(initX, initY),
    fixedRotation: true,
  });

  body.setGravityScale(0);
  body.setUserData({ isGeminiIcon: true });

  // Diamond hitbox: a box rotated 45°
  const DIAMOND_HALF = ICON_R * 0.7; // half-size of the square before rotation
  body.createFixture(new planck.Box(DIAMOND_HALF, DIAMOND_HALF, new planck.Vec2(0, 0), Math.PI / 4), {
    density: 0.5,
    friction: 0,
    restitution: 0,
    isSensor: true, // doesn't collide, just floats
    filterCategoryBits: CAT_GEMINI,
    filterMaskBits: 0, // collide with nothing
  });

  const obj = {
    body,
    type: 'gemini-icon',
    radius: ICON_R,
    hitShape: 'diamond',
    diamondHalf: DIAMOND_HALF,
    loading: false,
  };
  registerObject(obj);

  // Track mouse position in world coords
  let mouseWorldX = initX;
  let mouseWorldY = initY;

  canvas.addEventListener('mousemove', (e) => {
    mouseWorldX = e.clientX / SCALE;
    mouseWorldY = e.clientY / SCALE;
  });

  // Offset so it doesn't sit right on the cursor
  const OFFSET_X = 6;
  const OFFSET_Y = -12;
  const FOLLOW_STRENGTH = 1;

  // Idle floating motion — gentle figure-8-ish bob
  let t = 0;
  const BOB_AMP_X = 1.8;  // meters of horizontal sway
  const BOB_AMP_Y = 2.5;  // meters of vertical bob
  const BOB_FREQ_X = 0.14; // Hz
  const BOB_FREQ_Y = 0.22; // Hz (different from X for lissajous feel)

  function update() {
    t += 1 / 60;
    const bobX = Math.sin(t * BOB_FREQ_X * Math.PI * 2) * BOB_AMP_X;
    const bobY = Math.sin(t * BOB_FREQ_Y * Math.PI * 2) * BOB_AMP_Y;

    const pos = body.getPosition();
    const targetX = mouseWorldX + OFFSET_X + bobX;
    const targetY = mouseWorldY + OFFSET_Y + bobY;
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;

    body.setLinearVelocity(new planck.Vec2(dx * FOLLOW_STRENGTH, dy * FOLLOW_STRENGTH));
  }

  return { body, update, setLoading(v) { obj.loading = v; } };
}
