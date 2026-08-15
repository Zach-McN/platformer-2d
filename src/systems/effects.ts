import type { Entity, System } from 'kernel-2d/runtime'

import { fade, flashOf, sparkleOf, wear, type Sparkle, type TextureRef } from '../components/roles'
import {
  COIN_FLASH_FRAMES,
  DUST_COUNT,
  DUST_GRAVITY,
  DUST_LIFE_FRAMES,
  DUST_RISE,
  DUST_SPREAD,
  EFFECT_GRAVITY,
  EFFECT_LIFE_FRAMES,
  PARTICLE_DRAG_PER_FRAME,
  PARTICLE_FADE_SHARE,
  POP_COIN_FADE_FRAMES,
  POP_COIN_SPEED,
  POP_COIN_SPIN,
  POP_COIN_START_ABOVE,
  PUFF_ABOVE_FEET,
  PUFF_COUNT,
  PUFF_GRAVITY,
  PUFF_LIFE_FRAMES,
  PUFF_RISE,
  PUFF_RISE_LEAST,
  PUFF_SPREAD,
  SHARD_SCALE,
  SHARD_SPIN_DEGREES,
  SHARD_THROWS,
  SPARKLE_COUNT,
  SPARKLE_GRAVITY,
  SPARKLE_LIFE_FRAMES,
  SPARKLE_RISE,
  SPARKLE_SPEED,
  SPARKLE_SPREAD,
  TILE,
} from './tuning'

/**
 * Everything the game throws and then forgets: the pop-coin out of a ?-block
 * and the cross that swells over it as it dies, a broken brick's shards, and
 * the three kinds of particle — the coin's sparkle, the puff under a stomped
 * enemy, the dust off a shattered brick.
 *
 * All of them are the same thing wearing different art: a short-lived entity
 * spawned into the running copy with an `fx` component holding its ballistics,
 * flown by this system and taken out when its frames run out. Run-only, in no
 * schema, gone at Stop like everything else in the copy. The textures they
 * wear are textures the level already carries — the coin's own picture, the
 * brick's, and the particle colours each prefab carries for exactly this
 * (game-content T4) — so the renderer has them loaded before anything is
 * spawned mid-run.
 *
 * **They fade rather than vanishing**, which is what the kernel's sprite
 * opacity is for (`editor-kernel` D34): the doc's rule is one linear fade over
 * the last stretch of a life, and both the particles' "last 40%" and the
 * pop-coin's "last 10 frames" are that one rule with a different number, so
 * `fadeFrames` is what an `fx` carries.
 *
 * **The scatter is random, as the reference's is.** Sparkle spokes are jittered
 * and puffs are thrown at random angles, so no two look alike — which means a
 * test asserts how many particles there are and how they die, never where one
 * of them went.
 */

interface FxState {
  vx: number
  vy: number
  /** Downward, units per second squared. */
  gravity: number
  /** Multiplied into `vx` once per reference frame. 1 for the things that do not drag. */
  drag: number
  /** How long this lives, in reference frames. */
  lifeFrames: number
  /** How many of its last frames it spends fading out. */
  fadeFrames: number
  ageFrames: number
  look: 'coin' | 'shard' | 'particle' | 'flash'
  /** Set on a pop-coin once its cross has been thrown, so it is thrown once. */
  flashed?: boolean
}

let minted = 0

function spawn(
  entities: Entity[],
  x: number,
  y: number,
  look: TextureRef,
  fx: Omit<FxState, 'ageFrames'>,
  scale: number,
): void {
  minted += 1
  const entity: Entity = {
    id: `fx#${minted}`,
    name: 'Debris',
    transform: { x, y, rotation: 0, scaleX: scale, scaleY: scale },
    components: {},
  }
  wear(entity, look)
  entity.components['fx'] = { ...fx, ageFrames: 0 }
  entities.push(entity)
}

/** The coin that pops out of a paid ?-block, drawn spinning about its centre. */
export function spawnPopCoin(entities: Entity[], block: Entity, look: TextureRef | null): void {
  if (look === null) return
  const top = block.transform.y + TILE / 2
  spawn(
    entities,
    block.transform.x,
    top + POP_COIN_START_ABOVE + TILE / 2,
    look,
    {
      vx: 0,
      vy: POP_COIN_SPEED,
      gravity: EFFECT_GRAVITY,
      drag: 1,
      lifeFrames: EFFECT_LIFE_FRAMES,
      fadeFrames: POP_COIN_FADE_FRAMES,
      look: 'coin',
    },
    1,
  )
}

