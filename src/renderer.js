import { SCALE, COLORS, DEBUG } from './constants.js';

/**
 * Creates the renderer that draws the physics scene onto a canvas each frame.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Function} getObjects   – returns the tracked object array
 * @param {object}   sceneRefs    – { jointDots: Joint[] }
 * @param {object}   inputState   – { getMouseTarget, getMouseJoint }
 */
export function createRenderer(canvas, getObjects, sceneRefs, inputState) {
  const ctx = canvas.getContext('2d');

  function draw() {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Wall border
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Joint dots
    ctx.fillStyle = COLORS.jointDot;
    ctx.globalAlpha = 0.5;
    for (const j of sceneRefs.jointDots) {
      const a = j.getAnchorA();
      ctx.beginPath();
      ctx.arc(a.x * SCALE, a.y * SCALE, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // All tracked bodies
    const objects = getObjects();
    let cursorObj = null;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.type === 'cursor') { cursorObj = obj; continue; }

      const pos = obj.body.getPosition();
      const angle = obj.body.getAngle();

      ctx.save();
      ctx.translate(pos.x * SCALE, pos.y * SCALE);
      ctx.rotate(angle);

      if (obj.type === 'circle') {
        drawCircle(ctx, obj);
      } else if (obj.type === 'searchbar') {
        drawSearchBar(ctx, obj);
      } else if (obj.type === 'logoletter') {
        drawLogoLetter(ctx, obj);
      } else if (obj.type === 'button') {
        drawButton(ctx, obj);
      } else if (obj.type === 'textlink') {
        drawTextLink(ctx, obj);
      } else if (obj.type === 'appsgrid') {
        drawAppsGrid(ctx, obj);
      } else if (obj.type === 'footerbar') {
        drawFooterBar(ctx, obj);
      } else if (obj.type === 'gemini-icon') {
        drawGeminiIcon(ctx, obj);
      } else if (obj.type === 'dino') {
        drawDino(ctx, obj);
      } else {
        drawRect(ctx, obj);
      }

      if (DEBUG) {
        drawDebugHitbox(ctx, obj);
        drawMassLabel(ctx, obj);
      }

      ctx.restore();
    }

    // Mouse joint tether
    const target = inputState.getMouseTarget();
    const joint = inputState.getMouseJoint();
    if (joint && target) {
      const bodyPos = joint.getBodyB().getPosition();

      ctx.beginPath();
      ctx.moveTo(target.x * SCALE, target.y * SCALE);
      ctx.lineTo(bodyPos.x * SCALE, bodyPos.y * SCALE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(target.x * SCALE, target.y * SCALE, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
    }

    // Cursor drawn last (always on top)
    if (cursorObj) {
      const cpos = cursorObj.body.getPosition();
      ctx.save();
      ctx.translate(cpos.x * SCALE, cpos.y * SCALE);
      drawCursorArrow(ctx);
      ctx.restore();
    }
  }

  return { draw };
}

// ---------------------------------------------------------------------------
// Gemini sparkle icon (4-pointed star with bezier-eased rotation)
// ---------------------------------------------------------------------------

function bezierEase(t) {
  // Cubic bezier ease-in-out approximation
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawGeminiSparkle(ctx, cx, cy, size) {
  const period = 2000; // ms per full rotation
  const raw = (Date.now() % period) / period;
  const angle = bezierEase(raw) * Math.PI * 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // 4-pointed star using bezier curves
  const outer = size;
  const inner = size * 0.3;

  // Gemini gradient: blue to purple
  const grad = ctx.createLinearGradient(-outer, -outer, outer, outer);
  grad.addColorStop(0, '#4285f4');
  grad.addColorStop(0.5, '#a259ff');
  grad.addColorStop(1, '#4285f4');

  ctx.beginPath();
  ctx.moveTo(0, -outer);
  ctx.bezierCurveTo(inner * 0.4, -inner, inner, -inner * 0.4, outer, 0);
  ctx.bezierCurveTo(inner, inner * 0.4, inner * 0.4, inner, 0, outer);
  ctx.bezierCurveTo(-inner * 0.4, inner, -inner, inner * 0.4, -outer, 0);
  ctx.bezierCurveTo(-inner, -inner * 0.4, -inner * 0.4, -inner, 0, -outer);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Shape drawing helpers
// ---------------------------------------------------------------------------

function drawCircle(ctx, obj) {
  const r = obj.radius * SCALE;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = obj.color;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rotation indicator
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.8, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSearchBar(ctx, obj) {
  const w = obj.hw * 2 * SCALE;
  const h = obj.hh * 2 * SCALE;
  const r = h / 2;             // pill-shaped corners (radius = half height)
  const x = -w / 2;
  const y = -h / 2;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Rounded rect fill
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = obj.color;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = obj.borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Clip so text doesn't overflow the rounded rect
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();

  if (obj.loading) {
    // --- Loading state: animated "Gemini is cooking..." text ---
    const textX = x + h * 0.6;
    const fontSize = Math.max(10, h * 0.38);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    const dotCount = (Math.floor(Date.now() / 400) % 3) + 1;
    ctx.fillStyle = '#4285f4';
    ctx.fillText('Gemini is cooking' + '.'.repeat(dotCount), textX, 0);
  } else {
    // --- Normal state ---
    // Magnifying glass icon (left side)
    const iconX = x + h * 0.6;
    const iconY = 0;
    const iconR = h * 0.18;
    ctx.strokeStyle = COLORS.searchBarText;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(iconX + iconR * 0.7, iconY + iconR * 0.7);
    ctx.lineTo(iconX + iconR * 1.5, iconY + iconR * 1.5);
    ctx.stroke();

    // Text — user input or placeholder
    const textX = iconX + iconR * 2 + 6;
    const fontSize = Math.max(10, h * 0.38);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';

    if (obj.text) {
      ctx.fillStyle = '#202124';
      ctx.fillText(obj.text, textX, 0);
      const textW = ctx.measureText(obj.text).width;
      if (Math.floor(Date.now() / 530) % 2 === 0) {
        ctx.fillStyle = '#202124';
        ctx.fillRect(textX + textW + 2, -fontSize * 0.45, 1.5, fontSize * 0.9);
      }
    } else if (obj.focused) {
      if (Math.floor(Date.now() / 530) % 2 === 0) {
        ctx.fillStyle = '#202124';
        ctx.fillRect(textX, -fontSize * 0.45, 1.5, fontSize * 0.9);
      }
    } else {
      ctx.fillStyle = COLORS.searchBarText;
      ctx.fillText('Search Google or type a URL', textX, 0);
    }
  }

  ctx.restore();
}

function drawRect(ctx, obj) {
  const w = obj.hw * 2 * SCALE;
  const h = obj.hh * 2 * SCALE;

  ctx.fillStyle = obj.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

// ---------------------------------------------------------------------------
// Google landing page element helpers
// ---------------------------------------------------------------------------

function drawLogoLetter(ctx, obj) {
  const h = obj.hh * 2 * SCALE;
  const fontSize = obj.fontSize || h * 0.7;
  ctx.font = `bold ${fontSize}px "Product Sans", Arial, sans-serif`;
  ctx.fillStyle = obj.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tx = obj.textOffsetX || 0;
  const ty = obj.textOffsetY || 0;
  ctx.fillText(obj.char, tx, ty);
  ctx.textAlign = 'left';
}

function drawButton(ctx, obj) {
  const w = obj.hw * 2 * SCALE;
  const h = obj.hh * 2 * SCALE;
  const r = obj.rounded ? h / 2 : 4;

  // Background
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fillStyle = obj.bgColor;
  ctx.fill();

  // Border
  ctx.strokeStyle = obj.borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label
  const fontSize = Math.max(12, h * 0.42);
  ctx.font = `500 ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = obj.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(obj.label, 0, 0);
  ctx.textAlign = 'left';
}

function drawTextLink(ctx, obj) {
  const h = obj.hh * 2 * SCALE;
  const fontSize = Math.max(12, h * 0.5);
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = obj.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(obj.label, 0, 0);
  ctx.textAlign = 'left';
}

function drawAppsGrid(ctx, obj) {
  const h = obj.hh * 2 * SCALE;
  const dotR = Math.max(2, h * 0.08);
  const spacing = h * 0.25;

  ctx.fillStyle = '#5f6368';
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      ctx.beginPath();
      ctx.arc(col * spacing, row * spacing, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFooterBar(ctx, obj) {
  const w = obj.hw * 2 * SCALE;
  const h = Math.max(1, obj.hh * 2 * SCALE);
  ctx.fillStyle = obj.bgColor;
  ctx.fillRect(-w / 2, -h / 2, w, h);
}

function drawGeminiIcon(ctx, obj) {
  const r = obj.radius * SCALE;

  // Bezier-eased spin when loading
  if (obj.loading) {
    const period = 1500;
    const raw = (Date.now() % period) / period;
    const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    ctx.rotate(eased * Math.PI * 2);
  }

  // Gemini sparkle: four-pointed star drawn with bezier curves
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0.5, '#4285f4');
  grad.addColorStop(1, '#efb401');
  grad.addColorStop(0.2, '#e43e2b');

  ctx.fillStyle = grad;
  ctx.beginPath();

  // Four-pointed star via quadratic curves
  const tip = r * 0.95;
  const mid = r * 0.18;
  ctx.moveTo(0, -tip);
  ctx.quadraticCurveTo(mid, -mid, tip, 0);
  ctx.quadraticCurveTo(mid, mid, 0, tip);
  ctx.quadraticCurveTo(-mid, mid, -tip, 0);
  ctx.quadraticCurveTo(-mid, -mid, 0, -tip);
  ctx.closePath();
  ctx.fill();
}

function drawDino(ctx, obj) {
  if (!obj.spriteReady || !obj.sprite) return;

  const frame = obj.currentFrame;
  // Source crop from the 2x sprite sheet (88×94 per frame)
  const sx = frame * 88;
  const sw = 88;
  const sh = 94;
  // Display at 1x size derived from physics half-extents
  const dw = obj.hw * 2 * SCALE;
  const dh = obj.hh * 2 * SCALE;

  // Dino sprite naturally faces right (direction of travel from left)
  ctx.drawImage(obj.sprite, sx, 0, sw, sh, -dw / 2, -dh / 2, dw, dh);

  // Speech bubble (counter-rotate so it stays upright)
  if (obj.showSpeech && obj.speechText) {
    ctx.save();
    ctx.rotate(-obj.body.getAngle());
    drawSpeechBubble(ctx, obj.speechText, dh);
    ctx.restore();
  }
}

function drawSpeechBubble(ctx, text, spriteHeight) {
  const maxWidth = 220;
  const padding = 10;
  const fontSize = 12;
  const lineHeight = 16;
  const tailH = 10;

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  // Word wrap
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth - padding * 2) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const bubbleW = maxWidth;
  const bubbleH = lines.length * lineHeight + padding * 2;
  const bubbleX = -bubbleW / 2;
  const bubbleY = -spriteHeight / 2 - bubbleH - tailH - 5;

  // Bubble background
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
  ctx.fill();
  ctx.stroke();

  // Tail (triangle pointing down toward dino)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, bubbleY + bubbleH);
  ctx.lineTo(8, bubbleY + bubbleH);
  ctx.lineTo(0, bubbleY + bubbleH + tailH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cover the tail join line with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-7, bubbleY + bubbleH - 2, 14, 4);

  // Text
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bubbleX + padding, bubbleY + padding + i * lineHeight);
  }
  ctx.textAlign = 'left';
}

function drawCursorArrow(ctx) {
  // Standard arrow cursor shape (pixel-sized, drawn at body origin)
  // The body origin is the arrow tip (top-left corner of the cursor)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 21);
  ctx.lineTo(4.2, 16.8);
  ctx.lineTo(8.4, 24);
  ctx.lineTo(11.2, 22.4);
  ctx.lineTo(7, 15.4);
  ctx.lineTo(12.6, 14.7);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawMassLabel(ctx, obj) {
  const body = obj.body;
  if (!body) return;
  const mass = body.getMass();
  // Static bodies have mass 0 — show the fixture density * area instead
  let label;
  if (mass > 0) {
    label = mass.toFixed(1) + 'kg';
  } else {
    // Compute from fixture density for static bodies
    const f = body.getFixtureList();
    if (!f) return;
    const d = f.getDensity();
    const shape = f.getShape();
    let area = 0;
    if (shape.getType() === 'circle') {
      const r = shape.getRadius();
      area = Math.PI * r * r;
    } else if (shape.getType() === 'polygon') {
      // Approximate with bounding box from half-widths
      if (obj.hw != null && obj.hh != null) {
        area = 4 * obj.hw * obj.hh;
      }
    }
    const effectiveMass = d * area;
    label = effectiveMass.toFixed(1) + 'kg*';
  }

  // Offset below the object center
  const offsetY = obj.radius ? obj.radius * SCALE + 10 : (obj.hh ? obj.hh * SCALE + 10 : 15);

  ctx.save();
  ctx.rotate(-obj.body.getAngle()); // unrotate so text is always upright
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 0, offsetY);
  ctx.restore();
}

function drawDebugHitbox(ctx, obj) {
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1.5;

  // Read actual fixture shape from the Box2D body for accurate hitbox visualization
  let drawn = false;
  try {
    const fixture = obj.body && obj.body.getFixtureList();
    if (fixture) {
      const shape = fixture.getShape();
      const type = shape.getType();
      if (type === 'circle') {
        const r = shape.getRadius() * SCALE;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        drawn = true;
      } else if (type === 'polygon') {
        const verts = shape.m_vertices;
        const count = shape.m_count;
        if (verts && count > 0) {
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            const v = verts[i];
            const px = v.x * SCALE;
            const py = v.y * SCALE;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          drawn = true;
        }
      }
    }
  } catch (_) { /* fall through to legacy drawing */ }

  if (!drawn) {
    if (obj.hitShape === 'diamond') {
      const s = obj.diamondHalf * SCALE;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.stroke();
    } else if (obj.hitShape === 'circle' || obj.type === 'circle') {
      const r = obj.radius * SCALE;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (obj.hw != null && obj.hh != null) {
      const w = obj.hw * 2 * SCALE;
      const h = obj.hh * 2 * SCALE;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
  }
  ctx.globalAlpha = 1.0;
}
