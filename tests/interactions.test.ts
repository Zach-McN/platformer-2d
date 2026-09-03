import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import { fireBar, floor, coin, brick, questBlock, spike, flag, playing, spawn, walker, type Playing } from './level'

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
    // The brick's own picture, four times — the dust thrown with them is a
    // different texture and has its own test (`particles.test.ts`).
    const shards = level.entities.filter(
      (one) =>
        one.id.startsWith('fx#') &&
        (one.components['sprite'] as { texture: { path: string } }).texture.path === 'brick.png',
    )
    expect(shards).toHaveLength(4)

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

/**
 * The fire bar: three ordinary pieces — a solid block, the kernel's spin, the
 * spike's deadly — and one read that had to change. The first test is the one
 * that fails if the deadly zone is read off the flame's stored numbers: the
 * flames store offsets of 16, 32 and 48 from an arm at the block, so a ninja
 * standing at (16..48, 0) *in level terms* would be judged dead by an offset
 * mistaken for a place. Asked of the kernel, the flames are where the arm has
 * turned them, and the ninja dies only when the arm comes round.
 */
describe('the fire bar', () => {
  it('does not kill a ninja standing where the flames’ stored offsets would put them', () => {
    // Block at column 8, row 6 — high up, arm starting to the right. The ninja
    // stands at column 2 on the floor, which is where an offset of 32 from the
    // level's origin would land a flame if offsets were read as places.
    const level = playing([...floor(0, 15), ...fireBar(8, 6, 0), spawn(2, 1)])
    level.step(30)
    expect(ninja(level).dyingFrames).toBeNull()
  })

  it('kills the ninja when the arm swings the fire onto it', () => {
    // The arm starts pointing right and turns counter-clockwise; a ninja stood
    // two columns right of the block on the same row is in the first flame's
    // path as it comes round — after a quarter turn it points up, after a half
    // turn left, and after a full turn it is back on the ninja.
    const level = playing([...floor(0, 15), ...fireBar(6, 1, 360), spawn(9, 1)])
    level.step(1)
    const state = ninja(level)
    let died = false
    for (let at = 0; at < 120 && !died; at += 1) {
      level.step(1)
      died = state.dyingFrames !== null
    }
    expect(died).toBe(true)
  })

  it('is stood on like any block', () => {
    // The bar is on the floor row with its arm held still, pointing right; the
    // ninja drops onto the block and stands there. (A turning arm sweeps the
    // top of the block too — that is the hazard, not a bug.)
    const level = playing([...floor(0, 15), ...fireBar(5, 1, 0), spawn(5, 3)])
    level.step(60)
    const state = ninja(level)
    expect(state.dyingFrames).toBeNull()
    // Standing on the block: feet at the block's top edge.
    expect(state.y).toBe(32)
  })

  it('turns faster when the placement says so', () => {
    const slow = playing([...floor(0, 15), ...fireBar(8, 6, 90), spawn(2, 1)])
    const fast = playing([...floor(0, 15), ...fireBar(8, 6, 180), spawn(2, 1)])
    slow.step(30)
    fast.step(30)
    const armOf = (level: Playing) => level.entities.find((one) => one.name === 'Arm')
    expect(armOf(slow)?.transform.rotation).toBeCloseTo(45, 5)
    expect(armOf(fast)?.transform.rotation).toBeCloseTo(90, 5)
  })
})
