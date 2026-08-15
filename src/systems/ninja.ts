import { heldIn, type Entity, type System } from 'kernel-2d/runtime'

import {
  bonusOf,
  isBreakable,
  isCoin,
  isDeadly,
  isGoal,
  playerFramesOf,
  wear,
  worn,
  type TextureRef,
} from '../components/roles'
import { spawnPopCoin, spawnShards } from './effects'
import { knockOutRiders } from './enemies'
import { moveX, moveY, overlaps, solidGrid, type Hitbox } from './tiles'
import {
  ACCELERATION,
  COIN_RADIUS,
  COYOTE_FRAMES,
  DEATH_FRAMES,
  DEATH_KNOCK_SPEED,
  FALL_SPEED_CAP,
  FRICTION,
  GRAVITY,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  LANDING_AT,
  LANDING_FRAMES,
  NINJA_HEIGHT,
  NINJA_SPRITE_HEIGHT,
  NINJA_SPRITE_SINK,
  NINJA_WIDTH,
  PIT_DEPTH,
  SPIKE_INSET_SIDE,
  SPIKE_INSET_TOP,
  SPRINT_JUMP_AT,
  SPRINT_JUMP_SPEED,
  SPRINT_SPEED,
  TILE,
  WALK_ANIM_MOVING,
  WALK_SPEED,
} from './tuning'

/**
 * The ninja: input, movement, jumping, tile collision, and every tile
 * interaction — coins, spikes, pits, head bumps, the flag.
 *
 * The player *is* the spawn marker. The marker carries the `player` component
 * with all seven frames (game-content T4), so on the first step this system
 * takes the marker over: it starts obeying gravity, wearing ninja frames, and
 * standing where the reference spawns — hitbox feet on the marker tile's
 * bottom edge, centre on its centre. Converting the marker rather than
 * spawning a second entity keeps the entity count honest and makes respawn a
 * transform reset rather than a delete-and-recreate.
 *
 * Every number is `tuning.ts`'s, which is the parity doc's. The run-only state
 * lives beside the level, not in it (the tower defense's `march` precedent):
 * keyed weakly on the entity, so a run's bookkeeping dies with the run's copy.
 */

export type Frame = 'idle' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'jump' | 'fall'

export interface NinjaState {
  /** Hitbox centre x and feet y, scene units — the pair every rule is phrased around. */
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  /** Reference frames of forgiveness left after walking off an edge. */
  coyoteFrames: number
  /** Whether jump was held on the previous step — the release detector. */
  jumpWasHeld: boolean
  facing: 1 | -1
  /** Sprint held and moving on the ground, for the pose's forward lean. */
  sprinting: boolean
  /** Reference px of ground covered while moving, for the walk cycle. */
  runDistance: number
  /** Hard-landing squash timer, counting down from LANDING_FRAMES. */
  landingFrames: number
  /** Death timer counting down, or null while alive. */
  dyingFrames: number | null
  won: boolean
  coins: number
  spawnX: number
  spawnY: number
  frames: Record<string, TextureRef>
}

const states = new WeakMap<Entity, NinjaState>()

/** The ninja's run state, for the systems that follow it (clash, pose, chase). */
export function ninjaOf(entity: Entity): NinjaState | null {
  return states.get(entity) ?? null
}

/** The player entity of this level, or null when no spawn marker carries frames. */
export function playerIn(entities: readonly Entity[]): Entity | null {
  return entities.find((one) => playerFramesOf(one) !== null) ?? null
}

export function hitboxOf(state: NinjaState): Hitbox {
  return { x: state.x, y: state.y, width: NINJA_WIDTH, height: NINJA_HEIGHT }
}

/** Kills the ninja: the death timer starts and the knock throws it upward. */
export function killNinja(state: NinjaState, knockedUp: boolean): void {
  if (state.dyingFrames !== null || state.won) return
  state.dyingFrames = DEATH_FRAMES
  state.vx = 0
  state.vy = knockedUp ? DEATH_KNOCK_SPEED : 0
}

const LEFT_CODES = ['ArrowLeft', 'KeyA']
const RIGHT_CODES = ['ArrowRight', 'KeyD']
const JUMP_CODES = ['ArrowUp', 'KeyW', 'Space']
const SPRINT_CODES = ['ShiftLeft', 'ShiftRight']

