/**
 * Every feel number in the game, converted once from `docs/REMAKE-PARITY.md`.
 *
 * The parity doc speaks the reference's units: pixels per frame at 60fps, y
 * down. The kernel's scenes are y-up and its systems take seconds, so every
 * constant here is the doc's number times 60 (speeds) or 3600 (accelerations),
 * with up positive. Each line cites the doc's figure; a session that wants to
 * change one changes the doc first or not at all — the doc is the contract and
 * this file is its translation, never a second opinion.
 *
 * Timers stay in reference *frames* (the doc counts them that way), advanced
 * by `dt * 60` per step — at the fixed step that is exactly one frame, and at
 * any other rate it is the same duration.
 */

/** One tile, and the whole level's grid unit. */
export const TILE = 16

// --- the ninja -------------------------------------------------------------

export const NINJA_WIDTH = 11 // hitbox 11 x 14
export const NINJA_HEIGHT = 14
export const NINJA_SPRITE_HEIGHT = 16 // sprite 12 x 16, bottom 2 px below the hitbox floor
export const NINJA_SPRITE_SINK = 2

export const GRAVITY = 0.32 * 3600 // 0.32 /frame², downward
export const FALL_SPEED_CAP = 7 * 60 // capped at fall speed 7
export const WALK_SPEED = 1.7 * 60 // walk top speed 1.7
export const SPRINT_SPEED = 2.8 * 60 // sprint top speed 2.8
export const ACCELERATION = 0.28 * 3600 // 0.28 toward target speed
export const FRICTION = 0.36 * 3600 // 0.36 when no input
export const JUMP_SPEED = 6.1 * 60 // jump velocity −6.1
export const SPRINT_JUMP_SPEED = 6.7 * 60 // sprint jump −6.7…
export const SPRINT_JUMP_AT = 1.9 * 60 // …used when |vx| > 1.9 at takeoff
export const JUMP_CUT_SPEED = 2.4 * 60 // releasing caps rising speed at −2.4
export const COYOTE_FRAMES = 6 // 6 frames after leaving the ground

export const DEATH_FRAMES = 40 // 40-frame death timer
export const DEATH_BLINK_PERIOD = 6 // hidden 3 of every 6 frames
export const DEATH_BLINK_HIDDEN = 3
export const DEATH_KNOCK_SPEED = 4 * 60 // knocked upward at vy −4 (0 if it was a fall)

/** Falling past `19·16 + 40` px kills: 40 below the level floor, as the hitbox top. */
export const PIT_DEPTH = 40

// --- tile interactions -----------------------------------------------------

export const COIN_RADIUS = 10 // centres within 10 px on both axes
export const SPIKE_INSET_TOP = 6 // lethal zone 6 px off the top of the tile…
export const SPIKE_INSET_SIDE = 2 // …and 2 px off each side

export const POP_COIN_START_ABOVE = 2 // pop-coin starts 2 px above the block top
export const POP_COIN_SPEED = 3.4 * 60 // vy −3.4
export const EFFECT_GRAVITY = 0.26 * 3600 // gravity 0.26 (pop-coin and shards)
export const POP_COIN_SPIN = 0.9 * 60 // spins 0.9 rad/frame
export const EFFECT_LIFE_FRAMES = 34 // lives 34 frames (pop-coin and shards)

/** The four shard throws: (±1.5, −3.2) and (±1.1, −1.9), scene-signed. */
export const SHARD_THROWS: readonly { x: number; y: number }[] = [
  { x: -1.5 * 60, y: 3.2 * 60 },
  { x: 1.5 * 60, y: 3.2 * 60 },
  { x: -1.1 * 60, y: 1.9 * 60 },
  { x: 1.1 * 60, y: 1.9 * 60 },
]
export const SHARD_SCALE = 4 / TILE // size 4, worn as the brick's own picture
/** The doc says shards spin and does not say how fast; this is a guess kept in one place. */
export const SHARD_SPIN_DEGREES = 900

// --- particles (§7) --------------------------------------------------------

/**
 * Every particle loses 2% of its sideways speed per reference frame, and fades
 * over the last 40% of its life. The drag is per *frame*, so a step applies it
 * `dt * 60` times — at the fixed step, exactly once.
 */
export const PARTICLE_DRAG_PER_FRAME = 0.98
export const PARTICLE_FADE_SHARE = 0.4

/** The pop-coin fades over its last 10 frames rather than by share (reference). */
export const POP_COIN_FADE_FRAMES = 10

/**
 * The cross that swells over a spent pop-coin: it appears with 14 frames left
 * and grows the whole time, reaching about a tile across.
 *
 * **An approximation, and §7 says so.** The reference draws two bars in *screen*
 * pixels, so they stay hairline-thin however far the view is zoomed in; a
 * texture scaled by an entity gets thicker as it grows. The size and the timing
 * are the reference's; the thickness is not, and cannot be without the kernel
 * learning to draw shapes.
 */
export const COIN_FLASH_FRAMES = 14

