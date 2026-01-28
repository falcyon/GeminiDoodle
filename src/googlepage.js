import planck from 'planck';
import { SCALE, CAT_ENVIRONMENT } from './constants.js';
import { registerObject } from './objects.js';

/**
 * Creates a static, draggable Box2D body — same pattern as the search bar.
 * On first drag, input.js flips it to dynamic so gravity takes over.
 */
function createStaticBody(world, x, y, hw, hh, mass) {
  const body = world.createBody({
    type: 'static',
    position: new planck.Vec2(x, y),
  });
  body.setUserData({ draggable: true });
  body.createFixture(new planck.Box(hw, hh), {
    density: mass / (4 * hw * hh),
    friction: 0.4,
    restitution: 0.15,
    filterCategoryBits: CAT_ENVIRONMENT,
  });
  return body;
}

/**
 * Creates a static, draggable circle body.
 */
function createStaticCircleBody(world, x, y, radius, mass) {
  const body = world.createBody({
    type: 'static',
    position: new planck.Vec2(x, y),
  });
  body.setUserData({ draggable: true });
  body.createFixture(new planck.Circle(radius), {
    density: mass / (Math.PI * radius * radius),
    friction: 0.4,
    restitution: 0.15,
    filterCategoryBits: CAT_ENVIRONMENT,
  });
  return body;
}

/**
 * Populates the world with every visible element of the Google landing page:
 *   - Google logo (multicolored)
 *   - "Google Search" & "I'm Feeling Lucky" buttons
 *   - "Google offered in: / Español" text
 *   - Top-right nav: Gmail, Images, apps grid, Sign in
 *   - Footer: separators, country name, left/right links
 *
 * Each element is a static body tagged `draggable`.
 */
