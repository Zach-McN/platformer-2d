import { doorIn } from 'kernel-2d/runtime'
import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn } from '../src/systems/ninja'
import { FIXTURE_SCENE, coin, counter, flag, floor, hint, nextLevel, playing, spawn, spike, type Playing } from './level'

/**
 * The screen: the live count, the banners, the hint's fade, and R. Everything
 * here is asserted on the entities the hud spawns — pinned by the kernel's
 * `screen` component, so a test reads what the renderer would draw without a
 * renderer.
 */

const RIGHT = ['ArrowRight']

const digitsShown = (level: Playing): string =>
  level.entities
    .filter((one) => one.id.startsWith('hud#digit'))
    .sort((a, b) => a.transform.x - b.transform.x)
    .map((one) => (one.components['sprite'] as { texture: { path: string } }).texture.path.replace(/.*digit-(\d)\.png/, '$1'))
    .join('')

const bannerShown = (level: Playing): string | null => {
  const banner = level.entities.find((one) => one.id === 'hud#banner')
  return banner === undefined ? null : (banner.components['sprite'] as { texture: { path: string } }).texture.path
}

describe('the coin counter', () => {
  it('shows 0 at the start and counts up the instant a coin is taken', () => {
    const level = playing([...floor(0, 9), coin(4, 1), counter(), spawn(2, 1)])
    level.step(2)
    expect(digitsShown(level)).toBe('0')
    level.step(120, RIGHT)
    expect(digitsShown(level)).toBe('1')
  })

  it('pins every digit to the top-right corner, right-aligned', () => {
    const level = playing([...floor(0, 9), counter(), spawn(2, 1)])
    level.step(2)
    const digit = level.entities.find((one) => one.id === 'hud#digit0')
    expect(digit?.components['screen']).toEqual({ anchor: { x: 1, y: 1 } })
    expect(digit?.transform.x).toBeLessThan(0)
  })
})

describe('the banners', () => {
  it('shows OUCH! on death, then hides it, and never for a live ninja', () => {
    const level = playing([...floor(0, 9), spike(5, 1), counter(), spawn(2, 1)])
    level.step(2)
    expect(bannerShown(level)).toBeNull()
    const state = ninjaOf(playerIn(level.entities)!)!
    for (let at = 0; at < 240 && state.dyingFrames === null; at += 1) level.step(1, RIGHT)
    expect(bannerShown(level)).toBe('ui/banner-ouch.png')
    // The banner auto-hides at 0.7 s even though the 40-frame death is shorter —
    // in the reference the banner outlives the respawn; here it goes with it.
    level.step(45)
    expect(bannerShown(level)).toBeNull()
  })

  it('shows LEVEL CLEAR! with the coin total, and keeps it', () => {
    const level = playing([...floor(0, 9), coin(4, 1), flag(6, 1), counter(), spawn(2, 1)])
    level.step(2)
    const state = ninjaOf(playerIn(level.entities)!)!
    for (let at = 0; at < 300 && !state.won; at += 1) level.step(1, RIGHT)
    expect(state.won).toBe(true)
    expect(bannerShown(level)).toBe('ui/banner-clear.png')
    const total = level.entities.filter((one) => one.id.startsWith('hud#total'))
    expect(total).toHaveLength(1)
    expect((total[0]?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('ui/digit-1.png')
    level.step(120)
    expect(bannerShown(level)).toBe('ui/banner-clear.png')
  })
})

describe('the controls hint', () => {
  it('goes on the first input', () => {
    const level = playing([...floor(0, 9), counter(), hint(), spawn(2, 1)])
    level.step(30)
    expect(level.entities.some((one) => one.name === 'Controls hint')).toBe(true)
    level.step(1, RIGHT)
    expect(level.entities.some((one) => one.name === 'Controls hint')).toBe(false)
  })

  it('goes after nine seconds untouched', () => {
    const level = playing([...floor(0, 9), counter(), hint(), spawn(2, 1)])
    level.step(9 * 60 - 5)
    expect(level.entities.some((one) => one.name === 'Controls hint')).toBe(true)
    level.step(10)
    expect(level.entities.some((one) => one.name === 'Controls hint')).toBe(false)
  })
})

describe('R', () => {
  it('asks for this same scene again, which is the restart', () => {
    const level = playing([...floor(0, 9), counter(), spawn(2, 1)])
    level.step(2)
    expect(doorIn(level.entities)).toBeNull()
    level.step(1, [], ['KeyR'])
    expect(doorIn(level.entities)).toBe(FIXTURE_SCENE)
  })
})

describe('the next-level prompt', () => {
  const NEXT = 'scenes/level-02.json'
  const promptShown = (level: Playing): boolean => level.entities.some((one) => one.id === 'hud#prompt')
  const win = (level: Playing): void => {
    level.step(2)
    const state = ninjaOf(playerIn(level.entities)!)!
    for (let at = 0; at < 300 && !state.won; at += 1) level.step(1, RIGHT)
    expect(state.won).toBe(true)
  }

  it('hides the marker the moment play starts', () => {
    const level = playing([...floor(0, 9), flag(6, 1), nextLevel(8, 1), counter(), spawn(2, 1)])
    level.step(1)
    const marker = level.entities.find((one) => one.name === 'Next level')
    expect(marker).toBeDefined()
    expect(marker?.components['sprite']).toBeUndefined()
  })

  it('asks under the win banner, and not before', () => {
    const level = playing([...floor(0, 9), flag(6, 1), nextLevel(8, 1), counter(), spawn(2, 1)])
    level.step(2)
    expect(promptShown(level)).toBe(false)
    win(level)
    expect(bannerShown(level)).toBe('ui/banner-clear.png')
    const prompt = level.entities.find((one) => one.id === 'hud#prompt')
    expect(prompt?.components['screen']).toEqual({ anchor: { x: 0.5, y: 0.5 } })
    expect(prompt?.transform.y).toBeLessThan(-20)
    expect((prompt?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('ui/prompt-next.png')
  })

  it('never asks in a level with no marker', () => {
    const level = playing([...floor(0, 9), flag(6, 1), counter(), spawn(2, 1)])
    win(level)
    expect(promptShown(level)).toBe(false)
    level.step(1, [], ['KeyY'])
    expect(doorIn(level.entities)).toBeNull()
  })

  it('opens the named level on Y, and on Enter', () => {
    for (const code of ['KeyY', 'Enter']) {
      const level = playing([...floor(0, 9), flag(6, 1), nextLevel(8, 1, NEXT), counter(), spawn(2, 1)])
      win(level)
      expect(doorIn(level.entities)).toBeNull()
      level.step(1, [], [code])
      expect(doorIn(level.entities)).toBe(NEXT)
    }
  })

  it('plays this level again on N', () => {
    const level = playing([...floor(0, 9), flag(6, 1), nextLevel(8, 1, NEXT), counter(), spawn(2, 1)])
    win(level)
    level.step(1, [], ['KeyN'])
    expect(doorIn(level.entities)).toBe(FIXTURE_SCENE)
  })

  it('ignores Y and N while the ninja is still playing', () => {
    const level = playing([...floor(0, 9), flag(6, 1), nextLevel(8, 1, NEXT), counter(), spawn(2, 1)])
    level.step(2)
    level.step(1, [], ['KeyY'])
    expect(doorIn(level.entities)).toBeNull()
    level.step(1, [], ['KeyN'])
    expect(doorIn(level.entities)).toBeNull()
  })
})