/** Coin sparkle: 7 particles radially at 1.5, with a 0.6 upward bias. */
export const SPARKLE_COUNT = 7
export const SPARKLE_SPEED = 1.5 * 60
export const SPARKLE_RISE = 0.6 * 60
export const SPARKLE_SPREAD = 0.4 // up to 0.4 rad of scatter off the even spokes
export const SPARKLE_GRAVITY = 0.03 * 3600
export const SPARKLE_LIFE_FRAMES = 20

/** Puff: 6 particles, thrown up and out from the feet of whatever made it. */
export const PUFF_COUNT = 6
export const PUFF_SPREAD = 2.2 * 60 // vx over (−1.1, 1.1)
export const PUFF_RISE = 2 * 60 // vy up to 2 upward…
export const PUFF_RISE_LEAST = 0.4 * 60 // …on top of a floor of 0.4
export const PUFF_GRAVITY = 0.12 * 3600
export const PUFF_LIFE_FRAMES = 22
/**
 * How far above the feet a puff appears. The reference emits at the enemy's
 * bottom edge less 4 px (a kick) or 5 (a squash), and draws a 3 px square
 * downward from there — so its centre sits about 3 px above the feet either
 * way, and the difference between the two is a pixel on a three-pixel dot.
 */
export const PUFF_ABOVE_FEET = 3

/** The dust a breaking brick throws with its shards. */
export const DUST_COUNT = 5
export const DUST_SPREAD = 2.4 * 60 // vx over (−1.2, 1.2)
export const DUST_RISE = 1.6 * 60 // vy up to 1.6 upward
export const DUST_GRAVITY = 0.06 * 3600
export const DUST_LIFE_FRAMES = 16

/** A knocked-out rider's feet sit within top−6..top+8 of the broken brick (reference-signed). */
export const RIDER_ABOVE = 6
export const RIDER_BELOW = 8
export const RIDER_REACH = 3 // centre within 3 px of the tile's span

// --- enemies ---------------------------------------------------------------

export const WALKER_WIDTH = 12 // hitbox 12 x 13
export const WALKER_HEIGHT = 13
export const TURTLE_WIDTH = 12 // hitbox 12 x 15
export const TURTLE_HEIGHT = 15
export const SHELL_WIDTH = 14 // shell 14 x 12, shifted −1 x
export const SHELL_HEIGHT = 12
export const SHELL_SHIFT_X = -1

export const STOMP_FALLING = 0.5 * 60 // player falling (vy > 0.5)…
export const STOMP_REACH = 10 // …feet within 10 px of the enemy's top
export const STOMP_BOUNCE = 4.4 * 60 // every stomp bounces the player at vy −4.4

export const SQUASH_FRAMES = 22 // squashed walker gone after 22 frames
export const SHELL_REST_GRACE = 14 // resting shell: 14 grace frames
export const SHELL_KICK_SPEED = 3.4 * 60 // kicked at ±3.4
export const SHELL_KICK_GRACE = 8 // 8 grace frames
export const SHELL_STOP_GRACE = 12 // stomped back to rest: 12 grace frames

export const KNOCKOUT_RISE = 4.2 * 60 // launches at vy −4.2
export const KNOCKOUT_DRIFT = 1.1 * 60 // vx ±1.1 away from the cause
export const KNOCKOUT_GRAVITY_FACTOR = 0.8 // tumbles under 0.8× gravity
export const KNOCKOUT_FRAMES = 48 // for 48 frames or until off-screen

// --- animation -------------------------------------------------------------

export const WALK_ANIM_MOVING = 0.2 * 60 // run accumulates while |vx| > 0.2
export const WALK_ANIM_STRIDE = 3.2 // walk frame = ⌊run/3.2⌋ mod 4, run in reference px
export const LANDING_FRAMES = 9 // hard-landing squash: 9-frame timer
export const LANDING_AT = 2.6 * 60 // triggered by touchdown at vy > 2.6
export const LANDING_SQUASH = 0.3 // sy = 1 − 0.30t
export const LANDING_SPREAD = 0.26 // sx = 1 + 0.26t
export const AIR_STRETCH_FULL = 6 * 60 // v = min(1, |vy|/6)
export const AIR_STRETCH = 0.18 // sy = 1 + 0.18v
export const AIR_NARROW = 0.13 // sx = 1 − 0.13v
export const SPRINT_LEAN_X = 1.06 // sprinting on ground: sx 1.06, sy 0.97
export const SPRINT_LEAN_Y = 0.97
export const BOB_PERIOD_FRAMES = 8 // enemies bob on alternating 8-frame steps
export const WOBBLE_RATE = 0.45 // sliding shell wobbles by |cos(step·0.45)|…
export const WOBBLE_FLOOR = 0.45 // …with a 45% floor

// --- screen ----------------------------------------------------------------

export const HINT_FRAMES = 9 * 60 // controls hint fades after 9 s or on the first input
export const OUCH_BANNER_FRAMES = 0.7 * 60 // death banner auto-hides after 0.7 s

// --- camera ----------------------------------------------------------------

export const CAMERA_EASE = 0.15 // eased 15% of the remaining distance per frame
