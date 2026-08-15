<!-- generatedBy: claude-fable-5, generatedAt: 2026-08-14 -->

# Remake Parity — the 1:1 contract

The reference game is `docs/reference/pixel-platformer-game.html`, kept byte-identical to
the file Zach provided and never edited. This document is the checkable extraction of
everything in it: if every line here holds in the remake, the remake is 1:1. It is owned
and maintained by AI sessions; the reference itself is the human's.

**Units:** logical pixels, 16 px = one tile. All speeds and accelerations are *per frame*
at 60 fps, exactly as the reference runs them. Signs follow the reference (y increases
downward, negative vy is up); the kernel's scenes are y-up, so the conversion belongs to
whatever writes the scene, and "the level looks identical" is the check.

---

## 1. The level

| Fact | Value |
|---|---|
| Grid | 64 × 19 tiles |
| Spawn | tile (2, 14) — player placed at x·16+2, y·16+(16−14) |
| Side edges | solid walls |
| Top edge | open (jumping above the screen is fine) |
| Bottom | falling past `19·16 + 40` px kills |

Tile legend (reference IDs → things): 0 empty · 1 ground · 2 brick · 3 ?-block · 4 coin ·
5 pipe · 6 spike · 7 flag · 8 used block · 9 walker · 16 turtle · 10 cloud · 11 bush ·
12 tree · 13 grass · 14 hill · 15 fence. IDs 10–15 are scenery: never solid, never
interactive. Solid set: {1, 2, 3, 5, 8}.

Enemy tiles are lifted out of the grid into live entities when play starts; per-placement
speed overrides in the reference level: walker at (16,15) speed **0.6**, turtle at (45,15)
speed **0.35**. Other placements use defaults (walker at (31,10), turtle at (25,15), walker
at (46,15)).

Auto-variants by neighbor (chosen at draw time, not authored): ground shows its grassy
**top** face unless another ground tile is directly above (then plain **fill**); pipe shows
its **cap** unless pipe is above (then **body**); flag shows the **banner top** unless flag
is above (then bare **pole**).

## 2. The ninja

Hitbox **11 × 14**; sprite 12 × 16 drawn anchored bottom-center with its bottom 2 px below
the hitbox floor (feet overlap the grass lip).

| Constant | Value |
|---|---|
| Gravity | 0.32 /frame², capped at fall speed 7 |
| Walk top speed | 1.7 |
| Sprint top speed | 2.8 (Shift held + moving) |
| Acceleration | 0.28 toward target speed |
| Friction | 0.36 when no input |
| Jump velocity | −6.1 |
| Sprint jump | −6.7, used when \|vx\| > 1.9 at takeoff |
| Jump cut | releasing the key caps rising speed at −2.4 |
| Coyote time | 6 frames after leaving the ground |
| Jump repeat | key must be released before it can jump again |

Facing follows the sign of vx. Collision is axis-separated (move x, resolve; move y,
resolve), against the solid set only.

**Death:** spikes, enemy side-contact, pits. 40-frame death timer (sprite blinks, hidden 3
of every 6 frames), knocked upward at vy −4 (0 if it was a fall), then respawn at spawn.
**Coins survive death.** Only R (restart) resets coins, blocks, and enemies to authored
state.

**Win:** touching any flag tile. Player freezes (vx zeroed), win fanfare, banner shows.

## 3. Tile interactions

- **Coin pickup:** collected when the player's center is within 10 px of the coin tile's
  center on both axes (generous on purpose). Sparkle burst + coin sound.
- **Spike:** lethal zone is inset — 6 px off the top of the tile, 2 px off each side, i.e.
  overlap must reach `y > ty·16+6` and `tx·16+2 < x < (tx+1)·16−2`.
- **Head bump** (hitting a solid tile while moving up):
  - **?-block** → becomes used block, +1 coin, coin sound. A pop-coin animates out of the
    block top: starts 2 px above, vy −3.4, gravity 0.26, spins 0.9 rad/frame (drawn with
    width \|cos spin\|), lives 34 frames, sparkle when it expires.
  - **Brick** → removed. Break sound. Four shards fly (velocities (−1.5,−3.2), (1.5,−3.2),
    (−1.1,−1.9), (1.1,−1.9); gravity 0.26; size 4; life 34; spinning) plus 5 dust motes
    (random vx ±1.2, vy up to −1.6, gravity 0.06, size 2, life 16). **Any enemy standing on
    the brick is knocked out** (feet within top−6..top+8, center within 3 px of the tile's
    span), with the stomp sound.
  - **Any other solid** → bump sound, nothing else.

