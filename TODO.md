# TODO - UI Polish

## Completed
- [x] Increase speech bubble height for code display (8 lines max)
- [x] Refactor speech bubbles into single shared module (`src/speechBubble.js`)
- [x] Gemini flies to spawn location, shows code, waits 2s, then spawns object
- [x] Gemini holds position during spawn animation
- [x] Increase code font size in speech bubble (11px → 13px)
- [x] Health bar height consistency fixed
- [x] Enemy position lowered (0.60 → 0.65)
- [x] Crash size tuned (initial radius 12 → 8)
- [x] Crash growth rate increased (0.08 → 0.15)
- [x] Suction strength reduced (300 → 150)
- [x] Victory sequence overhaul:
  - [x] Faster particle/text fading
  - [x] Eye fades out instead of bouncing
  - [x] Confetti reduced (12 particles, stops after 5 rounds)
  - [x] Search bar restores to center with playground message
  - [x] Victory text as Box2D body
  - [x] Play Again button as draggable Box2D body
  - [x] Google UI elements removed on victory

---

## 1. World Shake on Object Consumption

**File**: `src/combat/theCrash.js`

Add shake trigger in `handleVoidContact()` when object is consumed:
- Track shake state: `shakeIntensity`, `shakeDuration`
- Trigger shake when `scheduledDestroys.push()` is called
- Expose `getShake()` method

**File**: `src/renderer.js`

Apply shake offset in draw loop:
- Get shake from crash module
- Apply random x/y offset to canvas transform
- Decay shake over time

---

## 2. Clearer Game Intro

### A. Speed up health bar loading
- Reduce total intro time (currently ~4.5 seconds to dino spawn)
- Make bar fill faster

### B. Google page elements pop in like slow-loading page
- Elements start invisible
- Pop in one by one with slight delays (logo letters, then search bar, then buttons, etc.)
- Mimics a webpage loading - but something feels "off"

### C. Add visual glitches during load
- Subtle screen flicker/corruption
- Elements might briefly show wrong colors or positions
- Static/noise overlay that fades
- Signals to user: "this isn't normal"

### D. Interactive Story Tutorial (Gemini Quest)

When Gemini appears, start a **click-to-continue story sequence**:

**Step 1**: Gemini appears with spotlight/pause
- Speech: "Oh no! It's the Collapsing Corrupting Core of Crashes! It's about to destroy everything!"
- User clicks to continue

**Step 2**: Physics resumes, Crash grows menacingly
- Speech: "Quick! We need to hit its eye to stop it!"
- User clicks to continue

**Step 3**: Make "Sign in" button fall from navbar
- Speech: "Grab that Sign In button that just fell and throw it at its eye!"
- Actually trigger the Sign In body to become dynamic and fall
- User clicks to continue (or after they throw it)

**Step 4**: Explain creation mechanic
- Speech: "I can create anything you search for! Let me make a tank to help..."
- User clicks to continue

**Step 5**: Gemini auto-creates a tank
- Actually spawn the tank from curated cache
- Speech: "Now you try! Search for things to defeat The Crash!"
- Tutorial complete, normal gameplay begins

**Implementation**:
- Add `tutorialStep` state to intro.js
- Each step waits for click on speech bubble or screen
- Speech bubble needs "Click to continue" indicator (already supported in speechBubble.js)
- Track which tutorial actions completed

---

## 3. Environment Deterioration Improvements

Current deterioration makes the page look too chaotic - bad gameplay experience.

- Redesign the deterioration effects to be more subtle/gradual
- Should feel ominous but not visually overwhelming
- Consider: slow color drain, subtle cracks, gentle warping instead of harsh effects

---

## 4. Gemini Icon Danger Zone

Gemini icon should be vulnerable to The Crash's suction:

- If Gemini gets too close to The Crash, it starts getting sucked in **slowly**
- Slow enough that player can react (move mouse away to pull Gemini back)
- Suction strength increases the closer Gemini gets
- If Gemini touches the void core → **Game Over** (different from health-based defeat)
- Visual feedback: Gemini stretches/distorts as it gets closer
- Audio/visual warning when Gemini enters danger zone

**Implementation**:

- In `theCrash.js`: check distance to Gemini each frame
- Apply gentle force toward void center when within threshold
- In contact handler: detect Gemini touching void → trigger defeat
- In `gameState.js`: add new defeat reason ('gemini_consumed')
- In `combatHUD.js`: show different game over message for this defeat type

---

## Verification Checklist

- [ ] **Gemini danger**: Move Gemini close to Crash -> gets slowly sucked in, game over if consumed
- [ ] **Shake**: Search for "ball" -> see world shake when Crash eats it
- [ ] **Intro feel**: Refresh page -> Google elements pop in with glitches, feels "off"
- [ ] **Tutorial**: Gemini appears -> story plays out with click-to-continue
- [ ] **Sign In falls**: During tutorial, Sign In button drops from navbar
- [ ] **Tank spawns**: Gemini auto-creates tank as demonstration
- [ ] **Gameplay**: After tutorial, normal search/create flow works
- [ ] **Deterioration**: Effects are subtle, not chaotic
