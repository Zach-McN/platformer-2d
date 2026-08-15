import { describe, expect, it } from 'vitest'

import { enemyOf } from '../src/systems/enemies'
import { floor, ground, playing, turtle, walker } from './level'

/**
 * Enemies on their own: the patrol speeds are the component's (per-placement
 * variants included — game-content T2), walls reverse, and ledges turn a
 * walker while it walks.
 */

function stateOf(level: { entities: readonly import('kernel-2d/runtime').Entity[] }, name: string) {
  const entity = level.entities.find((one) => one.name === name)
  const state = entity === undefined ? null : enemyOf(entity)
  if (state === null) throw new Error(`${name} has no enemy state`)
  return state
}

describe('the patrol', () => {
  it('walks left at exactly the speed its component carries', () => {
    const level = playing([...floor(0, 19), walker(10, 1)])
    level.step(5) // settle onto the floor
    const state = stateOf(level, 'Walker')
    const from = state.x
    level.step(60)
    expect(from - state.x).toBeCloseTo(33, 1)
  })

  it('reads the per-placement variant speeds from the component, not a default', () => {
    const level = playing([...floor(0, 19), walker(6, 1, 36), turtle(14, 1, 21)])
    level.step(5)
    const fast = stateOf(level, 'Walker')
    const slow = stateOf(level, 'Turtle')
    const fastFrom = fast.x
    const slowFrom = slow.x
    level.step(60)
    expect(fastFrom - fast.x).toBeCloseTo(36, 1)
    expect(slowFrom - slow.x).toBeCloseTo(21, 1)
  })

  it('reverses on a wall', () => {
    const level = playing([...floor(0, 19), ground(7, 1), walker(10, 1)])
    level.step(5)
    const state = stateOf(level, 'Walker')
    expect(state.vx).toBeLessThan(0)
    level.step(120)
    expect(state.vx).toBeGreaterThan(0)
  })

  it('turns at a ledge instead of walking off it', () => {
    const level = playing([...floor(8, 12), walker(10, 1)])
    level.step(600)
    const state = stateOf(level, 'Walker')
    // Still on the platform after ten seconds: the ledge turned it, twice over.
    expect(state.x).toBeGreaterThan(8 * 16)
    expect(state.x).toBeLessThan(13 * 16)
    expect(state.grounded).toBe(true)
  })
})
