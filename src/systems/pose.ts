import type { Entity, System } from 'kernel-2d/runtime'

import { wear } from '../components/roles'
import { enemyOf, type EnemyState } from './enemies'
import { ninjaOf, playerIn, type Frame, type NinjaState } from './ninja'
import {
  AIR_NARROW,
  AIR_STRETCH,
  AIR_STRETCH_FULL,
  BOB_PERIOD_FRAMES,
  DEATH_BLINK_HIDDEN,
  DEATH_BLINK_PERIOD,
  LANDING_FRAMES,
  LANDING_SPREAD,
  LANDING_SQUASH,
  NINJA_SPRITE_HEIGHT,
  NINJA_SPRITE_SINK,
  SPRINT_LEAN_X,
  SPRINT_LEAN_Y,
  TILE,
  WALK_ANIM_MOVING,
  WALK_ANIM_STRIDE,
  WOBBLE_FLOOR,
  WOBBLE_RATE,
} from './tuning'

/**
 * Presentation: which frame everything wears and how it is scaled — the walk
 * cycle, facing, squash & stretch, the enemies' bob and the shell's wobble.
 * Runs after every system that moves things, and touches nothing but sprites
 * and transforms; a level run without it still plays exactly the same game,
 * standing stiffly.
 *
 * Squash and stretch draw about the bottom-centre anchor with the feet
 * planted. The art's pivot is its centre, so anchoring at the feet is
 * arithmetic here: the sprite's centre is placed at feet + half the scaled
 * height, and the feet stay put at any squash.
 */
export const poseSystem: System = {
  id: 'pose',

  step: (entities) => {
    const marker = playerIn(entities)
    if (marker !== null) {
      const state = ninjaOf(marker)
      if (state !== null) poseNinja(marker, state)
    }

    for (const entity of entities) {
      const enemy = enemyOf(entity)
      if (enemy !== null) poseEnemy(entity, enemy)
    }
  },
}

function poseNinja(marker: Entity, state: NinjaState): void {
  // The death blink: hidden 3 of every 6 frames, wearing whatever it wore.
  if (state.dyingFrames !== null) {
    const phase = Math.floor(state.dyingFrames) % DEATH_BLINK_PERIOD
    if (phase < DEATH_BLINK_HIDDEN) delete marker.components['sprite']
    else {
      const look = state.frames[frameFor(state)]
      if (look !== undefined) wear(marker, look)
    }
    return
  }

  const look = state.frames[frameFor(state)]
  if (look !== undefined) wear(marker, look)

  let sx = 1
  let sy = 1
  if (!state.grounded) {
    // Airborne: stretched tall by how fast it is moving vertically.
    const v = Math.min(1, Math.abs(state.vy) / AIR_STRETCH_FULL)
    sy = 1 + AIR_STRETCH * v
    sx = 1 - AIR_NARROW * v
  } else if (state.landingFrames > 0) {
    // Hard landing: squashed flat, easing back up as the timer runs out.
    const t = state.landingFrames / LANDING_FRAMES
    sy = 1 - LANDING_SQUASH * t
    sx = 1 + LANDING_SPREAD * t
  } else if (state.sprinting) {
    sx = SPRINT_LEAN_X
    sy = SPRINT_LEAN_Y
  }

  marker.transform.scaleX = sx * state.facing
  marker.transform.scaleY = sy
  // Feet planted: the sprite's bottom sits 2 px below the hitbox floor, and
  // scaling grows it upward from there.
  marker.transform.y = state.y - NINJA_SPRITE_SINK + (NINJA_SPRITE_HEIGHT / 2) * sy
}

function frameFor(state: NinjaState): Frame {
  if (!state.grounded) return state.vy > 0 ? 'jump' : 'fall'
  if (Math.abs(state.vx) <= WALK_ANIM_MOVING) return 'idle'
  const stride = Math.floor(state.runDistance / WALK_ANIM_STRIDE) % 4
  return `walk${stride}` as Frame
}

function poseEnemy(entity: Entity, state: EnemyState): void {
  let sx = 1
  let sy = 1
  let bottom = state.y - 1

  if (state.mode === 'tumble') {
    // Upside down all the way out.
    sy = -1
    entity.transform.scaleX = sx
    entity.transform.scaleY = sy
    return
  }

  if (state.mode === 'walk') {
    // The walking bob: a pixel shorter and lower on alternating 8-frame steps.
    const phase = Math.floor(state.walkFrames / BOB_PERIOD_FRAMES) % 2
    if (phase === 1) {
      sy = (TILE - 1) / TILE
      bottom -= 0
    }
  }

  if (state.mode === 'sliding') {
    // The sliding wobble: width breathing with the slide, never below 45%.
    sx = Math.max(WOBBLE_FLOOR, Math.abs(Math.cos(state.slideFrames * WOBBLE_RATE)))
  }

  // Facing: the art walks left; flip it when walking right.
  if (state.mode === 'walk' && state.vx > 0) sx = -sx

  entity.transform.scaleX = sx
  entity.transform.scaleY = sy
  entity.transform.y = bottom + (TILE / 2) * sy
}
