import type { Entity, System } from 'kernel-2d/runtime'

import { turtleOf, walkerOf, wear, type TextureRef } from '../components/roles'
import { moveX, moveY, overlaps, solidAt, solidGrid, type Hitbox } from './tiles'
import {
  FALL_SPEED_CAP,
  GRAVITY,
  KNOCKOUT_DRIFT,
  KNOCKOUT_FRAMES,
  KNOCKOUT_GRAVITY_FACTOR,
  KNOCKOUT_RISE,
  PIT_DEPTH,
  RIDER_ABOVE,
  RIDER_BELOW,
  RIDER_REACH,
  SHELL_HEIGHT,
  SHELL_SHIFT_X,
  SHELL_WIDTH,
  SQUASH_FRAMES,
  TILE,
  TURTLE_HEIGHT,
  TURTLE_WIDTH,
  WALKER_HEIGHT,
  WALKER_WIDTH,
} from './tuning'

/**
 * Enemies: the walker's patrol, the turtle's whole shell chain, and the
 * knock-out tumble they share.
 *
 * Both kinds fall under the player's gravity, reverse on walls, and — while
 * walking — turn at ledges; a kicked shell does not. Contact with the player
 * is `clash.ts`'s business; this file owns what an enemy does on its own and
 * to other enemies (a sliding shell knocks out everything it touches).
 *
 * Modes, and the doc's chain through them:
 * `walk` → (stomp) → walker: `squashed`, gone after 22 frames;
 *                    turtle: `shell` (resting) → (touch or stomp) → `sliding`
 *                    → (stomp) → `shell` again. A shell hit or a brick broken
 * underfoot puts any of them in `tumble`: upside down, off the world, gone.
 */

export type EnemyMode = 'walk' | 'squashed' | 'shell' | 'sliding' | 'tumble'

export interface EnemyState {
  kind: 'walker' | 'turtle'
  mode: EnemyMode
  /** Hitbox centre x and feet y, scene units. */
  x: number
  y: number
  width: number
  height: number
  /** Signed, units per second. The walk's direction lives in its sign. */
  vx: number
  vy: number
  grounded: boolean
  /** No player contact while this runs down, in reference frames. */
  graceFrames: number
  /** Squash and tumble share one countdown; walk and shell leave it at 0. */
  timerFrames: number
  /** Reference frames spent walking, for the bob. */
  walkFrames: number
  /** Reference frames spent sliding, for the wobble. */
  slideFrames: number
  stateTexture: TextureRef | null
}

const states = new WeakMap<Entity, EnemyState>()

/** The run state of an enemy entity, or null for anything else. */
export function enemyOf(entity: Entity): EnemyState | null {
  return states.get(entity) ?? null
}

export function enemyHitbox(state: EnemyState): Hitbox {
  return { x: state.x, y: state.y, width: state.width, height: state.height }
}

/** Every enemy standing in the level this step, state attached (making it on first sight). */
function enemiesIn(entities: readonly Entity[]): { entity: Entity; state: EnemyState }[] {
  const found: { entity: Entity; state: EnemyState }[] = []
  for (const entity of entities) {
    let state = states.get(entity)
    if (state === undefined) {
      const walker = walkerOf(entity)
      const turtle = walker === null ? turtleOf(entity) : null
      if (walker === null && turtle === null) continue
      const speed = (walker ?? turtle)?.unitsPerSecond ?? 0
      state = {
        kind: walker !== null ? 'walker' : 'turtle',
        mode: 'walk',
        x: entity.transform.x,
        // The reference spawns both kinds with their feet one pixel above the
        // tile's bottom edge; gravity settles them the rest of the way.
        y: entity.transform.y - TILE / 2 + 1,
        width: walker !== null ? WALKER_WIDTH : TURTLE_WIDTH,
        height: walker !== null ? WALKER_HEIGHT : TURTLE_HEIGHT,
        // Leftward first, as the reference walks them out.
        vx: -speed,
        vy: 0,
        grounded: false,
        graceFrames: 0,
        timerFrames: 0,
        walkFrames: 0,
        slideFrames: 0,
        stateTexture: (walker ?? turtle)?.stateTexture ?? null,
      }
      states.set(entity, state)
    }
    found.push({ entity, state })
  }
  return found
}

