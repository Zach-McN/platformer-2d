import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import { floor, coin, brick, questBlock, spike, flag, playing, spawn, walker, type Playing } from './level'

/**
 * Touching the world: coins, head bumps, spikes, pits, death and respawn, and
 * the flag — each held to the doc's numbers where it has one.
 */

const RIGHT = ['ArrowRight']
const JUMP = ['Space']

function ninja(level: Playing): NinjaState {
  const marker = playerIn(level.entities)
  const state = marker === null ? null : ninjaOf(marker)
  if (state === null) throw new Error('no ninja stood up')
  return state
}

describe('coins', () => {
  it('collects a coin the moment the centres are within ten pixels on both axes', () => {
    const level = playing([...floor(0, 9), coin(4, 1), spawn(2, 1)])
    level.step(10)
    const state = ninja(level)
    level.step(120, RIGHT)
    expect(state.coins).toBe(1)
    expect(level.entities.some((one) => one.name === 'Coin')).toBe(false)
  })

  it('leaves a coin a tile overhead alone', () => {
    // Centre-to-centre vertical gap is 20 px standing under it — outside the 10.
    const level = playing([...floor(0, 9), coin(2, 2), spawn(2, 1)])
    level.step(30)
    expect(ninja(level).coins).toBe(0)
  })
})

describe('head bumps', () => {
  it('pays a ?-block out once, dresses it as used, and pops a coin off its top', () => {
    const level = playing([...floor(0, 9), questBlock(2, 3), coin(8, 1), spawn(2, 1)])
    level.step(10)
    const state = ninja(level)
    level.step(30, JUMP)
    expect(state.coins).toBe(1)

    const block = level.entities.find((one) => one.name === '? Block')
    expect((block?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('used.png')
    expect(block?.components['bonus']).toBeUndefined()
    expect(level.entities.some((one) => one.id.startsWith('fx#'))).toBe(true)

    // A second bump is an ordinary thud: nothing more to pay.
    level.step(60)
    level.step(30, JUMP)
    expect(state.coins).toBe(1)
  })

  it('shatters a brick into four spinning shards of itself', () => {
    const level = playing([...floor(0, 9), brick(2, 3), spawn(2, 1)])
    level.step(10)
    level.step(5, JUMP)
    for (let at = 0; at < 30 && level.entities.some((one) => one.name === 'Brick'); at += 1) level.step(1, JUMP)

    expect(level.entities.some((one) => one.name === 'Brick')).toBe(false)
    const shards = level.entities.filter((one) => one.id.startsWith('fx#'))
    expect(shards).toHaveLength(4)
    expect((shards[0]?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('brick.png')

    // The debris expires after its 34 frames.
    level.step(40)
    expect(level.entities.some((one) => one.id.startsWith('fx#'))).toBe(false)
  })

  it('knocks out an enemy standing on the broken brick', () => {
    const level = playing([...floor(0, 9), brick(2, 3), walker(2, 4, 0.001), spawn(2, 1)])
    level.step(10)
    for (let at = 0; at < 35 && level.entities.some((one) => one.name === 'Brick'); at += 1) level.step(1, JUMP)
    expect(level.entities.some((one) => one.name === 'Brick')).toBe(false)

    // The rider tumbles out of the world within its 48 frames.
    level.step(60)
    expect(level.entities.some((one) => one.name === 'Walker')).toBe(false)
  })
})

describe('spikes, pits, death and respawn', () => {
  it('dies walking into a spike, blinks out, and respawns at the spawn with its coins', () => {
    const level = playing([...floor(0, 9), coin(3, 1), spike(5, 1), spawn(2, 1)])
    level.step(10)
    const state = ninja(level)
    let died = false
    for (let at = 0; at < 240 && !died; at += 1) {
      level.step(1, RIGHT)
      died = state.dyingFrames !== null
    }
    expect(died).toBe(true)
    expect(state.coins).toBe(1)

    level.step(45)
    expect(state.dyingFrames).toBeNull()
    expect(state.x).toBe(40)
    expect(state.coins).toBe(1)
  })

  it('does not die standing beside a spike — the lethal zone is inset', () => {
    const level = playing([...floor(0, 9), spike(5, 1), spawn(4, 1)])
    level.step(30)
    expect(ninja(level).dyingFrames).toBeNull()
  })

  it('falls into a pit and dies forty pixels below the floor, unknocked', () => {
    // The far ground keeps the outer wall past the gap, so the gap is a pit.
    const level = playing([...floor(0, 3), ...floor(20, 21), spawn(2, 1)])
    level.step(10)
    const state = ninja(level)
    let died = false
    for (let at = 0; at < 300 && !died; at += 1) {
      level.step(1, RIGHT)
      died = state.dyingFrames !== null
    }
    expect(died).toBe(true)
    expect(state.vy).toBeLessThanOrEqual(0)
  })
})

describe('the flag', () => {
  it('wins on touch and freezes the ninja against further input', () => {
    const level = playing([...floor(0, 9), flag(5, 1), spawn(3, 1)])
    level.step(10)
    const state = ninja(level)
    for (let at = 0; at < 240 && !state.won; at += 1) level.step(1, RIGHT)
    expect(state.won).toBe(true)
    expect(state.vx).toBe(0)

    const wonAt = state.x
    level.step(30, RIGHT)
    expect(state.x).toBe(wonAt)
  })
})
