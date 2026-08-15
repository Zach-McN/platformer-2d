import { aimCamera, type Entity, type System } from 'kernel-2d/runtime'

import { ninjaOf, playerIn } from './ninja'
import { CAMERA_EASE, NINJA_HEIGHT } from './tuning'

/**
 * The camera chasing the ninja.
 *
 * The reference eases the scroll 15% of the remaining distance every frame,
 * accumulated as a float — never re-read from the quantized scroll position,
 * which is what causes its visible-stutter warning. The same shape here: the
 * eased focus lives in this system's own state, and what the host gets each
 * frame is the float.
 *
 * The system asks for the player's centre and nothing else (`aimCamera`); the
 * kernel's host owns the scale and clamps the ask to the level's extent, so
 * the view stops at the edges exactly as the reference's clamp does — without
 * this code knowing how big the window is.
 */
export const chaseSystem: System = {
  id: 'chase',

  step: (entities, dtSeconds) => {
    const marker = playerIn(entities)
    if (marker === null) return
    const state = ninjaOf(marker)
    if (state === null) return

    const target = { x: state.x, y: state.y + NINJA_HEIGHT / 2 }
    const eased = focusOf(marker)

    if (eased === null) {
      focus.set(marker, { ...target })
    } else {
      // 15% per reference frame, whatever the step size: the same total pull
      // over the same time.
      const pull = 1 - Math.pow(1 - CAMERA_EASE, dtSeconds * 60)
      eased.x += (target.x - eased.x) * pull
      eased.y += (target.y - eased.y) * pull
    }

    const now = focusOf(marker)
    if (now !== null) aimCamera(entities, { x: now.x, y: now.y })
  },
}

const focus = new WeakMap<Entity, { x: number; y: number }>()

function focusOf(marker: Entity): { x: number; y: number } | null {
  return focus.get(marker) ?? null
}
