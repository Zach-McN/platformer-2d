import { spinSystem, type System } from 'kernel-2d/runtime'

import { chaseSystem } from './chase'
import { clashSystem } from './clash'
import { effectsSystem } from './effects'
import { enemiesSystem } from './enemies'
import { hudSystem } from './hud'
import { ninjaSystem } from './ninja'
import { poseSystem } from './pose'
import { soundSystem } from './sound'

/**
 * Everything this game runs, in order — and the order is the rules.
 *
 * `sound` goes first because it owns M and nothing else: an unmute's
 * confirming coin is queued before whatever else this step makes a noise
 * about. Then the ninja and the enemies move; `clash` judges their contact
 * where this step actually put them; `effects` flies the debris the bumps
 * threw; `pose` dresses everything for the eye; `hud` draws the screen from
 * the step's final facts; `chase` aims the camera last, at where the ninja
 * ended up. The engine runs exactly this list (`editor-kernel` D28) — nothing
 * here is optional and nothing else is added.
 *
 * The kernel's own `spin` runs second, before the ninja: the fire bar's arm has
 * to have turned *this* step before contact with the fire on it is judged, or
 * the fire would kill a frame behind where it is drawn (game-code C12). It is
 * the kernel's system, listed here because the engine runs nothing a game did
 * not list.
 */
export const systems: readonly System[] = [
  soundSystem,
  spinSystem,
  ninjaSystem,
  enemiesSystem,
  clashSystem,
  effectsSystem,
  poseSystem,
  hudSystem,
  chaseSystem,
]