export function createGooglePage(world) {
  const W = window.innerWidth / SCALE;
  const H = window.innerHeight / SCALE;

  // ── Google Logo (each letter is its own physics body) ────────────────
  const logoLetters = [
    { char: 'G', color: '#4285F4', hw: 4.0, shape: 'circle', radius: 4.4, textOffsetY: 3, textOffsetX: -2, yOffset: -6 },
    { char: 'o', color: '#EA4335', hw: 3.3, shape: 'circle', radius: 3.1, textOffsetY: -3 },
    { char: 'o', color: '#FBBC05', hw: 3.3, shape: 'circle', radius: 3.1, textOffsetY: -3 },
    { char: 'g', color: '#4285F4', hw: 3, hh: 4.4, textOffsetY: -10, yOffset: 9 },
    { char: 'l', color: '#34A853', hw: 1, hh: 4, textOffsetY: 3, yOffset: -5 },
    { char: 'e', color: '#EA4335', hw: 3.0, shape: 'circle', radius: 3.1, textOffsetY: -3 },
  ];
  const logoHH = 5;
  const logoFontSize = 8 * 2 * SCALE * 0.7; // original visual size (hh=8)
  const logoGap = 0.4;
  const logoY = H * 0.30;

  // Total width so we can center the whole word
  const totalLogoW = logoLetters.reduce((s, l) => s + l.hw * 2, 0)
    + logoGap * (logoLetters.length - 1);
  let lx = W / 2 - totalLogoW / 2;

  for (const letter of logoLetters) {
    const cx = lx + letter.hw;
    const isCircle = letter.shape === 'circle';
    const letterHH = letter.hh || logoHH;
    const ly = logoY + (letter.yOffset || 0) / SCALE;
    const body = isCircle
      ? createStaticCircleBody(world, cx, ly, letter.radius, 5)
      : createStaticBody(world, cx, ly, letter.hw, letterHH, 5);
    const obj = {
      body,
      type: 'logoletter',
      hw: letter.hw,
      hh: letterHH,
      char: letter.char,
      color: letter.color,
      fontSize: logoFontSize,
    };
    if (isCircle) {
      obj.hitShape = 'circle';
      obj.radius = letter.radius;
    }
    if (letter.textOffsetX) obj.textOffsetX = letter.textOffsetX;
    if (letter.textOffsetY) obj.textOffsetY = letter.textOffsetY;
    registerObject(obj);
    lx += letter.hw * 2 + logoGap;
  }

  // ── Buttons below the search bar ─────────────────────────────────────
  registerObject({
    body: createStaticBody(world, W / 2 - 15, H * 0.49, 11, 2.8, 10),
    type: 'button',
    hw: 11,
    hh: 2.8,
    label: 'Google Search',
    bgColor: '#f8f9fa',
    textColor: '#3c4043',
    borderColor: '#dadce0',
  });

  registerObject({
    body: createStaticBody(world, W / 2 + 15, H * 0.49, 12.5, 2.8, 10),
    type: 'button',
    hw: 12.5,
    hh: 2.8,
    label: "I'm Feeling Lucky",
    bgColor: '#f8f9fa',
    textColor: '#3c4043',
    borderColor: '#dadce0',
  });

  // ── Language line ─────────────────────────────────────────────────────
  registerObject({
    body: createStaticBody(world, W / 2 - 6, H * 0.55, 9, 1.2, 5),
    type: 'textlink',
    hw: 9,
    hh: 1.2,
    label: 'Google offered in:',
    textColor: '#70757a',
  });

  registerObject({
    body: createStaticBody(world, W / 2 + 12, H * 0.55, 3.5, 1.2, 3),
    type: 'textlink',
    hw: 3.5,
    hh: 1.2,
    label: 'Español',
    textColor: '#1a0dab',
  });

  // ── Top-right navigation ─────────────────────────────────────────────
  registerObject({
    body: createStaticBody(world, W - 40, 5, 3, 1.2, 3),
    type: 'textlink',
    hw: 3,
    hh: 1.2,
    label: 'Gmail',
    textColor: 'rgba(0,0,0,0.87)',
  });

  registerObject({
    body: createStaticBody(world, W - 30, 5, 3.5, 1.2, 3),
    type: 'textlink',
    hw: 3.5,
    hh: 1.2,
    label: 'Images',
    textColor: 'rgba(0,0,0,0.87)',
  });

  registerObject({
    body: createStaticBody(world, W - 20, 5, 2, 2, 3),
    type: 'appsgrid',
    hw: 2,
    hh: 2,
  });

  registerObject({
    body: createStaticBody(world, W - 7, 5, 6, 2.5, 5),
    type: 'button',
    hw: 6,
    hh: 2.5,
    label: 'Sign in',
    bgColor: '#1a73e8',
    textColor: '#ffffff',
    borderColor: '#1a73e8',
    rounded: true,
  });

  // ── Footer ────────────────────────────────────────────────────────────
  // Top separator line
  registerObject({
    body: createStaticBody(world, W / 2, H - 15, W / 2, 0.15, 15),
    type: 'footerbar',
    hw: W / 2,
    hh: 0.15,
    bgColor: '#dadce0',
  });

  // Country name
  registerObject({
    body: createStaticBody(world, W / 2, H - 11.5, 7, 1.2, 5),
    type: 'textlink',
    hw: 7,
    hh: 1.2,
    label: 'United States',
    textColor: '#70757a',
  });

  // Bottom separator line
  registerObject({
    body: createStaticBody(world, W / 2, H - 8.5, W / 2, 0.15, 15),
    type: 'footerbar',
    hw: W / 2,
    hh: 0.15,
    bgColor: '#dadce0',
  });

  // Footer left links
  const leftLinks = ['About', 'Advertising', 'Business', 'How Search works'];
  const leftStart = 18;
  const leftSpacing = 17;
  for (let i = 0; i < leftLinks.length; i++) {
    const hw = leftLinks[i].length * 0.5 + 0.5;
    registerObject({
      body: createStaticBody(world, leftStart + i * leftSpacing, H - 5, hw, 1.2, 3),
      type: 'textlink',
      hw,
      hh: 1.2,
      label: leftLinks[i],
      textColor: '#70757a',
    });
  }

  // Footer right links
  const rightLinks = ['Privacy', 'Terms', 'Settings'];
  const rightStart = W - 40;
  const rightSpacing = 14;
  for (let i = 0; i < rightLinks.length; i++) {
    const hw = rightLinks[i].length * 0.5 + 0.5;
    registerObject({
      body: createStaticBody(world, rightStart + i * rightSpacing, H - 5, hw, 1.2, 3),
      type: 'textlink',
      hw,
      hh: 1.2,
      label: rightLinks[i],
      textColor: '#70757a',
    });
  }
}