/** Four pieces of the brick itself, thrown the doc's four ways. */
export function spawnShards(entities: Entity[], brick: Entity, look: TextureRef | null): void {
  if (look === null) return
  for (const throwAt of SHARD_THROWS) {
    spawn(
      entities,
      brick.transform.x,
      brick.transform.y,
      look,
      {
        vx: throwAt.x,
        vy: throwAt.y,
        gravity: EFFECT_GRAVITY,
        drag: PARTICLE_DRAG_PER_FRAME,
        lifeFrames: EFFECT_LIFE_FRAMES,
        fadeFrames: EFFECT_LIFE_FRAMES * PARTICLE_FADE_SHARE,
        look: 'shard',
      },
      SHARD_SCALE,
    )
  }
}

/**
 * The seven-spoke sparkle a coin leaves behind, alternating its two colours.
 *
 * Thrown from an even seven-spoke wheel, each spoke jittered, and the whole
 * thing biased upward — which is what makes it read as a puff of light rather
 * than as a ring.
 */
export function spawnSparkle(entities: Entity[], x: number, y: number, art: Sparkle | null): void {
  if (art === null) return
  for (let at = 0; at < SPARKLE_COUNT; at += 1) {
    const angle = (Math.PI * 2 * at) / SPARKLE_COUNT + Math.random() * SPARKLE_SPREAD
    spawn(
      entities,
      x,
      y,
      at % 2 === 0 ? art.gold : art.cream,
      {
        vx: Math.cos(angle) * SPARKLE_SPEED,
        // The doc's bias is upward, and up is positive here, so the reference's
        // "minus 0.6" is a plus — the one sign that flips in this whole file.
        vy: -Math.sin(angle) * SPARKLE_SPEED + SPARKLE_RISE,
        gravity: SPARKLE_GRAVITY,
        drag: PARTICLE_DRAG_PER_FRAME,
        lifeFrames: SPARKLE_LIFE_FRAMES,
        fadeFrames: SPARKLE_LIFE_FRAMES * PARTICLE_FADE_SHARE,
        look: 'particle',
      },
      1,
    )
  }
}

/** The puff under a stomped walker, a tucking turtle or a kicked shell. */
export function spawnPuff(entities: Entity[], x: number, feetY: number, art: TextureRef | null): void {
  if (art === null) return
  for (let at = 0; at < PUFF_COUNT; at += 1) {
    spawn(
      entities,
      x,
      feetY + PUFF_ABOVE_FEET,
      art,
      {
        vx: (Math.random() - 0.5) * PUFF_SPREAD,
        vy: Math.random() * PUFF_RISE + PUFF_RISE_LEAST,
        gravity: PUFF_GRAVITY,
        drag: PARTICLE_DRAG_PER_FRAME,
        lifeFrames: PUFF_LIFE_FRAMES,
        fadeFrames: PUFF_LIFE_FRAMES * PARTICLE_FADE_SHARE,
        look: 'particle',
      },
      1,
    )
  }
}

/**
 * The cross that swells over a pop-coin as it dies.
 *
 * **It is thrown as its own entity, and it keeps up with the coin by being
 * thrown exactly like one** — same position, same velocity, same gravity, so
 * the two are integrated identically and stay together without either knowing
 * about the other. A link between two entities would be a thing this game has
 * never needed, and this is the frame in which it did not start needing one.
 */
function spawnFlash(entities: Entity[], popCoin: Entity, fx: FxState, art: TextureRef | null): void {
  if (art === null) return
  spawn(
    entities,
    popCoin.transform.x,
    popCoin.transform.y,
    art,
    {
      vx: fx.vx,
      vy: fx.vy,
      gravity: fx.gravity,
      drag: fx.drag,
      lifeFrames: COIN_FLASH_FRAMES,
      // Dies with the coin and fades with it, which is the reference drawing
      // both through one `globalAlpha`.
      fadeFrames: POP_COIN_FADE_FRAMES,
      look: 'flash',
    },
    // Starts at nothing and is grown by the step below.
    0,
  )
}

/** The dust a brick throws along with its shards — smaller, slower, gone sooner. */
export function spawnDust(entities: Entity[], brick: Entity, art: TextureRef | null): void {
  if (art === null) return
  for (let at = 0; at < DUST_COUNT; at += 1) {
    spawn(
      entities,
      brick.transform.x,
      brick.transform.y,
      art,
      {
        vx: (Math.random() - 0.5) * DUST_SPREAD,
        vy: Math.random() * DUST_RISE,
        gravity: DUST_GRAVITY,
        drag: PARTICLE_DRAG_PER_FRAME,
        lifeFrames: DUST_LIFE_FRAMES,
        fadeFrames: DUST_LIFE_FRAMES * PARTICLE_FADE_SHARE,
        look: 'particle',
      },
      1,
    )
  }
}

