# CLAUDE.md — Revenge for Dino

## Game Concept
A browser-based physics combat game set inside a Google search page. The player controls a cursor and fights alongside a Gemini AI buddy against an enemy (TBD). Both the player and the Gemini icon can create physics objects by typing prompts into the Google search bar — Gemini generates real Box2D code on the fly. The spawned objects deal damage based on mass, speed, and collisions. This showcases Gemini's code generation abilities and real-time situational awareness.

### Planned features (not yet implemented)
- **Enemy**: an opponent that takes physics-based damage from spawned objects.
- **Gemini buddy AI**: the Gemini icon autonomously decides what to create based on the game state, using the same search bar + code generation pipeline the player uses.
- **Damage system**: calculate impact from Box2D collisions (mass × velocity).

## Tech Stack
- **Physics engine**: `planck` (modern JS port of Box2D)
- **AI code generation**: Google Gemini API (`gemini-3-pro-preview` for code, `gemini-2.0-flash` for prompt normalization)
- **Caching**: Two-tier — localStorage (L1) + Firebase Realtime DB (L2)
- **Bundler**: Vite (multi-page: `index.html` + `dev.html`)
- **Language**: Vanilla JavaScript (ES modules)
- **Deployment**: Vercel (`npm run build` produces `dist/`)

## Commands
- `npm run dev` — Start Vite dev server with hot reload
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview the production build locally

## Project Structure
```
index.html              Main game page (canvas + module entry)
dev.html                Dev testing page (sidebar + canvas sandbox)
vite.config.js          Multi-page Vite config (index.html + dev.html)
src/
  main.js               Entry point — wires world, Google page, search bar,
                         cursor, Gemini icon, executor, input, renderer, game loop
  dev.js                Dev page — fetches all cached objects, lists them in a
                         sidebar, click to spawn into an isolated Box2D sandbox
  constants.js          Shared config: SCALE, dimensions, collision categories, colors
  world.js              Creates the Box2D world (gravity 100) and boundary walls
  objects.js            Tracked object array + registerObject/unregisterObject;
                         factory functions for balls & rectangles
  renderer.js           Canvas 2D drawing for all object types, joint dots,
                         drag tether, cursor arrow, Gemini icon, Google page elements
  input.js              Mouse/touch drag via Box2D MouseJoint; static-to-dynamic
                         conversion for draggable bodies
  executor.js           Executes AI-generated code in a sandboxed Function();
                         ephemeral body ring buffer (200 cap, global);
                         tags spawned objects with obj.spawned = true
  gemini.js             Gemini API calls: generateObject() for code generation
                         (multi-turn conversation), normalizePrompt() for
                         reducing user input to 1-2 word cache keys via Flash
  cache.js              Two-tier cache (localStorage + Firebase); keys are
                         pre-normalized by Gemini; fetchAllFirebase() for dev page
  searchbar.js          Google-style search bar — static until dragged, keyboard
                         input, Enter triggers handleSearch → generation pipeline
  googlepage.js         Full Google landing page as physics bodies: logo letters,
                         buttons, nav links, footer — all static + draggable
  geminiIcon.js         Floating Gemini sparkle icon — follows mouse with offset,
                         idle figure-8 bob, diamond hitbox, loading spin animation
  cursorBody.js         Arrow-shaped cursor body — snaps to mouse, collides only
                         when mouse is held down
  cursor.js             (Unused) Alternative spring-joint cursor
  stickman.js           Ragdoll stickman — head, torso, arms, legs with joints
  standUp.js            PD-controlled stand-up for stickman (currently unused in main)
  loading.js            Overlay UI: loading spinner, error/success banners
```

## Current Game State

### World
- Full-screen Box2D world, **gravity (0, 100)**, rigid walls on all 4 edges.
- **SCALE = 6 px/m** — world is ~320×180 meters at 1920×1080.

### Google Search Page (physics bodies)
All Google page elements are **static bodies with `draggable: true`**. On first drag they convert to dynamic and fall. Includes:
- Google logo (6 colored letter bodies)
- Search bar (pill-shaped, 80×6m) with keyboard input and "Gemini is cooking..." loading state
- "Google Search" and "I'm Feeling Lucky" buttons
- Nav links (Gmail, Images, Apps grid, Sign in)
- Footer with links

### Player
- **Cursor body** (`cursorBody.js`): arrow-shaped dynamic body that snaps to mouse position each frame. Zero gravity. Collides only when mouse button is held down.
- The player types prompts into the search bar and drags spawned objects.

### Gemini Icon
- **Gemini sparkle** (`geminiIcon.js`): 4-pointed star that follows the mouse with an offset and idle figure-8 bobbing. Diamond collision hitbox. Animates rotation when loading.
- Currently visual only — AI buddy behavior is planned.

### Object Generation Pipeline
1. Player types a prompt in the search bar, presses Enter.
2. `normalizePrompt(text)` calls **Gemini 2.0 Flash** (cheap, fast) to reduce the input to a 1-2 word canonical cache key (e.g. "give me something that creates rain" → "rain").
3. Cache lookup: localStorage (L1) → Firebase (L2).
4. On miss: `generateObject(text)` calls **Gemini 3 Pro** with a system prompt containing examples (ball, car, turret). Returns executable JS code.
5. `executor.execute(code, spawnX, spawnY)` runs the code via `new Function()` with sandboxed params: `planck, world, registerObject, W, H, spawnX, spawnY`.
6. Code that returns `{ update() }` gets its update called at 60fps in the game loop.
7. Result is cached under the normalized key (L1 + L2).

### Body Lifecycle
- **Spawned objects** are tagged `obj.spawned = true` by the executor.
- **Ephemeral bodies** (created during `update()` calls, e.g. bullets/raindrops) go into a **global ring buffer capped at 200**. When exceeded, the oldest ephemeral body is destroyed.
- **OOB cleanup**: every frame after physics step, any spawned body outside the screen (10% margin) is destroyed. Built-in page elements (cursor, Gemini icon, Google UI) are never destroyed.

### Dev Page (`/dev.html`)
- Left sidebar lists all cached objects from Firebase + localStorage.
- Click an entry to spawn it into an isolated Box2D sandbox canvas.
- "Refresh" re-fetches, "Clear" resets the canvas.
- Same ephemeral cap and OOB cleanup as the main page.

## Conventions
- Physics units are meters; `SCALE` (6 px/m) converts to screen pixels.
- All rendered bodies live in the `objects` array (`objects.js`). Use `registerObject(obj)` to add, `unregisterObject(obj)` to remove.
- Object shapes: `{ body, type, color, ... }` where type is `'circle'`, `'rect'`, `'searchbar'`, `'logoletter'`, `'button'`, `'textlink'`, `'appsgrid'`, `'footerbar'`, `'gemini-icon'`, or `'cursor'`.
- **Static-to-dynamic pattern**: bodies start `type: 'static'` with `userData.draggable = true`. `input.js` converts them to dynamic on first drag.
- Generated code receives `registerObject` as a parameter — it's actually the executor's `wrappedRegister` which handles tagging and ephemeral tracking.
- Keep modules focused: one concern per file. New game systems get their own module under `src/`.

## Environment Variables (`.env`)
- `VITE_GEMINI_API_KEY` — Google Gemini API key
- `VITE_FIREBASE_DB_URL` — Firebase Realtime DB URL for L2 cache

## Deployment
Vercel auto-detects the Vite framework. The build produces both `index.html` and `dev.html` in `dist/`.