export const enemiesSystem: System = {
  id: 'enemies',

  step: (entities, dtSeconds) => {
    const grid = solidGrid(entities)
    const frames = dtSeconds * 60
    const standing = enemiesIn(entities)

    for (const { entity, state } of standing) {
      state.graceFrames = Math.max(0, state.graceFrames - frames)

      if (state.mode === 'squashed') {
        state.timerFrames -= frames
        if (state.timerFrames <= 0) remove(entities, entity)
        continue
      }

      if (state.mode === 'tumble') {
        state.timerFrames -= frames
        state.vy -= GRAVITY * KNOCKOUT_GRAVITY_FACTOR * dtSeconds
        state.x += state.vx * dtSeconds
        state.y += state.vy * dtSeconds
        writeTransform(entity, state)
        if (state.timerFrames <= 0 || state.y + state.height < -PIT_DEPTH) remove(entities, entity)
        continue
      }

      // walk, shell and sliding all stand on the world.
      state.vy = Math.max(state.vy - GRAVITY * dtSeconds, -FALL_SPEED_CAP)

      const across = moveX(grid, enemyHitbox(state), state.vx * dtSeconds)
      state.x = across.x
      // A wall reverses the walk and bounces the sliding shell alike.
      if (across.wall !== 0) state.vx = -state.vx

      const fell = moveY(grid, enemyHitbox(state), state.vy * dtSeconds)
      state.y = fell.y
      state.grounded = fell.floor
      if (fell.floor || fell.ceiling.length > 0) state.vy = 0

      // Walking turns at ledges; a kicked shell keeps going. The probe is the
      // leading bottom corner, one pixel out and one down.
      if (state.mode === 'walk' && state.grounded && state.vx !== 0) {
        const ahead = state.x + Math.sign(state.vx) * (state.width / 2 + 1)
        if (!solidAt(grid, ahead, state.y - 1)) state.vx = -state.vx
      }

      if (state.mode === 'walk' && Math.abs(state.vx) > 0) state.walkFrames += frames
      if (state.mode === 'sliding') {
        state.slideFrames += frames
        knockOthers(standing, state)
      }

      // Fallen out of the level: gone, exactly as the reference loses them.
      if (state.y + state.height < -PIT_DEPTH) {
        remove(entities, entity)
        continue
      }

      writeTransform(entity, state)
    }
  },
}

/** A sliding shell knocks out every other enemy it touches. */
function knockOthers(standing: readonly { entity: Entity; state: EnemyState }[], shell: EnemyState): void {
  for (const other of standing) {
    if (other.state === shell) continue
    if (other.state.mode === 'tumble') continue
    if (!overlaps(enemyHitbox(shell), enemyHitbox(other.state))) continue
    knockOut(other.entity, other.state, shell.x)
  }
}

/** The knock-out: flipped, launched away from the cause, done with collision. */
export function knockOut(entity: Entity, state: EnemyState, causeX: number): void {
  state.mode = 'tumble'
  state.timerFrames = KNOCKOUT_FRAMES
  state.vy = KNOCKOUT_RISE
  state.vx = state.x < causeX ? -KNOCKOUT_DRIFT : KNOCKOUT_DRIFT
  writeTransform(entity, state)
}

/**
 * A brick broke underfoot: any enemy standing on it is knocked out. The doc's
 * window — feet within top−6..top+8 of the brick's top, centre within 3 px of
 * the tile's span — spelled in scene signs.
 */
export function knockOutRiders(entities: Entity[], brick: Entity): void {
  const top = brick.transform.y + TILE / 2
  const left = brick.transform.x - TILE / 2
  const right = brick.transform.x + TILE / 2
  for (const entity of entities) {
    const state = states.get(entity)
    if (state === undefined || state.mode === 'tumble') continue
    if (state.y < top - RIDER_BELOW || state.y > top + RIDER_ABOVE) continue
    if (state.x < left - RIDER_REACH || state.x > right + RIDER_REACH) continue
    knockOut(entity, state, brick.transform.x)
  }
}

/** A stomped walker squashes flat where it stands. */
export function squash(entity: Entity, state: EnemyState): void {
  state.mode = 'squashed'
  state.timerFrames = SQUASH_FRAMES
  state.vx = 0
  if (state.stateTexture !== null) wear(entity, state.stateTexture)
}

/** A stomped walking turtle tucks into a resting shell. */
export function tuck(entity: Entity, state: EnemyState, graceFrames: number): void {
  state.mode = 'shell'
  state.vx = 0
  state.x += SHELL_SHIFT_X
  state.width = SHELL_WIDTH
  state.height = SHELL_HEIGHT
  state.graceFrames = graceFrames
  if (state.stateTexture !== null) wear(entity, state.stateTexture)
}

/** A kicked shell slides away from whoever kicked it. */
export function kick(state: EnemyState, fromX: number, speed: number, graceFrames: number): void {
  state.mode = 'sliding'
  state.vx = state.x >= fromX ? speed : -speed
  state.graceFrames = graceFrames
  state.slideFrames = 0
}

/** A stomped sliding shell stops back to rest. */
export function rest(state: EnemyState, graceFrames: number): void {
  state.mode = 'shell'
  state.vx = 0
  state.graceFrames = graceFrames
}

function remove(entities: Entity[], entity: Entity): void {
  const at = entities.indexOf(entity)
  if (at !== -1) entities.splice(at, 1)
}

/**
 * Where the 16-px sprite goes for this hitbox: centred on it, bottom edge one
 * pixel below the feet — the reference's tile art hangs a pixel over. The pose
 * system layers the bob and the wobble on top.
 */
function writeTransform(entity: Entity, state: EnemyState): void {
  entity.transform.x = state.x
  entity.transform.y = state.y - 1 + TILE / 2
}
