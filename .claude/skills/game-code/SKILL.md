---
name: game-code
description: How platformer-2d's src/ speaks the parity contract — the tuning translation table, how the ninja and enemies hold run state, the system order, and the fixture gotchas. Consult before changing any system in src/, adding a feel number, or writing a test against the game's code.
---

<!-- generatedBy: claude-fable-5, generatedAt: 2026-08-15 -->

# game-code

How this game's `src/` speaks the parity contract. Knowledge true of this game only
(`genre-spinup` S2); the feel numbers themselves live in `docs/REMAKE-PARITY.md` and are
not restated here.

## Decisions

### C1: `tuning.ts` is the parity doc's translation table, and nothing else holds a feel number

The doc speaks the reference's units — pixels per frame at 60fps, y down; the kernel's
scenes are y-up and systems take seconds. Every constant is converted exactly once, in
`src/systems/tuning.ts`, each line citing the doc's figure (speeds ×60, accelerations
×3600, up positive). **Timers stay in reference frames**, advanced by `dt * 60` per step —
at the fixed step that is exactly one frame, so a 6-frame coyote window is the doc's 6.
A system that wants a number imports it from there; a number appearing anywhere else in
`src/` is a defect even if it is correct. Changing a feel means changing the doc first —
the doc is the contract, this file is its translation, never a second opinion.

### C2: The player *is* the spawn marker, taken over on the first step

The marker carries `player` with all seven frames (game-content T4), so `ninja.ts`
converts it: swaps its sprite to the idle frame, drops its hitbox feet onto the marker
tile's bottom edge, and drives it from then on. No second entity is spawned, respawn is a
state reset, and the marker icon disappears from play by *becoming* the ninja. `playerIn`
finds it by the `player` component, never by name or id.

### C3: Run state lives beside the level in WeakMaps, keyed on the entity; a hitbox is centre-x plus feet-y

The tower defense's `march` precedent, held throughout: velocities, timers, modes, coins —
none of it is written into components (it would appear in the Inspector as vocabulary
nobody authored, and it dies with the copy anyway). Each system keys its state weakly on
the entity object, which is fresh per run, so Stop-and-Play resets everything with no
reset code. Hitboxes are carried as centre x + bottom y (`tiles.ts`), because every rule
in the parity doc is phrased around feet: feet on floors, feet near enemy tops, feet
below the pit line.

### C4: Systems in list order are the rules — ninja, enemies, clash, effects, pose, chase

Movement first (ninja, then enemies), `clash` judging contact where this step actually put
both sides, `effects` flying the debris the bumps threw, `pose` dressing everything
(frames, facing, squash & stretch, bob, wobble — presentation only: a level run without it
plays the same game standing stiffly), and `chase` aiming the camera last at where the
ninja ended up. Pose owns every scale and re-derives sprite y from the feet, so squash
grows the sprite upward from planted feet; ninja/enemies write the unscaled stand so the
game is complete without pose.

### C5: The level's side walls are derived from its own outermost solid columns

The reference's "side edges solid" is not authored as tiles; `tiles.ts` treats the
leftmost and rightmost solid columns as walls. In the real level those are columns 0 and
63, which is exactly the reference's clamp. The trade is TG1 below.

### C6: Bump debris is run-only `fx` entities wearing art the level already carries

The pop-coin wears the look of any coin in the level; shards wear the broken brick's own
texture at scale 4/16. Nothing new ships: game-content T4 already guarantees every state
texture is loaded before a system spawns anything. The reference's sparkle and dust-mote
particles are **deliberately not built** — they need art the level does not carry, and
they belong to the parity pass. _(The seven sounds were parked here too until the sound
phase; see C9.)_

### C9: The seven sounds are recipes in one file, raised by the rule that causes them, and mute is a fact

`src/systems/sound.ts` is §8 as a table of notes — the same relationship to the doc that
`tuning.ts` has to §1–§7, minus the arithmetic, since Hz and seconds mean the same thing
on both sides. **C1's rule applies unchanged: a frequency or a duration anywhere else in
`src/` is a defect.** Each cue goes out through the kernel's sound seam
(`editor-kernel` D33): the game names notes, the host makes the noise, and nothing in
`src/` has heard of an audio context — which is why every sound is asserted in plain Node.

Three things worth keeping:

- **The noise is made where the rule fires, not by a system that watches for it.** A
  `sound(entities, 'stomp')` sits beside the state change in `clash.ts`, `enemies.ts` and
  `ninja.ts`. Where the reference plays the same sound from two call sites around one
  helper (`knockOut`, `die`), the cue moved *into* the helper instead — so a third cause
  cannot forget it. That is the only deliberate difference from the reference's placement.
- **Mute is a story fact, not run state.** A WeakMap beside the level — C3's default for
  everything else — would be un-muted by R, since R reloads the scene (C8) and run state
  dies with the copy. The fact survives, which is what the reference's module variable
  does across *its* restart. It also outlives the tab, which the reference does not; a
  sound setting that stays set is the ordinary behaviour and the alternative is losing it
  on every restart.
- **`soundSystem` runs first and owns M and nothing else**, so an unmute's confirming
  coin is queued before whatever else that step makes a noise about.

### C10: Every thrown thing is one `fx` entity with ballistics, and a fade is one number

`effects.ts` flies five different-looking things — the pop-coin, the brick's four shards, the coin sparkle, the puff under a stomped enemy, the brick's dust — and they are one model: an entity carrying `fx` with `vx`, `vy`, gravity, per-frame drag, a life and a `fadeFrames`. What differs between them is which numbers `tuning.ts` hands over and which texture they wear.

Three things worth keeping:

