import { describe, expect, it } from 'vitest'

import { enemyOf } from '../src/systems/enemies'
import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import {
  DUST_COUNT,
  PARTICLE_FADE_SHARE,
  PUFF_COUNT,
  SPARKLE_COUNT,
  SPARKLE_LIFE_FRAMES,
  SPARKLE_SPEED,
} from '../src/systems/tuning'
import { brick, coin, floor, playing, questBlock, spawn, turtle, walker, type Playing } from './level'

/**
 * The particles of `docs/REMAKE-PARITY.md` §7: the coin's sparkle, the puff
 * under a stomped enemy, and the dust a brick throws with its shards.
 *
 * They are thrown at random angles, exactly as the reference throws them, so
 * nothing here asserts where one went — only how many there are, what they
 * wear, how long they last, and that they fade rather than vanishing. Where
 * one lands is the one thing about a particle that is meant to be different
 * every time.
 */

function ninja(level: Playing): NinjaState {
  const marker = playerIn(level.entities)
  const state = marker === null ? null : ninjaOf(marker)
  if (state === null) throw new Error('no ninja stood up')
  return state
}

/** Steps until the predicate holds, failing loudly if it never does. */
function until(level: Playing, what: string, holds: () => boolean, most = 300, held: readonly string[] = []): void {
  for (let at = 0; at < most; at += 1) {
    if (holds()) return
    level.step(1, held)
  }
  if (!holds()) throw new Error(`never happened: ${what}`)
}

const idOf = (holder: { id: string }): string => holder.id

/** Every effect entity in the level wearing this texture. */
function wearing(level: Playing, path: string): readonly { id: string; components: Record<string, unknown> }[] {
  return level.entities.filter((one) => {
    if (!one.id.startsWith('fx#')) return false
    const sprite = one.components['sprite'] as { texture?: { path?: string } } | undefined
    return sprite?.texture?.path === path
  })
}

const opacityOf = (holder: { components: Record<string, unknown> }): number | undefined =>
  (holder.components['sprite'] as { opacity?: number }).opacity

const RIGHT = ['ArrowRight']
const JUMP = ['Space']

describe('the coin sparkle', () => {
  it('throws seven, in both of the coin’s colours, where the coin was', () => {
    const level = playing([...floor(0, 9), coin(4, 1), spawn(2, 1)])
    level.step(10)
    const at = level.entities.find((one) => one.name === 'Coin')?.transform.x ?? 0

    until(level, 'the coin', () => ninja(level).coins === 1, 300, RIGHT)

    const cream = wearing(level, 'fx/sparkle-cream.png')
    const gold = wearing(level, 'fx/sparkle-gold.png')
    expect(cream.length + gold.length).toBe(SPARKLE_COUNT)
    // Alternating, so neither colour is the whole of it.
    expect(cream.length).toBeGreaterThan(0)
    expect(gold.length).toBeGreaterThan(0)

    // Thrown from the coin rather than from the ninja: one frame after the
    // pickup none of them can be further off than one frame of its own speed.
    const sparkles = [...cream, ...gold] as unknown as { transform: { x: number } }[]
    for (const one of sparkles) expect(Math.abs(one.transform.x - at)).toBeLessThan(SPARKLE_SPEED / 60)
  })

  it('fades over its last 40% and is gone on time', () => {
    const level = playing([...floor(0, 9), coin(4, 1), spawn(2, 1)])
    level.step(10)
    until(level, 'the coin', () => ninja(level).coins === 1, 300, RIGHT)

    const solidFor = Math.floor(SPARKLE_LIFE_FRAMES * (1 - PARTICLE_FADE_SHARE))
    // Still at full strength most of the way through: nothing has said
    // anything about opacity yet, which is how "solid" is spelled.
    level.step(solidFor - 2)
    for (const one of wearing(level, 'fx/sparkle-gold.png')) expect(opacityOf(one)).toBeUndefined()

    // Into the fade, and going down.
    level.step(3)
    const fading = wearing(level, 'fx/sparkle-gold.png').map(opacityOf)
    expect(fading.length).toBeGreaterThan(0)
    for (const value of fading) expect(value).toBeLessThan(1)

    level.step(4)
    const fainter = wearing(level, 'fx/sparkle-gold.png').map(opacityOf)
    for (const value of fainter) expect(value).toBeLessThan(fading[0] ?? 1)

    // And gone within its life, without anything having to remove it.
    level.step(SPARKLE_LIFE_FRAMES)
    expect(wearing(level, 'fx/sparkle-gold.png')).toHaveLength(0)
    expect(wearing(level, 'fx/sparkle-cream.png')).toHaveLength(0)
  })

  it('leaves a spent pop-coin’s sparkle behind when it drops back into the block', () => {
    const level = playing([...floor(0, 9), questBlock(2, 3), coin(8, 1), spawn(2, 1)])
    level.step(10)
    level.step(30, JUMP)
    // The pop-coin is flying and nothing has sparkled yet.
    expect(wearing(level, 'fx/sparkle-gold.png')).toHaveLength(0)

    until(level, 'the pop-coin to finish', () => wearing(level, 'fx/sparkle-gold.png').length > 0, 60)
    const cream = wearing(level, 'fx/sparkle-cream.png').length
    const gold = wearing(level, 'fx/sparkle-gold.png').length
    expect(cream + gold).toBe(SPARKLE_COUNT)
  })

  it('throws nothing at all for a coin carrying no sparkle art', () => {
    const bare = coin(4, 1)
    bare.components['coin'] = {}
    const level = playing([...floor(0, 9), bare, spawn(2, 1)])
    level.step(10)
    until(level, 'the coin', () => ninja(level).coins === 1, 300, RIGHT)
    expect(level.entities.filter((one) => one.id.startsWith('fx#'))).toHaveLength(0)
  })
})

