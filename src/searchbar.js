import planck from 'planck';
import { SCALE, COLORS, CAT_ENVIRONMENT } from './constants.js';
import { registerObject } from './objects.js';

// Dimensions in meters (half-sizes)
const HW = 40;
const HH = 3;
const MASS = 30;

/**
 * Creates a Google-style search bar.
 * Starts as a **static** body pinned in place.
 * When the user first drags it, input.js flips it to dynamic so gravity takes over.
 * Keyboard input anywhere on the page is captured and displayed inside the bar.
 * Pressing Enter resets to the default placeholder text.
 */
export function createSearchBar(world, x, y, onSubmit) {
  const body = world.createBody({
    type: 'static',
    position: new planck.Vec2(x, y),
  });

  // Mark so input.js knows this static body is draggable
  body.setUserData({ draggable: true });

  body.createFixture(new planck.Box(HW, HH), {
    density: MASS / (4 * HW * HH),
    friction: 0.4,
    restitution: 0.15,
    filterCategoryBits: CAT_ENVIRONMENT,
  });

  const obj = {
    body,
    type: 'searchbar',
    hw: HW,
    hh: HH,
    color: COLORS.searchBar,
    borderColor: COLORS.searchBarBorder,
    text: '',           // live user input; empty = show placeholder
    focused: false,
    loading: false,
  };

  registerObject(obj);

  // --- Click-to-focus ---
  window.addEventListener('mousedown', (e) => {
    const wx = e.clientX / SCALE;
    const wy = e.clientY / SCALE;
    const pos = body.getPosition();
    obj.focused =
      Math.abs(wx - pos.x) <= HW &&
      Math.abs(wy - pos.y) <= HH;
  });

  // --- Keyboard input ---
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (obj.text && onSubmit) {
        onSubmit(obj.text, body);
      }
      obj.text = '';
    } else if (e.key === 'Backspace') {
      obj.text = obj.text.slice(0, -1);
    } else if (e.key.length === 1) {
      // Single printable character
      obj.text += e.key;
    }
  });

  return { body, setLoading(v) { obj.loading = v; } };
}
