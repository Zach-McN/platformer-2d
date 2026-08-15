import { describe, expect, it } from 'vitest'

import { enemyOf, type EnemyState } from '../src/systems/enemies'
import { ninjaOf, playerIn, type NinjaState } from '../src/systems/ninja'
import { SHELL_KICK_SPEED, STOMP_BOUNCE } from '../src/systems/tuning'
import { floor, playing, spawn, turtle, walker, type Playing } from './level'

/**
 * Stomps and the whole turtle chain: stomp → shell → kick → the slide that
 * knocks out everything → stomped back to rest. The ninja is dropped onto
 * enemies by spawning it above them, which is the reference's own physics
 * doing the aiming.
 */

const RIGHT = ['ArrowRight']

function ninja(level: Playing): NinjaState {
  const marker = playerIn(level.entities)
  const state = marker === null ? null : ninjaOf(marker)
  if (state === null) throw new Error('no ninja stood up')
  return state
}

function enemy(level: Playing, name: string): EnemyState {
  const entity = level.entities.find((one) => one.name === name)
  const state = entity === undefined ? null : enemyOf(entity)
  if (state === null) throw new Error(`${name} has no state`)
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

describe('stomping', () => {
  it('squashes a walker flat, bounces the ninja, and clears the body after 22 frames', () => {
    // A slow walker right under the spawn: the ninja falls straight onto it.
    const level = playing([...floor(0, 9), walker(2, 1, 0.001), spawn(2, 5)])
    level.step(1) // one step stands everything up
    const state = ninja(level)
    const squashed = () => enemy(level, 'Walker').mode === 'squashed'
    until(level, 'the stomp', squashed)
    expect(state.vy).toBeCloseTo(STOMP_BOUNCE, 5)
    const body = level.entities.find((one) => one.name === 'Walker')
    expect((body?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('walker-squashed.png')

    level.step(25)
    expect(level.entities.some((one) => one.name === 'Walker')).toBe(false)
  })

  it('tucks a walking turtle into a resting shell wearing the shell art', () => {
    const level = playing([...floor(0, 9), turtle(2, 1, 0.001), spawn(2, 5)])
    level.step(1)
    until(level, 'the tuck', () => enemy(level, 'Turtle').mode === 'shell')
    const state = enemy(level, 'Turtle')
    expect(state.width).toBe(14)
    expect(state.height).toBe(12)
    expect(state.vx).toBe(0)
    const body = level.entities.find((one) => one.name === 'Turtle')
    expect((body?.components['sprite'] as { texture: { path: string } }).texture.path).toBe('shell.png')
  })
})

describe('the shell chain', () => {
  function rested(level: Playing): EnemyState {
    level.step(1) // one step stands everything up
    until(level, 'the tuck', () => enemy(level, 'Turtle').mode === 'shell')
    const shell = enemy(level, 'Turtle')
    // Ride out the bounce and the shell's grace before touching it again.
    until(level, 'the grace passing', () => shell.graceFrames === 0 && ninja(level).grounded, 300)
    return shell
  }

  it('kicks a rested shell away from the ninja at the kick speed', () => {
    const level = playing([...floor(0, 19), turtle(2, 1, 0.001), spawn(2, 5)])
    const shell = rested(level)
    const player = ninja(level)
    until(level, 'the kick', () => shell.mode === 'sliding', 300, RIGHT)
    // Kicked away from the side the ninja touched it on.
    expect(Math.abs(shell.vx)).toBeCloseTo(SHELL_KICK_SPEED, 5)
    expect(Math.sign(shell.vx)).toBe(shell.x >= player.x ? 1 : -1)
    expect(player.dyingFrames).toBeNull()
  })

  it('a sliding shell knocks out every enemy it touches and bounces off walls', () => {
    const level = playing([...floor(0, 19), turtle(4, 1, 0.001), walker(10, 1, 0.001), spawn(4, 5)])
    const shell = rested(level)
    until(level, 'the kick', () => shell.mode === 'sliding', 300, RIGHT)
    const kickedToward = Math.sign(shell.vx)

    // Whichever way it went, the walls turn it back and forth across the
    // whole level — over and through the walker on the way.
    until(level, 'the walker knocked out', () => {
      const body = level.entities.find((one) => one.name === 'Walker')
      return body === undefined || enemyOf(body)?.mode === 'tumble'
    }, 600)

    until(level, 'a wall bounce', () => Math.sign(shell.vx) !== kickedToward, 600)
    expect(Math.abs(shell.vx)).toBeCloseTo(SHELL_KICK_SPEED, 5)
  })

  it('a sliding shell hit from the side kills the ninja', () => {
    const level = playing([...floor(0, 19), turtle(6, 1, 0.001), spawn(6, 5)])
    const shell = rested(level)
    const player = ninja(level)
    until(level, 'the kick', () => shell.mode === 'sliding', 300, RIGHT)
    // Chase it into the wall and meet it coming back.
    until(level, 'the fatal reunion', () => player.dyingFrames !== null, 900, RIGHT)
    expect(player.dyingFrames).not.toBeNull()
  })

  it('walking into a patrolling walker kills the ninja', () => {
    const level = playing([...floor(0, 9), walker(6, 1, 0.001), spawn(2, 1)])
    level.step(10)
    const player = ninja(level)
    until(level, 'the side contact', () => player.dyingFrames !== null, 300, RIGHT)
    expect(player.dyingFrames).not.toBeNull()
  })
})
