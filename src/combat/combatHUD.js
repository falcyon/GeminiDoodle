import planck from 'planck';
import { clearSpawnedObjects, registerObject, getObjects } from '../objects.js';
import { SCALE } from '../constants.js';

/**
 * Combat HUD — victory confetti and defeat overlay.
 * Victory: Gemini congratulates with stats, confetti falls, Box2D UI elements
 * Defeat: Glitchy "CRASHED" overlay
 */
export function createCombatHUD(canvas, gameState, geminiIcon, intro, searchBar, world) {
  const ctx = canvas.getContext('2d');

  let clickListenerAdded = false;
  let searchBarRestored = false;
  let spawnedObjectsCleared = false;
  let victoryBodiesCreated = false;
  let googleElementsHidden = false;
  let playAgainClickAdded = false;

  // Box2D victory text body
  let victoryTextBody = null; // eslint-disable-line no-unused-vars

  // Confetti particles
  const confetti = [];
  let confettiInitialized = false;

  function initConfetti() {
    if (confettiInitialized) return;
    confettiInitialized = true;

    const colors = ['#0F9D58', '#F4B400', '#4285F4', '#DB4437'];
    for (let i = 0; i < 12; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 1000,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        rounds: 0, // track how many times this confetti has fallen
      });
    }
  }

  function updateConfetti() {
    for (const c of confetti) {
      // Skip confetti that has finished its rounds
      if (c.rounds >= 5) continue;

      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.1; // gravity
      c.vy = Math.min(c.vy, 2); // terminal velocity
      c.rotation += c.rotationSpeed;

      // Wobble
      c.vx += (Math.random() - 0.5) * 0.2;
      c.vx *= 0.99;

      // Reset if off screen (up to 5 rounds)
      if (c.y > canvas.height + 20) {
        c.rounds++;
        if (c.rounds < 5) {
          c.y = -20;
          c.x = Math.random() * canvas.width;
          c.vy = 0.1 + Math.random();
        }
      }
    }
  }

  function drawConfetti() {
    for (const c of confetti) {
      // Skip confetti that has finished its rounds or is off screen
      if (c.rounds >= 5 || c.y > canvas.height + 20) continue;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;

      if (c.shape === 'rect') {
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, c.size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Remove Google page elements (logo, buttons, etc.) on victory
   */
  function removeGoogleElements() {
    if (googleElementsHidden) return;
    googleElementsHidden = true;

    const objects = getObjects();
    const typesToRemove = ['logoletter', 'button', 'textlink', 'appsgrid', 'footerbar'];
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (typesToRemove.includes(obj.type)) {
        try {
          world.destroyBody(obj.body);
        } catch (e) {
          // Body may already be destroyed
        }
        objects.splice(i, 1);
      }
    }
  }

  /**
   * Create Box2D body for VICTORY text
   */
  function createVictoryBodies() {
    if (victoryBodiesCreated) return;
    victoryBodiesCreated = true;

    const W = canvas.width / SCALE;

    // Remove Google page elements
    removeGoogleElements();

    // VICTORY text - starts just above screen, falls down
    const textHW = 20; // half-width in meters
    const textHH = 4;  // half-height in meters
    victoryTextBody = world.createBody({
      type: 'dynamic',
      position: new planck.Vec2(W / 2, 5), // Start just inside top of screen
      angularDamping: 2.0,
      linearDamping: 0.3,
    });
    victoryTextBody.createFixture(new planck.Box(textHW, textHH), {
      density: 0.2,
      friction: 0.5,
      restitution: 0.4,
    });
    // Give it a slight initial rotation
    victoryTextBody.setAngularVelocity((Math.random() - 0.5) * 0.3);

    const victoryObj = {
      body: victoryTextBody,
      type: 'victory-text',
      hw: textHW,
      hh: textHH,
      label: 'VICTORY!',
      color: '#00ff41',
    };
    registerObject(victoryObj);
  }

  let playAgainBody = null;

  /**
   * Create Play Again button as a Box2D body below search bar
   */
  function createPlayAgainButton() {
    if (playAgainClickAdded || !searchBar?.body) return;
    playAgainClickAdded = true;

    const pos = searchBar.body.getPosition();
    const btnX = pos.x;
    const btnY = pos.y + 8; // 8 meters below search bar
    const btnHW = 10;
    const btnHH = 2.5;

    playAgainBody = world.createBody({
      type: 'static',
      position: new planck.Vec2(btnX, btnY),
    });
    playAgainBody.setUserData({ draggable: true });
    playAgainBody.createFixture(new planck.Box(btnHW, btnHH), {
      density: 0.5,
      friction: 0.6,
      restitution: 0.2,
    });

    const buttonObj = {
      body: playAgainBody,
      type: 'victory-button',
      hw: btnHW,
      hh: btnHH,
      label: 'Play Again',
      color: '#4285F4',
    };
    registerObject(buttonObj);

    // Add click listener for the button
    canvas.addEventListener('click', (e) => {
      if (!playAgainBody) return;
      const mx = e.clientX / SCALE;
      const my = e.clientY / SCALE;
      const currentPos = playAgainBody.getPosition();
      const angle = playAgainBody.getAngle();

      // Transform click to body-local coordinates
      const dx = mx - currentPos.x;
      const dy = my - currentPos.y;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (Math.abs(localX) <= btnHW && Math.abs(localY) <= btnHH) {
        window.location.reload();
      }
    });
  }

  function draw() {
    const state = gameState.getState();

    if (state === 'victory') {
      drawVictory();
    } else if (state === 'defeat') {
      drawDefeat();
    }
  }

  function drawVictory() {
    const stats = gameState.getStats();
    const timeSinceVictory = gameState.victoryTime ? (Date.now() - gameState.victoryTime) / 1000 : 0;

    // Clear spawned objects (debris) for clean victory screen
    if (!spawnedObjectsCleared && timeSinceVictory > 0.5 && world) {
      spawnedObjectsCleared = true;
      clearSpawnedObjects(world);
    }

    // Restore search bar immediately on victory
    if (!searchBarRestored && searchBar?.restoreForVictory) {
      searchBarRestored = true;
      searchBar.restoreForVictory();
    }

    // Initialize and update confetti
    initConfetti();
    updateConfetti();
    drawConfetti();

    // Check if dino survived
    const dinoBody = intro?.getDinoBody?.();
    const dinoSaved = dinoBody && dinoBody.isActive();

    // Build Gemini's congratulation speech
    const elapsed = stats.elapsed;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    let speech = `WE DID IT! The Crash is destroyed!\n\n`;
    speech += `Time: ${timeStr}\n`;
    speech += `Objects Created: ${stats.objectsCreated}\n`;
    speech += `Objects Lost: ${stats.objectsConsumed}\n`;
    speech += `Damage Dealt: ${Math.floor(stats.totalDamageDealt)}\n\n`;

    if (dinoSaved) {
      speech += `Dino survived! Great job protecting them!`;
    } else {
      speech += `Dino was consumed... but we still won!`;
    }

    // Show speech on Gemini after a short delay
    if (timeSinceVictory > 0.8 && geminiIcon) {
      geminiIcon.setSpeech(speech);
    }

    // Spawn Box2D victory UI bodies (VICTORY text)
    if (timeSinceVictory > 0.5) {
      createVictoryBodies();
    }

    // Create Play Again button below search bar
    if (timeSinceVictory > 1.0) {
      createPlayAgainButton();
    }
  }

  function drawDefeat() {
    const { width, height } = canvas;
    const time = Date.now() * 0.001;

    // Full black overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glitch distortion on text
    const glitchX = (Math.random() - 0.5) * 4;
    const glitchY = (Math.random() - 0.5) * 2;

    // Main text with glitch offset
    ctx.font = 'bold 72px "Product Sans", Arial, sans-serif';
    ctx.fillStyle = DEFEAT_COLORS[Math.floor(time * 8) % DEFEAT_COLORS.length];
    ctx.fillText('CRASHED.', width / 2 + glitchX, height / 2 - 20 + glitchY);

    // Ghost copies for glitch effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff0040';
    ctx.fillText('CRASHED.', width / 2 + glitchX + 3, height / 2 - 20 + glitchY - 2);
    ctx.fillStyle = '#00ff41';
    ctx.fillText('CRASHED.', width / 2 + glitchX - 2, height / 2 - 20 + glitchY + 2);
    ctx.globalAlpha = 1;

    // Subtitle
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('Click to retry', width / 2, height / 2 + 40);

    ctx.restore();

    // Add click-to-reload listener once
    if (!clickListenerAdded) {
      clickListenerAdded = true;
      setTimeout(() => {
        canvas.addEventListener('click', () => {
          window.location.reload();
        }, { once: true });
      }, 500);
    }
  }

  return { draw };
}

const DEFEAT_COLORS = ['#ff0040', '#ffffff', '#ff0040', '#ffffff'];
