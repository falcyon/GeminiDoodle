/**
 * Persistent health bar drawn at the viewport bottom.
 * During the intro it acts as a loading bar (blue, progress-based).
 * After the intro it becomes the enemy health bar (red, health-based).
 */
export function createHealthBar(canvas) {
  const ctx = canvas.getContext('2d');

  let barProgress = 0;        // 0–1 fraction of viewport width (intro mode)
  let barColor = '#4285f4';   // Google blue
  let visible = false;
  let introComplete = false;

  const maxHealth = 100;
  let currentHealth = 100;

  const BAR_HEIGHT = 3;       // pixels

  function setProgress(fraction) {
    barProgress = fraction;
  }

  function setColor(color) {
    barColor = color;
  }

  function show() { visible = true; }
  function hide() { visible = false; }

  function setIntroComplete() {
    introComplete = true;
    barColor = '#d93025';
    barProgress = 1.0;
  }

  function takeDamage(amount) {
    currentHealth = Math.max(0, currentHealth - amount);
  }

  function draw() {
    if (!visible) return;

    const { width, height } = canvas;
    const drawWidth = introComplete
      ? (currentHealth / maxHealth) * width
      : barProgress * width;

    ctx.fillStyle = barColor;
    ctx.fillRect(0, height - BAR_HEIGHT, drawWidth, BAR_HEIGHT);
  }

  return {
    setProgress,
    setColor,
    show,
    hide,
    setIntroComplete,
    takeDamage,
    getHealth() { return currentHealth; },
    getMaxHealth() { return maxHealth; },
    draw,
  };
}
