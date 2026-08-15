import { describe, expect, it } from 'vitest'

import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import { isMuted } from '../src/systems/sound'
import {
  brick,
  coin,
  counter,
  flag,
  floor,
  ground,
  heard,
  playing,
  questBlock,
  spawn,
  spike,
  walker,
  type Playing,
} from './level'

/**
 * The seven noises of `docs/REMAKE-PARITY.md` §8, and the M that silences them.
 *
 * Every assertion is about *which* sound a rule asked for, never about what it
 * sounded like: the notes are the recipe's business (`src/systems/sound.ts`
 * against the doc) and the synthesis is the kernel host's. A cue reaching the
 * level is the whole of what this game can be responsible for, and it needs no
 * audio context to prove — which is the point of the seam.
 */

const RIGHT = ['ArrowRight']
const JUMP = ['Space']
const MUTE = ['KeyM']

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

describe('the seven', () => {
  it('jumps', () => {
    const level = playing([...floor(0, 9), spawn(2, 1)])
    level.step(10)
    expect(heard(level)).toEqual([])

    level.step(1, JUMP)
    expect(heard(level)).toEqual(['jump'])

    // Still holding is not a second jump, so it is not a second sound.
    level.step(5, JUMP)
    expect(heard(level)).toEqual([])
  })

  it('takes a coin', () => {
    const level = playing([...floor(0, 9), coin(4, 1), spawn(2, 1)])
    level.step(10)
    heard(level)
    until(level, 'the coin', () => ninja(level).coins === 1, 300, RIGHT)
    expect(heard(level)).toEqual(['coin'])
  })

  it('pays a ?-block out as a coin, and thuds on it once it is spent', () => {
    const level = playing([...floor(0, 9), questBlock(2, 3), coin(8, 1), spawn(2, 1)])
    level.step(10)
    heard(level)

    level.step(30, JUMP)
    // The jump itself, then the block paying out.
    expect(heard(level)).toEqual(['jump', 'coin'])

    level.step(60)
    heard(level)
    level.step(30, JUMP)
    expect(heard(level)).toEqual(['jump', 'bump'])
  })

  it('breaks a brick', () => {
    const level = playing([...floor(0, 9), brick(2, 3), spawn(2, 1)])
    level.step(10)
    heard(level)
    level.step(30, JUMP)
    expect(heard(level)).toEqual(['jump', 'break'])
  })

  it('thuds on any other solid', () => {
    const level = playing([...floor(0, 9), ground(2, 3), spawn(2, 1)])
    level.step(10)
    heard(level)
    level.step(30, JUMP)
    expect(heard(level)).toEqual(['jump', 'bump'])
  })

  it('stomps a walker', () => {
    const level = playing([...floor(0, 9), walker(2, 1, 0.001), spawn(2, 5)])
    level.step(1)
    heard(level)
    until(level, 'the stomp', () => ninja(level).vy > 0)
    expect(heard(level)).toEqual(['stomp'])
  })

  it('hurts, once, however long the dying lasts', () => {
    const level = playing([...floor(0, 9), spike(5, 1), spawn(2, 1)])
    level.step(10)
    heard(level)
    until(level, 'the death', () => ninja(level).dyingFrames !== null, 300, RIGHT)
    expect(heard(level)).toEqual(['hurt'])

    level.step(30)
    expect(heard(level)).toEqual([])
  })

  it('wins at the flag, once', () => {
    const level = playing([...floor(0, 9), flag(5, 1), spawn(3, 1)])
    level.step(10)
    heard(level)
    until(level, 'the win', () => ninja(level).won, 300, RIGHT)
    expect(heard(level)).toEqual(['win'])

    level.step(30, RIGHT)
    expect(heard(level)).toEqual([])
  })
})

describe('M', () => {
  it('silences everything, and unmuting says so with the coin', () => {
    const level = playing([...floor(0, 9), spawn(2, 1)])
    level.step(10)
    heard(level)

    level.step(1, [], MUTE)
    expect(isMuted(level.entities)).toBe(true)
    // Muting is confirmed by the silence, which is the reference's own answer.
    expect(heard(level)).toEqual([])

    // A jump now asks for nothing at all — a muted game is one that never asks.
    level.step(1, JUMP)
    expect(heard(level)).toEqual([])

    level.step(1, [], MUTE)
    expect(isMuted(level.entities)).toBe(false)
    expect(heard(level)).toEqual(['coin'])
  })

  it('is a fact, so it survives the restart R does', () => {
    // The counter is in the fixture because R lives in the hud system, which
    // stands down entirely in a level with no counter to draw.
    const level = playing([...floor(0, 9), counter(), spawn(2, 1)])
    level.step(10)
    level.step(1, [], MUTE)
    heard(level)

    // R asks the host to open this scene again (`game-code` C8); the facts are
    // what the host carries across, so the ninja that comes back is still muted.
    level.step(1, [], ['KeyR'])
    expect(level.entities.some((one) => one.components['door'] !== undefined)).toBe(true)
    expect(isMuted(level.entities)).toBe(true)
  })
})
