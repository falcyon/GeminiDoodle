/**
 * Bezier-eased stand-up for the simplified ragdoll stickman (no knees/elbows).
 *
 * Always active. Each frame (call before world.step()):
 *   - Phase 1: Hips ease toward angle 0 (legs straight down)
 *   - Phase 2: Neck eases toward angle 0 (head upright)
 *   - Torso uprighting torque keeps the body vertical.
 *   - Arms stay ragdoll (motors off).
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const EASE_FRAMES     = 50;   // frames for full ease (~0.83 s at 60 fps)
const READY_THRESHOLD = 0.3;  // avg |angle| below this → phase "ready"
const RESET_THRESHOLD = 1.0;  // if avg |angle| exceeds this, restart ease

// Motor — clamped speed prevents oscillation
const MOTOR_GAIN      = 15;
const MOTOR_MAX_SPEED = 6;      // rad/s
const MOTOR_MAX_TORQUE = 12000;

// Torso uprighting (direct torque, clamped)
const TORSO_GAIN       = 800;
const TORSO_DAMP       = 120;
const TORSO_MAX_TORQUE = 8000;

// Standing pose targets (radians) — V-stance for stability
const TARGETS = {
  lHip: -0.15,   // slight outward splay (left)
  rHip:  0.15,   // slight outward splay (right)
  neck:  0,
};

// Phase definitions — bottom-up
const PHASES = [
  ['lHip', 'rHip'],
  ['neck'],
];

const ARM_JOINTS = ['lShoulder', 'rShoulder'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function normalizeAngle(a) {
  a = a % (2 * Math.PI);
  if (a > Math.PI)  a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createStandUpController(stickman) {
  const state = PHASES.map(joints => ({
    active: false,
    frame: 0,
    startAngles: Object.fromEntries(joints.map(n => [n, 0])),
  }));

  function update() {
    let prevReady = true;

    for (let p = 0; p < PHASES.length; p++) {
      const joints = PHASES[p];
      const ps     = state[p];

      // Activate when the phase below is ready
      if (prevReady && !ps.active) {
        ps.active = true;
        ps.frame  = 0;
        for (const name of joints) {
          ps.startAngles[name] = stickman.joints[name].getJointAngle();
        }
      }

      // Reset ease if joints got knocked far off target
      if (ps.active && ps.frame > 5) {
        let avg = 0;
        for (const name of joints) {
          avg += Math.abs(stickman.joints[name].getJointAngle() - (TARGETS[name] || 0));
        }
        avg /= joints.length;
        if (avg > RESET_THRESHOLD) {
          ps.frame = 0;
          for (const name of joints) {
            ps.startAngles[name] = stickman.joints[name].getJointAngle();
          }
        }
      }

      // Drive joints along the bezier curve
      if (ps.active) {
        ps.frame = Math.min(ps.frame + 1, EASE_FRAMES);
        const t = easeInOutCubic(ps.frame / EASE_FRAMES);

        let phaseError = 0;
        for (const name of joints) {
          const joint  = stickman.joints[name];
          const angle  = joint.getJointAngle();
          const goal   = TARGETS[name] || 0;

          // Lerp from captured start toward the standing target
          const target = ps.startAngles[name] * (1 - t) + goal * t;
          const error  = target - angle;
          const speed  = clamp(MOTOR_GAIN * error, -MOTOR_MAX_SPEED, MOTOR_MAX_SPEED);

          joint.enableMotor(true);
          joint.setMotorSpeed(speed);
          joint.setMaxMotorTorque(MOTOR_MAX_TORQUE);

          phaseError += Math.abs(angle - goal);
        }

        prevReady = (phaseError / joints.length) < READY_THRESHOLD;
      } else {
        prevReady = false;
      }
    }

    // ── Torso uprighting (clamped) ─────────────────────────────────────────
    const torso      = stickman.bodies.torso;
    const torsoAngle = normalizeAngle(torso.getAngle());
    const torsoOmega = torso.getAngularVelocity();
    const rawTorque  = TORSO_GAIN * (0 - torsoAngle) - TORSO_DAMP * torsoOmega;
    torso.applyTorque(clamp(rawTorque, -TORSO_MAX_TORQUE, TORSO_MAX_TORQUE));

    // ── Arms — free ──────────────────────────────────────────────────────
    for (const name of ARM_JOINTS) {
      stickman.joints[name].enableMotor(false);
    }
  }

  return { update };
}
