export function createLoadingOverlay(canvas) {
  const ctx = canvas.getContext('2d');

  let state = 'idle'; // 'loading' | 'error' | 'success' | 'idle'
  let message = '';
  let fadeStart = 0;
  const FADE_DURATION = 10000; // ms for error/success auto-fade
  let spinAngle = 0;

  function showLoading(text) {
    state = 'loading';
    message = text || 'Generating...';
    fadeStart = 0;
  }

  function showError(msg) {
    state = 'error';
    message = msg;
    fadeStart = Date.now();
  }

  function showSuccess(msg) {
    state = 'success';
    message = msg || 'Created!';
    fadeStart = Date.now();
  }

  function hide() {
    state = 'idle';
  }

  function draw() {
    if (state === 'idle') return;

    const { width, height } = canvas;
    let alpha = 1;

    // Auto-fade for error/success
    if (state === 'error' || state === 'success') {
      const elapsed = Date.now() - fadeStart;
      if (elapsed > FADE_DURATION) {
        state = 'idle';
        return;
      }
      // Start fading at 60% through
      const fadePoint = FADE_DURATION * 0.6;
      if (elapsed > fadePoint) {
        alpha = 1 - (elapsed - fadePoint) / (FADE_DURATION - fadePoint);
      }
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (state === 'loading') {
      drawLoading(ctx, width, height);
    } else if (state === 'error') {
      drawBanner(ctx, width, message, '#d93025', '#fff');
    } else if (state === 'success') {
      drawBanner(ctx, width, message, '#1e8e3e', '#fff');
    }

    ctx.restore();
  }

  function drawLoading(ctx, w, h) {
    // Semi-transparent backdrop strip at top
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, 48);

    // Spinner
    const cx = w / 2 - 60;
    const cy = 24;
    const r = 10;
    spinAngle += 0.15;

    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, spinAngle, spinAngle + Math.PI * 1.4);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, cx + r + 12, cy);
  }

  function drawBanner(ctx, w, text, bgColor, textColor) {
    const bannerH = 40;
    const y = 4;

    // Pill-shaped banner at top center
    const textMetrics = ctx.measureText || null;
    ctx.font = '14px Arial, sans-serif';
    const textW = ctx.measureText(text).width;
    const bannerW = Math.min(w - 40, textW + 48);
    const bx = (w - bannerW) / 2;

    ctx.beginPath();
    ctx.roundRect(bx, y, bannerW, bannerH, bannerH / 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, y + bannerH / 2);
    ctx.textAlign = 'left';
  }

  return { showLoading, showError, showSuccess, hide, draw };
}