function fxOf(entity: Entity): FxState | null {
  const component: unknown = entity.components['fx']
  if (typeof component !== 'object' || component === null) return null
  const { vx, vy, gravity, drag, lifeFrames, fadeFrames, ageFrames, look } = component as Record<string, unknown>
  if (typeof vx !== 'number' || typeof vy !== 'number' || typeof ageFrames !== 'number') return null
  if (typeof gravity !== 'number' || typeof drag !== 'number') return null
  if (typeof lifeFrames !== 'number' || lifeFrames <= 0 || typeof fadeFrames !== 'number') return null
  if (look !== 'coin' && look !== 'shard' && look !== 'particle' && look !== 'flash') return null
  const flashed = (component as { flashed?: unknown }).flashed
  return {
    vx,
    vy,
    gravity,
    drag,
    lifeFrames,
    fadeFrames,
    ageFrames,
    look,
    ...(flashed === true ? { flashed: true } : {}),
  }
}

export const effectsSystem: System = {
  id: 'effects',

  step: (entities, dtSeconds) => {
    const frames = dtSeconds * 60

    for (let at = entities.length - 1; at >= 0; at -= 1) {
      const entity = entities[at]
      if (entity === undefined) continue
      const fx = fxOf(entity)
      if (fx === null) continue

      fx.ageFrames += frames
      if (fx.ageFrames >= fx.lifeFrames) {
        // A pop-coin's last act is the sparkle it drops back into the block,
        // exactly as the reference emits one on its final frame.
        if (fx.look === 'coin') sparkleWhereItLanded(entities, entity)
        entities.splice(at, 1)
        continue
      }

      fx.vy -= fx.gravity * dtSeconds
      fx.vx *= Math.pow(fx.drag, frames)
      entity.transform.x += fx.vx * dtSeconds
      entity.transform.y += fx.vy * dtSeconds

      if (fx.look === 'coin') {
        // The reference draws the pop-coin's width as |cos spin| — a coin
        // seen edge-on twice a turn.
        entity.transform.scaleX = Math.abs(Math.cos((fx.ageFrames / 60) * POP_COIN_SPIN))

        // With its last 14 frames to go, the cross starts swelling over it.
        if (fx.flashed !== true && fx.lifeFrames - fx.ageFrames <= COIN_FLASH_FRAMES) {
          fx.flashed = true
          spawnFlash(entities, entity, fx, flashArtIn(entities))
        }
      } else if (fx.look === 'flash') {
        // Grows from nothing to its full span across its whole life, which is
        // the reference's arms lengthening by a fixed step every frame.
        const grown = Math.min(1, fx.ageFrames / fx.lifeFrames)
        entity.transform.scaleX = grown
        entity.transform.scaleY = grown
      } else if (fx.look === 'shard') {
        entity.transform.rotation = (entity.transform.rotation + SHARD_SPIN_DEGREES * dtSeconds) % 360
      }

      // One linear fade over the last `fadeFrames` of the life, and full
      // opacity before that — the doc's rule for particles and the reference's
      // for the pop-coin, which are the same rule.
      const left = fx.lifeFrames - fx.ageFrames
      if (fx.fadeFrames > 0 && left < fx.fadeFrames) fade(entity, Math.max(0, left / fx.fadeFrames))

      entity.components['fx'] = { ...fx }
    }
  },
}

/**
 * The sparkle a spent pop-coin leaves where it fell.
 *
 * The art comes from a coin still standing in the level, the same way the
 * pop-coin's own picture did — so a level whose every coin has been taken
 * loses the sparkle rather than carrying art for it. That is the trade
 * game-content T4 makes everywhere: nothing new ships.
 */
function sparkleWhereItLanded(entities: Entity[], popCoin: Entity): void {
  const coin = entities.find((one) => sparkleOf(one) !== null)
  if (coin === undefined) return
  spawnSparkle(entities, popCoin.transform.x, popCoin.transform.y, sparkleOf(coin))
}

/** The cross art, off any coin still standing — the same trade the sparkle makes. */
function flashArtIn(entities: readonly Entity[]): TextureRef | null {
  const coin = entities.find((one) => flashOf(one) !== null)
  return coin === undefined ? null : flashOf(coin)
}
