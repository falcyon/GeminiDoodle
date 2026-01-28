import { SCALE } from './constants.js';
import { createWorld } from './world.js';
import { getObjects } from './objects.js';
import { createSearchBar } from './searchbar.js';
import { createGooglePage } from './googlepage.js';
import { setupInput } from './input.js';
import { createRenderer } from './renderer.js';
import { generateObject, normalizePrompt } from './gemini.js';
import { createExecutor } from './executor.js';
import { createLoadingOverlay } from './loading.js';
import { createCache } from './cache.js';
import { createGeminiIcon } from './geminiIcon.js';
import { createCursorBody } from './cursorBody.js';

// --- Canvas setup ---
const canvas = document.getElementById('c');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Physics ---
const world = createWorld();

const W = canvas.width / SCALE;
const H = canvas.height / SCALE;

// --- OOB cleanup: destroy spawned (Gemini/cache) bodies that leave the screen ---
function cleanupOOB() {
  const objs = getObjects();
  for (let i = objs.length - 1; i >= 0; i--) {
    const obj = objs[i];
    if (!obj.spawned) continue;
    const p = obj.body.getPosition();
    if (p.x < -W * 0.1 || p.x > W * 1.1 || p.y < -H * 0.1 || p.y > H * 1.1) {
      objs.splice(i, 1);
      world.destroyBody(obj.body);
    }
  }
}

// --- AI object generation ---
const executor = createExecutor(world);
const overlay = createLoadingOverlay(canvas);
const cache = createCache();
let isGenerating = false;

async function handleSearch(text, searchBarBody) {
  if (isGenerating) return;
  isGenerating = true;
  searchBar.setLoading(true);
  geminiIcon.setLoading(true);
  overlay.showLoading(`Generating "${text}"...`);

  try {
    // Normalize prompt via Gemini Flash → 1-2 word cache key
    const key = await normalizePrompt(text);
    console.log('[Normalize]', text, '→', key);

    // Check cache (localStorage L1, then Firebase L2)
    const cached = await cache.get(key);
    if (cached) {
      const spawnX = W * 0.65 + Math.random() * (W * 0.25);
      const spawnY = H * 0.15;
      executor.execute(cached, spawnX, spawnY);
      overlay.showSuccess(`Created "${text}"! (cached)`);
      return;
    }

    const { code } = await generateObject(text);

    // Spawn at the top-right area of the world
    const spawnX = W * 0.65 + Math.random() * (W * 0.25);
    const spawnY = 5;

    executor.execute(code, spawnX, spawnY);
    cache.set(key, code);
    overlay.showSuccess(`Created "${text}"!`);
  } catch (e) {
    console.error('Generation failed:', e);
    overlay.showError(e.message);
  } finally {
    isGenerating = false;
    searchBar.setLoading(false);
    geminiIcon.setLoading(false);
  }
}

// Google landing page elements (all start static, become dynamic on drag)
createGooglePage(world);
const searchBar = createSearchBar(world, W * 0.5, H * 0.40, handleSearch);

// --- Cursor & Gemini icon ---
const cursorBody = createCursorBody(world, canvas);
const geminiIcon = createGeminiIcon(world, canvas);

// --- Input ---
const inputState = setupInput(canvas, world);

// --- Renderer ---
const renderer = createRenderer(canvas, getObjects, { jointDots: [] }, inputState);

// --- Game loop ---
function loop() {
  // Run all updaters from generated objects (with auto-removal on error)
  const updaters = executor.getUpdaters();
  for (let i = updaters.length - 1; i >= 0; i--) {
    try {
      updaters[i].update();
    } catch (e) {
      console.warn('Updater error, removing:', e);
      updaters.splice(i, 1);
    }
  }

  cursorBody.update();
  geminiIcon.update();
  world.step(1 / 60, 8, 3);
  cleanupOOB();
  renderer.draw();
  overlay.draw();
  requestAnimationFrame(loop);
}

loop();
