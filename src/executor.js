import planck from 'planck';
import { SCALE } from './constants.js';
import { registerObject, unregisterObject } from './objects.js';

const MAX_EPHEMERAL = 200;

export function createExecutor(world) {
  const updaters = [];
  const ephemeral = []; // global ring buffer for bodies created during update()

  const W = window.innerWidth / SCALE;
  const H = window.innerHeight / SCALE;

  function execute(code, spawnX, spawnY) {
    let inUpdate = false;
    const rootBodies = []; // non-ephemeral bodies created by this execute() call

    function wrappedRegister(obj) {
      obj.spawned = true;
      registerObject(obj);
      if (inUpdate) {
        obj.ephemeral = true;
        // Tag the body so suction can skip particles
        const ud = obj.body.getUserData() || {};
        ud.isEphemeral = true;
        obj.body.setUserData(ud);
        // Weightless particles: no gravity, zero density
        obj.body.setGravityScale(0);
        for (let f = obj.body.getFixtureList(); f; f = f.getNext()) {
          f.setDensity(0);
        }
        obj.body.resetMassData();
        ephemeral.push(obj);
        if (ephemeral.length > MAX_EPHEMERAL) {
          const old = ephemeral.shift();
          unregisterObject(old);
          world.destroyBody(old.body);
        }
      } else {
        rootBodies.push(obj.body);
      }
    }

    let fn;
    try {
      fn = new Function(
        'planck', 'world', 'registerObject', 'W', 'H', 'spawnX', 'spawnY',
        code,
      );
    } catch (e) {
      throw new Error(`Syntax error in generated code: ${e.message}`);
    }

    let result;
    try {
      result = fn(planck, world, wrappedRegister, W, H, spawnX, spawnY);
    } catch (e) {
      throw new Error(`Runtime error in generated code: ${e.message}`);
    }

    if (result && typeof result.update === 'function') {
      const origUpdate = result.update;
      updaters.push({
        dead: false,
        rootBodies,
        update() {
          // Stop if all root bodies have been destroyed
          if (rootBodies.length > 0 && rootBodies.every(b => !b.isActive())) {
            this.dead = true;
            return;
          }
          inUpdate = true;
          origUpdate();
          inUpdate = false;
        },
      });
    }
  }

  function getUpdaters() {
    return updaters;
  }

  return { execute, getUpdaters };
}
