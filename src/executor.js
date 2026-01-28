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

    function wrappedRegister(obj) {
      obj.spawned = true;
      registerObject(obj);
      if (inUpdate) {
        ephemeral.push(obj);
        if (ephemeral.length > MAX_EPHEMERAL) {
          const old = ephemeral.shift();
          unregisterObject(old);
          world.destroyBody(old.body);
        }
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
        update() {
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