## 4. Enemies

Both kinds: gravity as the player, wall contact reverses direction, and while walking on
the ground they also **turn at ledges** (a kicked shell does not). Fall off the bottom →
gone. Contact with the player is checked only when the player is alive, hasn't won, and
the enemy's grace timer is 0.

**Stomp test** (applies to all): player falling (vy > 0.5) and player's feet within 10 px
of the enemy's top. Every stomp bounces the player at vy **−4.4**.

| | Walker ("goomba") | Turtle |
|---|---|---|
| Hitbox | 12 × 13, spawned at tile +2,+2 | 12 × 15, spawned at tile +2,0 |
| Default speed | 0.55 | 0.50 |
| Stomped | squashes flat (distinct sprite), gone after 22 frames | tucks into **shell** |
| Side contact | player dies | player dies (while walking or sliding) |

**Shell states:** stomping a walking turtle makes a resting shell — size 14 × 12 (shifted
−1 x, +3 y), 14 grace frames, speed 0. Touching **or** stomping a resting shell **kicks**
it away from the player: speed ±3.4, 8 grace frames, stomp sound, green puff (a stomp-kick
also bounces the player). A **sliding** shell bounces off walls (bump sound each time),
ignores ledges, and **knocks out every other enemy it touches** (stomp sound). Stomping a
sliding shell stops it back to a resting shell (12 grace frames, player bounces).

**Knock-out** (shell hit or brick broken underfoot): the enemy flips upside down, launches
at vy −4.2, vx ±1.1 away from the cause, tumbles under 0.8× gravity, ignoring all
collision, for 48 frames or until off-screen. Color puff matches the enemy (brown walker,
green turtle).

## 5. Camera & screen

- Camera target: player center minus half the viewport, clamped to the level. Eased 15%
  of the remaining distance per frame, accumulated as a float (never re-read from the
  quantized scroll position — that causes visible stutter).
- Scale: fit 19 tiles of level height to the viewport, but never fewer than 20 tiles
  visible across. Pixelated (no smoothing) everywhere.
- Static tiles render at logical resolution and scale as one image; moving things draw at
  sub-pixel positions on top (rounding their positions causes jitter — deliberate).
- Sky: vertical gradient #6fb9ff → #b8e6ff.

## 6. Scenery rendering

Three passes back-to-front: **far** (cloud, hill) → **near** (tree, bush, grass, fence) →
gameplay tiles. Opacity: cloud 0.55, hill 0.45, tree 0.8, others 1.

Multi-tile props anchor on their painted tile: cloud 48×32 px (3×2 tiles) at offset
(−1, −1) — bottom-center; hill 64×48 (4×3) at (−1.5, −2) — base-center; tree 48×64 (3×4)
at (−1, −3) — trunk base.

## 7. Animation

- **Ninja frames:** idle · walk ×4 · jump (rising) · fall (descending). Walk frame =
  ⌊run/3.2⌋ mod 4, where `run` accumulates \|vx\| each frame while \|vx\| > 0.2, else
  resets. Horizontal flip when facing left.
- **Squash & stretch** (drawn about the bottom-center anchor, feet planted):
  - Hard landing (touched down with vy > 2.6): 9-frame timer t=frames/9 easing out,
    scale sy = 1−0.30t, sx = 1+0.26t.
  - Airborne: v = min(1, \|vy\|/6), sy = 1+0.18v, sx = 1−0.13v.
  - Sprinting on ground: sx 1.06, sy 0.97 (forward lean).
- **Enemies:** walking bob — drawn 1 px shorter/lower on alternating 8-frame steps.
  Sliding shell wobbles: width scaled by \|cos(step·0.45)\|, floor 45%. Tumbling enemies
  drawn flipped vertically.
