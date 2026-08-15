import type { Entity, System } from 'kernel-2d/runtime'

import { wear, type TextureRef } from '../components/roles'
import {
  EFFECT_GRAVITY,
  EFFECT_LIFE_FRAMES,
  POP_COIN_SPEED,
  POP_COIN_SPIN,
  POP_COIN_START_ABOVE,
  SHARD_SCALE,
  SHARD_SPIN_DEGREES,
  SHARD_THROWS,
  TILE,
} from './tuning'

/**
 * The bump's debris: the pop-coin out of a ?-block, and a broken brick's four
 * shards. Short-lived entities this game spawns into the running copy and
 * removes itself — run-only, in no schema, gone at Stop like everything else
 * in the copy.
 *
 * Each carries an `fx` component with its ballistics; this system flies them
 * and takes them out when their frames run out. The textures they wear are
 * textures the level already carries (the coin's, the brick's own), so the
 * renderer has them loaded before anything is spawned (game-content T4).
 *
 * The reference's sparkle and dust-mote particles are not here — they need art
 * the level does not carry, and they belong to the parity pass with the sounds.
 */

interface FxState {
  vx: number
  vy: number
  spin: 'coin' | 'shard'
  ageFrames: number
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
    { vx: 0, vy: POP_COIN_SPEED, spin: 'coin' },
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
      { vx: throwAt.x, vy: throwAt.y, spin: 'shard' },
      SHARD_SCALE,
    )
  }
}

function fxOf(entity: Entity): FxState | null {
  const component: unknown = entity.components['fx']
  if (typeof component !== 'object' || component === null) return null
  const { vx, vy, spin, ageFrames } = component as Record<string, unknown>
  if (typeof vx !== 'number' || typeof vy !== 'number' || typeof ageFrames !== 'number') return null
  if (spin !== 'coin' && spin !== 'shard') return null
  return { vx, vy, spin, ageFrames }
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
      if (fx.ageFrames >= EFFECT_LIFE_FRAMES) {
        entities.splice(at, 1)
        continue
      }

      fx.vy -= EFFECT_GRAVITY * dtSeconds
      entity.transform.x += fx.vx * dtSeconds
      entity.transform.y += fx.vy * dtSeconds

      if (fx.spin === 'coin') {
        // The reference draws the pop-coin's width as |cos spin| — a coin
        // seen edge-on twice a turn.
        entity.transform.scaleX = Math.abs(Math.cos((fx.ageFrames / 60) * POP_COIN_SPIN))
      } else {
        entity.transform.rotation = (entity.transform.rotation + SHARD_SPIN_DEGREES * dtSeconds) % 360
      }

      entity.components['fx'] = { ...fx }
    }
  },
}