describe('the puff', () => {
  it('goes up under a squashed walker, in the walker’s own colour', () => {
    const level = playing([...floor(0, 9), walker(2, 1, 0.001), spawn(2, 5)])
    level.step(1)
    until(level, 'the stomp', () => enemyOf(level.entities.find((one) => one.name === 'Walker') as never)?.mode === 'squashed')

    expect(wearing(level, 'fx/puff-walker.png')).toHaveLength(PUFF_COUNT)
    expect(wearing(level, 'fx/puff-turtle.png')).toHaveLength(0)
  })

  it('goes up when a turtle tucks, and again when its shell is kicked', () => {
    const level = playing([...floor(0, 9), turtle(2, 1, 0.001), spawn(2, 5)])
    level.step(1)
    const shell = () => enemyOf(level.entities.find((one) => one.name === 'Turtle') as never)
    until(level, 'the tuck', () => shell()?.mode === 'shell')
    const fromTuck = new Set(wearing(level, 'fx/puff-turtle.png').map(idOf))
    expect(fromTuck.size).toBe(PUFF_COUNT)

    // The ninja bounced off the tuck and comes straight back down onto the
    // shell, which kicks it. Counted by id rather than by how many are in the
    // air, because the tuck's own puff has not finished dying yet.
    until(level, 'the kick', () => shell()?.mode === 'sliding', 60)
    const fresh = wearing(level, 'fx/puff-turtle.png').filter((one) => !fromTuck.has(idOf(one)))
    expect(fresh).toHaveLength(PUFF_COUNT)
  })
})

describe('the knock-out puff', () => {
  it('is the enemy’s darker colour, not the colour a stomp throws', () => {
    // A walker standing on a brick the ninja breaks from underneath.
    const level = playing([...floor(0, 9), brick(2, 3), walker(2, 4, 0.001), spawn(2, 1)])
    level.step(10)
    until(level, 'the brick to break', () => !level.entities.some((one) => one.name === 'Brick'), 40, JUMP)

    expect(wearing(level, 'fx/puff-knock-walker.png')).toHaveLength(PUFF_COUNT)
    // Nothing was stomped, so the stomp's lighter colour never appears.
    expect(wearing(level, 'fx/puff-walker.png')).toHaveLength(0)
  })
})

describe('the brick’s dust', () => {
  it('goes up with the shards, and is gone before they are', () => {
    const level = playing([...floor(0, 9), brick(2, 3), spawn(2, 1)])
    level.step(10)
    // Asserted the moment it breaks: the dust lives 16 frames, so a test that
    // stepped on for a while would be asking whether it had already gone.
    until(level, 'the brick to break', () => !level.entities.some((one) => one.name === 'Brick'), 40, JUMP)

    expect(wearing(level, 'fx/dust-brick.png')).toHaveLength(DUST_COUNT)
    // The four shards are the brick's own picture, thrown at the same moment.
    expect(wearing(level, 'brick.png')).toHaveLength(4)

    level.step(20)
    expect(wearing(level, 'fx/dust-brick.png')).toHaveLength(0)
    expect(wearing(level, 'brick.png').length).toBeGreaterThan(0)
  })
})