- **Particles:** drag ×0.98/frame; fade in the last 40% of life. Coin sparkle: 7 particles
  radially at ~1.5 px/frame with −0.6 upward bias, gravity 0.03, life 20, alternating
  #fff8c9 / #f6c521. Puff: 6 particles, gravity 0.12, size 3, life 22.
  - **Where each comes from.** Sparkle: a coin taken, and a spent pop-coin on its last
    frame. Puff, thrown from the enemy's feet: a walker squashed (#c9b39a), a turtle
    tucking and a shell kicked (#8be3a0) — but *not* a sliding shell stomped back to
    rest. A **knock-out** puffs too, in its own darker colours (walker #a0522d, turtle
    #2e9e4f), which is what §4's "colour puff matches the enemy" means. Brick dust,
    with the shards: 5 particles, vx ±1.2, vy up to 1.6 up, gravity 0.06, size 2,
    life 16, #d8b39c.
  - **The pop-coin fades too**, over its last 10 frames rather than by share.
  - **Not built, and named here so it is not lost:** the reference also draws a growing
    cross-shaped flash over the pop-coin in its last 14 frames. It is one shape drawn
    in code rather than a particle, and nothing in this remake draws shapes.

## 8. Sound (all synthesized, no audio files)

Oscillator + gain envelope per note; frequency ramps exponential; gain decays to silence
over the duration. `tone(from Hz, to Hz, seconds, wave, volume, delay)`:

| Effect | Recipe |
|---|---|
| jump | square 200→640, 0.16 s, vol 0.10 |
| coin | square 988, 0.07 s, 0.10; then square 1319, 0.22 s, 0.10 at +0.07 s |
| bump | square 130→60, 0.09 s, 0.16 |
| break | saw 320→55, 0.14 s, 0.14 + square 700→120, 0.08 s, 0.08 |
| stomp | square 420→80, 0.11 s, 0.15 |
| hurt | saw 520→85, 0.38 s, 0.12 |
| win | squares 523, 659, 784, 1047 — 0.15 s each, 0.10 vol, 0.12 s apart |

M toggles mute; unmuting plays the coin sound as confirmation.

## 9. Screen UI (the new kernel ground)

- **Coin counter** — top-right, always visible during play: the coin sprite plus a count,
  gold-on-dark card. Updates the instant a coin is taken.
- **Banner** — centered overlay. Death: "OUCH!" + "respawning...", auto-hides after
  0.7 s. Win: "LEVEL CLEAR!" + coin total + "press R to play again", persists.
- **Controls hint** — bottom-left card listing move/jump/sprint/restart/mute; fades after
  9 s or on the first input, whichever comes first; not shown on narrow screens.
- **Touch controls** — when the pointer is coarse: ◀ ▶ on the left, sprint/jump on the
  right, acting exactly as the keys.

## 10. Art inventory

The reference embeds a 256×128 sprite sheet (PNG) that overrides its procedural art.
Gameplay tiles sit on a 16 px grid in the top rows; big props in the lower region (cloud
48×32 at (0,64), tree 48×64 at (48,64), hill 64×48 at (96,64)).

From the sheet: ground_top, ground_fill, brick, quest, used, coin, pipe_top, pipe_body,
spike, flag_pole, flag_top, walker, walker_squashed, turtle, shell, bush, grass, fence,
spawn icon, cloud, tree, hill.

**Not in the sheet** (procedural only, must be rendered out once): the ninja's 7 frames
(idle, walk0–3, jump, fall — 12×16 each). The reference's eraser icon is editor chrome,
not game art; skip it.

## 11. Verification checklist

Run the reference beside the remake and check:

- [ ] Level reads identically tile-for-tile; scenery depth, fade and anchoring match
- [ ] Walk, sprint, jump, sprint-jump distances and heights match (measure against tiles)
- [ ] Jump cut, coyote jump, and stomp bounce behave identically
- [ ] Coins: pickup radius, counter, sparkle; ?-block pays and dies; brick shatters and
      knocks riders
- [ ] Walker speeds differ per placement as authored (0.6 fast, 0.35 slow turtle)
- [ ] Full turtle chain: stomp → shell → kick → slide kills others → stomp stops it
- [ ] Spikes, pits and enemy side-contact kill; coins survive death; R resets everything
- [ ] Flag wins with frozen player, fanfare and banner
- [ ] Camera ease, squash & stretch, particles, and all 7 sounds match by ear/eye
      (sounds, M-mute and all three particle kinds built 2026-08-15; the pop-coin's
      cross flash is deliberately not built — see §7)
- [ ] HUD, banner, hint fade, touch controls, M mute all present
