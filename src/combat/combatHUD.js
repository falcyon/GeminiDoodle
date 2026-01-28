/**
 * Minimal combat HUD — victory and defeat overlay screens.
 * (Health bar is already handled by healthBar.js)
 */
export function createCombatHUD(canvas, gameState) {
  const ctx = canvas.getContext('2d');

  let clickListenerAdded = false;
  let victoryClickAdded = false;

  function draw() {
    const state = gameState.getState();

    if (state === 'victory') {
      drawVictory();
    } else if (state === 'defeat') {
      drawDefeat();
    }
  }

  function drawVictory() {
    const { width, height } = canvas;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Main text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 64px "Product Sans", Arial, sans-serif';
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 20;
    ctx.fillText('YOU SURVIVED', width / 2, height / 2 - 30);
    ctx.shadowBlur = 0;

    // Elapsed time
    const elapsed = gameState.elapsed;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = mins > 0
      ? `${mins}m ${secs}s`
      : `${secs}s`;

    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Time: ${timeStr}`, width / 2, height / 2 + 30);

    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('The Crash has been defeated.', width / 2, height / 2 + 70);

    // Play Again button
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#00ff41';
    ctx.fillText('Click to play again', width / 2, height / 2 + 120);

    ctx.restore();

    // Add click-to-reload listener once
    if (!victoryClickAdded) {
      victoryClickAdded = true;
      setTimeout(() => {
        canvas.addEventListener('click', () => {
          window.location.reload();
        }, { once: true });
      }, 500);
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
      }, 500); // small delay so immediate clicks don't trigger
    }
  }

  return { draw };
}

const DEFEAT_COLORS = ['#ff0040', '#ffffff', '#ff0040', '#ffffff'];