- **Two fade rules turned out to be one.** The doc says particles fade over their last 40%; the reference fades the pop-coin over its last 10 frames. Both are "one linear fade over the last N frames", so `fx` carries N and nothing branches. The fade itself is the kernel's sprite opacity (`editor-kernel` D34) — this game's first use of it, and the reason it exists.
- **The scatter is random, exactly as the reference's is**, so no two bursts look alike. That decides how they are tested: a test asserts *how many* particles, *what* they wear, how long they last and that they fade — never where one went. Where one lands is the one thing meant to be different every time.
- **Particle colours ride the prefab that throws them** (game-content T7), so a sparkle is thrown by reading the coin's own art, and a coin with no sparkle art throws nothing rather than throwing something wrong. The spent pop-coin's sparkle is found the same way the pop-coin's own picture was: off any coin still standing in the level.

**The cross over a spent pop-coin rides it without being attached to it.** It is thrown as
its own `fx` with the coin's position, velocity and gravity, so the two are integrated
identically and stay together — no link between entities, which this game has never needed
and did not need to start needing for one twinkle. It is also the remake's one admitted
approximation: the reference draws bars in screen pixels that never thicken with the zoom,
and a scaled texture does. §7 states the difference rather than hiding it.

Two traps this file already fell into. `wear` merges into the sprite component rather than replacing it, or re-dressing a fading entity would snap it back to solid. And a test that counts `fx#` entities after a brick breaks now counts nine, not four — the dust is thrown with the shards, so count by texture.

### C8: The screen is content plus a redraw-every-step system, and R is a door to this same scene

The coin counter card and the controls hint are *placed content*, pinned to their corners
by the kernel's `screen` component and carrying every run-time texture the HUD needs (the
counter's `hud` component holds the ten digits and both banners — T4 again). `hud.ts`
then, every step, removes everything it drew last step (`hud#…` ids) and draws it again
from the facts: the count as digit entities right-aligned in the card, the OUCH! banner
for 0.7 s of a death, the LEVEL CLEAR! banner with the total once won, and it deletes the
hint entity on the first held or pressed key or after 9 s. Ids are stable per slot
(`hud#digit0`, `hud#banner`) so the renderer updates sprites in place. **R restarts by
`openDoor` to `sceneIn`'s own path** — the host reloads the scene from the file, which is
exactly "everything back to authored state" with no reset code anywhere; it needs the
story carrier (both hosts inject it, and the fixture `playing()` adds one).

The digit and banner *offsets* in `hud.ts` are derived from the generated art's pixel
layout (card 30×12, banner 112×40, "COINS:" ending 53 in) and say so in comments;
regenerating that art with different dimensions means re-deriving those constants.

### C7: Facing and death-blink are sprite tricks, not features

Facing flips `scaleX`'s sign about the centre pivot (all sprites are symmetric enough);
the death blink deletes and restores the `sprite` component on the doc's 3-of-6-frame
rhythm, because an entity with nothing to draw is how the renderer spells "hidden".

## Gotchas

### CG1: A test platform's edges are walls, because C5 derives walls from the fixture's own solids

A fixture of four ground tiles cannot drop the ninja off its edge: the platform's ends
*are* the level's outermost solid columns, so the "edge" is a wall and coyote-time and
pit tests silently test nothing — the failure reads as the jump being broken. **Fix:** put
a distant anchor column in any fixture that needs a real edge or pit
(`tests/level.ts` fixtures do this with `floor(20, 21)`), so the outer wall sits past the
gap. _[earned 2026-08-15, first game tests]_

### CG3: `go` to the *same* scene works, but only at 127.0.0.1

The first R test in the editor "did nothing" for five seconds: every fetch from a page at
`localhost` paid Chromium's ~300 ms IPv6-fallback delay, and a scene reload is sixty-odd
fetches. `editor-verification` W24 has the general rule; here it matters because R is the
one gesture that reloads a whole level mid-play. _[earned 2026-08-15]_

### CG4: A fixture with no coin counter has no R either, because the hud stands down before it reads the key

`hud.ts` returns on its first line when no entity carries the `hud` component, and R is
handled *after* that line — so a test level built without `counter()` presses R into
silence, and the failure reads as the door seam or the story carrier being broken. It
never bites the shipped level, which always has a counter. **Fix:** put `counter()` in any
fixture that presses R. Worth remembering more generally: the hud system owns one key that
has nothing to do with drawing the hud. _[earned 2026-08-15, sound phase]_

### CG2: State helpers answer null until one step has run

Every state map fills on first sight of an entity, so `ninjaOf`/`enemyOf` before the
first step is null and a test helper that reads it throws confusingly. Step once to stand
everything up before asserting. _[earned 2026-08-15]_

## Contracts

- `src/systems/tuning.ts` — every converted feel number, cited line by line (C1).
- `src/systems/tiles.ts` — the solid map, the axis-separated moves, the exact-edge rule
  (touching is not colliding), and the wall derivation (C5).
- `tests/level.ts` — the fixture vocabulary: entity lists shaped exactly as the generated
  prefabs shape components, the `playing()` harness that writes held keys the way the
  runner does, and `heard()`, which drains the cue queue the way a host does and names
  each cue by matching the recipes.
- `src/systems/sound.ts` — C9: §8 note for note, the mute fact, and M.
- `docs/REMAKE-PARITY.md` §11 — the checklist a parity pass runs; the systems built here
  cover movement, tiles, coins, bumps, enemies, death, win, camera, the three screen
  nouns (counter, banner, hint) plus R, and all seven sounds with M-mute — deliberately
  not particles, touch controls, or the export's fit rule.
- `src/systems/hud.ts` and `assets/textures/ui/` — the screen (C8): the generated 3×5-font
  cards and digits, and the offsets that place digits inside them.