export const ninjaSystem: System = {
  id: 'ninja',

  step: (entities, dtSeconds) => {
    const marker = playerIn(entities)
    if (marker === null) return
    const frames = dtSeconds * 60

    let state = states.get(marker)
    if (state === undefined) {
      // The reference places the hitbox flush with the spawn tile's bottom
      // edge, centred on its column; the marker stands at the tile's centre.
      state = {
        x: marker.transform.x,
        y: marker.transform.y - TILE / 2,
        vx: 0,
        vy: 0,
        grounded: false,
        coyoteFrames: 0,
        jumpWasHeld: false,
        facing: 1,
        sprinting: false,
        runDistance: 0,
        landingFrames: 0,
        dyingFrames: null,
        won: false,
        coins: 0,
        spawnX: marker.transform.x,
        spawnY: marker.transform.y - TILE / 2,
        frames: playerFramesOf(marker) ?? {},
      }
      states.set(marker, state)
      const idle = state.frames['idle']
      if (idle !== undefined) wear(marker, idle)
    }

    // Dying: the timer runs, the body tumbles free of the world, and then the
    // ninja is back at the spawn. Coins survive; only Stop-and-Play resets them.
    if (state.dyingFrames !== null) {
      state.dyingFrames -= frames
      state.vy = Math.max(state.vy - GRAVITY * dtSeconds, -FALL_SPEED_CAP)
      state.y += state.vy * dtSeconds
      if (state.dyingFrames <= 0) {
        state.dyingFrames = null
        state.x = state.spawnX
        state.y = state.spawnY
        state.vx = 0
        state.vy = 0
        state.grounded = false
        state.coyoteFrames = 0
        state.landingFrames = 0
      }
      writeTransform(marker, state)
      return
    }

    const grid = solidGrid(entities)
    const held = heldIn(entities)
    const has = (codes: readonly string[]): boolean => codes.some((code) => held.includes(code))

    // Frozen at the flag: the reference zeroes vx and stops listening, but the
    // world still holds the ninja up.
    const listening = !state.won
    const direction = !listening ? 0 : (has(RIGHT_CODES) ? 1 : 0) - (has(LEFT_CODES) ? 1 : 0)
    const sprintHeld = listening && has(SPRINT_CODES)

    // Toward the target speed by a fixed acceleration; friction is its own,
    // larger, rate — exactly the reference's two constants.
    const target = direction * (sprintHeld ? SPRINT_SPEED : WALK_SPEED)
    if (direction !== 0) {
      const gap = target - state.vx
      const most = ACCELERATION * dtSeconds
      state.vx += Math.abs(gap) <= most ? gap : Math.sign(gap) * most
    } else {
      const most = FRICTION * dtSeconds
      state.vx -= Math.abs(state.vx) <= most ? state.vx : Math.sign(state.vx) * most
    }
    state.sprinting = sprintHeld && direction !== 0 && state.grounded

    // Coyote time: a fresh allowance while grounded, running out in the air.
    if (state.grounded) state.coyoteFrames = COYOTE_FRAMES
    else state.coyoteFrames = Math.max(0, state.coyoteFrames - frames)

    // The jump is an edge on the held state — the key must be released before
    // it can jump again, which the edge gives for free.
    const jumpHeld = listening && has(JUMP_CODES)
    if (jumpHeld && !state.jumpWasHeld && (state.grounded || state.coyoteFrames > 0)) {
      state.vy = Math.abs(state.vx) > SPRINT_JUMP_AT ? SPRINT_JUMP_SPEED : JUMP_SPEED
      state.grounded = false
      state.coyoteFrames = 0
    }
    // The jump cut: letting go caps whatever rise is left.
    if (!jumpHeld && state.vy > JUMP_CUT_SPEED) state.vy = JUMP_CUT_SPEED
    state.jumpWasHeld = jumpHeld

    state.vy = Math.max(state.vy - GRAVITY * dtSeconds, -FALL_SPEED_CAP)

    // Axis-separated collision, x first — the reference's order.
    const acrossThen = moveX(grid, hitboxOf(state), state.vx * dtSeconds)
    state.x = acrossThen.x
    if (acrossThen.wall !== 0) state.vx = 0

    const landingSpeed = -state.vy
    const upThen = moveY(grid, hitboxOf(state), state.vy * dtSeconds)
    state.y = upThen.y
    state.grounded = upThen.floor
    if (upThen.floor) {
      if (landingSpeed > LANDING_AT) state.landingFrames = LANDING_FRAMES
      state.vy = 0
    }
    if (upThen.ceiling.length > 0) {
      const bumped = upThen.ceiling[0]
      if (bumped !== undefined) bump(entities, bumped, state)
      state.vy = 0
    }

    if (state.facing === 1 && state.vx < 0) state.facing = -1
    if (state.facing === -1 && state.vx > 0) state.facing = 1

    // The walk cycle's odometer, in the reference's own pixels.
    if (Math.abs(state.vx) > WALK_ANIM_MOVING) state.runDistance += Math.abs(state.vx) * dtSeconds
    else state.runDistance = 0
    state.landingFrames = Math.max(0, state.landingFrames - frames)

    interact(entities, state)
    writeTransform(marker, state)
  },
}

