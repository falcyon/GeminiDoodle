import planck from 'planck';
import { SCALE, CAT_CURSOR, CAT_STICKMAN, CAT_GEMINI } from './constants.js';

/**
 * Creates a physics-based fake cursor that follows the real mouse via a spring
 * joint. The cursor body interacts with scene objects, giving it physical weight.
 *
 * @param {planck.World} world
 * @param {HTMLCanvasElement} canvas
 * @returns {{ update(): void, draw(ctx: CanvasRenderingContext2D): void, body: planck.Body }}
 */
export function createCursor(world, canvas) {
  const RADIUS = 1.2; // meters (~7px at SCALE=6)

  // --- Body ---
  // Kinematic means it has infinite mass/inertia for collisions, but we control position/velocity directly.
  const body = world.createBody({
    type: 'kinematic',
    position: new planck.Vec2(-100, -100),
    fixedRotation: true,
    bullet: true, // Continuous collision detection
  });

  body.createFixture(new planck.Circle(RADIUS), {
    density: 1.0, // Doesn't matter for kinematic, but good practice
    friction: 0.2,
    restitution: 0.1,
    filterCategoryBits: CAT_CURSOR,
    filterMaskBits: CAT_STICKMAN | CAT_GEMINI,
  });
  body.setUserData({ isCursor: true });

  // --- Mouse tracking ---
  let realPos = null;   // latest real mouse position in world coords
  let visible = false;  // whether the pointer is over the canvas

  function onMouseMove(e) {
    realPos = new planck.Vec2(e.clientX / SCALE, e.clientY / SCALE);
    if (!visible) visible = true;
  }

  function onMouseEnter() {
    visible = true;
  }

  function onMouseLeave() {
    visible = false;
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseenter', onMouseEnter);
  canvas.addEventListener('mouseleave', onMouseLeave);

  // --- Public API ---

  function update() {
    if (!realPos || !visible) {
      // Move away if not visible or unknown
      body.setLinearVelocity(new planck.Vec2(0, 0));
      return;
    }

    const currentPos = body.getPosition();

    // We want to move from currentPos to realPos in exactly 1 frame (1/60s).
    // v = d / t  => v = (target - current) / (1/60) => v = (target - current) * 60
    const dx = realPos.x - currentPos.x;
    const dy = realPos.y - currentPos.y;

    // 60fps assumption is standard for planck step
    const fps = 60;
    const vel = new planck.Vec2(dx * fps, dy * fps);

    body.setLinearVelocity(vel);
  }

  function draw(ctx) {
    if (!visible) return;

    const pos = body.getPosition();
    const sx = pos.x * SCALE;
    const sy = pos.y * SCALE;

    // Classic arrow cursor polygon — tip at body center, extending down-right
    // Approximately 20px tall
    ctx.save();
    ctx.translate(sx, sy);

    ctx.beginPath();
    // Tip
    ctx.moveTo(0, 0);
    // Left edge down
    ctx.lineTo(0, 20);
    // Notch
    ctx.lineTo(5.5, 15.5);
    // Bottom-right tail
    ctx.lineTo(11, 22);
    // Right side of tail
    ctx.lineTo(14, 19.5);
    // Back to notch area
    ctx.lineTo(8, 13);
    // Top-right
    ctx.lineTo(14, 13);
    // Close back to tip
    ctx.closePath();

    // White fill with black outline
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  return { update, draw, body };
}
