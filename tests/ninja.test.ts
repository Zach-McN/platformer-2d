import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import { SPRINT_SPEED, WALK_SPEED } from '../src/systems/tuning'
import { floor, playing, spawn, type Playing } from './level'

/**
 * The ninja's movement, held to the parity doc's numbers: walk 1.7 and sprint
 * 2.8 px/frame (102 and 168 units/second), a jump measured against tiles, the
 * jump cut, coyote time, and the no-autofire jump rule.
 */

const RIGHT = ['ArrowRight']
const JUMP = ['Space']

function standing(): { level: Playing; state: NinjaState } {
  const level = playing([...floor(0, 20), spawn(2, 1)])
  level.step(10) // settle onto the floor
  const marker = playerIn(level.entities)
  const state = marker === null ? null : ninjaOf(marker)
  if (state === null) throw new Error('no ninja stood up')
  return { level, state }
}

/** The highest the feet get over a run of steps. */
function apexOver(level: Playing, state: NinjaState, steps: number, held: readonly string[]): number {
  let apex = state.y
  for (let at = 0; at < steps; at += 1) {
    level.step(1, held)
    if (state.y > apex) apex = state.y
  }
  return apex
}

describe('walking and sprinting', () => {
  it('walks up to exactly the walk top speed', () => {
    const { level, state } = standing()
    level.step(60, RIGHT)
    expect(state.vx).toBeCloseTo(WALK_SPEED, 5)
  })

  it('sprints up to exactly the sprint top speed', () => {
    const { level, state } = standing()
    level.step(60, [...RIGHT, 'ShiftLeft'])
    expect(state.vx).toBeCloseTo(SPRINT_SPEED, 5)
  })

  it('coasts to a stop under friction when the keys are let go', () => {
    const { level, state } = standing()
    level.step(60, RIGHT)
    level.step(10)
    expect(state.vx).toBe(0)
  })

  it('faces the way it last moved', () => {
    const { level, state } = standing()
    level.step(20, RIGHT)
    expect(state.facing).toBe(1)
    level.step(20, ['ArrowLeft'])
    expect(state.facing).toBe(-1)
  })
})

describe('jumping', () => {
  it('clears three tiles from a standing jump but not four', () => {
    const { level, state } = standing()
    const floorY = state.y
    const apex = apexOver(level, state, 40, JUMP)
    expect(apex - floorY).toBeGreaterThan(48)
    expect(apex - floorY).toBeLessThan(64)
  })

  it('jumps higher at sprint speed', () => {
    const { level, state } = standing()
    level.step(90, [...RIGHT, 'ShiftLeft'])
    const floorY = state.y
    const apex = apexOver(level, state, 40, [...RIGHT, 'ShiftLeft', ...JUMP])
    expect(apex - floorY).toBeGreaterThan(60)
  })

  it('cuts the jump short when the key is released early', () => {
    const { level, state } = standing()
    const floorY = state.y
    level.step(3, JUMP)
    const apex = apexOver(level, state, 40, [])
    expect(apex - floorY).toBeLessThan(40)
  })

  it('does not jump again while the key stays held', () => {
    const { level, state } = standing()
    level.step(1, JUMP)
    expect(state.vy).toBeGreaterThan(0)
    // Ride the whole jump out with the key held; back on the floor, still held.
    level.step(120, JUMP)
    expect(state.grounded).toBe(true)
    expect(state.vy).toBe(0)
    // One release re-arms it.
    level.step(1)
    level.step(1, JUMP)
    expect(state.vy).toBeGreaterThan(0)
  })
})

describe('coyote time', () => {
  // A platform with an edge to walk off: the far ground column keeps the
  // level's outer wall far away, so the edge really is an edge and not a wall.
  const ledge = () => [...floor(0, 3), ...floor(20, 21), spawn(2, 1)]

  it('still jumps within six frames of walking off an edge', () => {
    const level = playing(ledge())
    level.step(10)
    const state = ninjaOf(playerIn(level.entities)!)!
    // Walk off the edge and catch the moment the ground goes.
    let airborne = false
    for (let at = 0; at < 120 && !airborne; at += 1) {
      level.step(1, RIGHT)
      airborne = !state.grounded
    }
    expect(airborne).toBe(true)
    level.step(3, RIGHT)
    level.step(1, [...RIGHT, ...JUMP])
    expect(state.vy).toBeGreaterThan(300)
  })

  it('is out of forgiveness after the six frames pass', () => {
    const level = playing(ledge())
    level.step(10)
    const state = ninjaOf(playerIn(level.entities)!)!
    for (let at = 0; at < 120 && state.grounded; at += 1) level.step(1, RIGHT)
    expect(state.grounded).toBe(false)
    level.step(8, RIGHT)
    level.step(1, [...RIGHT, ...JUMP])
    expect(state.vy).toBeLessThan(0)
  })
})
