import { cameraIn } from 'kernel-2d/runtime'
import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn } from '../src/systems/ninja'
import { floor, playing, spawn } from './level'

/**
 * The camera chase, asserted with no host, no canvas and no renderer: the ask
 * stands in the level (`runtime/game/camera.ts` leaves it there when nobody
 * takes it), so a test reads where the game wants the view the same way the
 * kernel's host would.
 */

describe('the camera follow', () => {
  it('asks for the ninja\'s centre from the first step', () => {
    const level = playing([...floor(0, 19), spawn(2, 1)])
    level.step(1)
    const state = ninjaOf(playerIn(level.entities)!)!
    const asked = cameraIn(level.entities)
    expect(asked).not.toBeNull()
    expect(asked?.x).toBeCloseTo(state.x, 5)
  })

  it('trails a moving ninja, easing after it rather than snapping', () => {
    const level = playing([...floor(0, 40), spawn(2, 1)])
    level.step(10)
    const state = ninjaOf(playerIn(level.entities)!)!
    level.step(90, ['ArrowRight'])

    const chasing = cameraIn(level.entities)
    expect(chasing).not.toBeNull()
    if (chasing === null) return
    // Behind the ninja while it runs — the 15%-per-frame ease trailing.
    expect(chasing.x).toBeLessThan(state.x)
    expect(chasing.x).toBeGreaterThan(state.x - 60)

    // And it closes in once the ninja stands still.
    level.step(120)
    const settled = cameraIn(level.entities)
    expect(settled?.x).toBeCloseTo(state.x, 1)
  })
})