/** Coins, spikes, pits and the flag — everything touching a tile can mean. */
function interact(entities: Entity[], state: NinjaState): void {
  const box = hitboxOf(state)

  // Coin pickup: centres within 10 px on both axes, generous on purpose.
  const centreY = state.y + NINJA_HEIGHT / 2
  for (let at = entities.length - 1; at >= 0; at -= 1) {
    const coin = entities[at]
    if (coin === undefined || !isCoin(coin)) continue
    if (Math.abs(state.x - coin.transform.x) > COIN_RADIUS) continue
    if (Math.abs(centreY - coin.transform.y) > COIN_RADIUS) continue
    entities.splice(at, 1)
    state.coins += 1
  }

  for (const entity of entities) {
    if (isDeadly(entity)) {
      // The spike's lethal zone is inset: 6 px off the tile's top, 2 off each side.
      const zone: Hitbox = {
        x: entity.transform.x,
        y: entity.transform.y - TILE / 2,
        width: TILE - 2 * SPIKE_INSET_SIDE,
        height: TILE - SPIKE_INSET_TOP,
      }
      if (overlaps(box, zone)) {
        killNinja(state, true)
        return
      }
    }
    if (isGoal(entity) && !state.won) {
      const flag: Hitbox = {
        x: entity.transform.x,
        y: entity.transform.y - TILE / 2,
        width: TILE,
        height: TILE,
      }
      if (overlaps(box, flag)) {
        state.won = true
        state.vx = 0
      }
    }
  }

  // The pit: falling past 40 px below the level floor kills, with no knock —
  // the body is already falling.
  if (state.y + NINJA_HEIGHT < -PIT_DEPTH) killNinja(state, false)
}

/** A head bump: the ?-block pays, the brick shatters and unseats its riders. */
function bump(entities: Entity[], block: Entity, state: NinjaState): void {
  const bonus = bonusOf(block)
  if (bonus !== null) {
    state.coins += bonus.coins
    if (bonus.used !== null) wear(block, bonus.used)
    // Paid out: from now on it is any other solid.
    delete block.components['bonus']
    const coinLook = entities.find((one) => isCoin(one)) ?? null
    spawnPopCoin(entities, block, coinLook === null ? null : worn(coinLook))
    return
  }

  if (isBreakable(block)) {
    const look = worn(block)
    const at = entities.indexOf(block)
    if (at !== -1) entities.splice(at, 1)
    spawnShards(entities, block, look)
    knockOutRiders(entities, block)
    return
  }
  // Any other solid: just the thud (sound is the parity pass's, not built yet).
}

/**
 * Where the sprite goes for this hitbox: centred, feet 2 px below the hitbox
 * floor so they overlap the grass lip. The pose system rewrites y when squash
 * scales the sprite; this is the unscaled stand.
 */
function writeTransform(marker: Entity, state: NinjaState): void {
  marker.transform.x = state.x
  marker.transform.y = state.y - NINJA_SPRITE_SINK + NINJA_SPRITE_HEIGHT / 2
}
