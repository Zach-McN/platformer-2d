import type { System } from 'kernel-2d/runtime'

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
 */
export const systems: readonly System[] = [
  soundSystem,
  ninjaSystem,
  enemiesSystem,
  clashSystem,
  effectsSystem,
  poseSystem,
  hudSystem,
  chaseSystem,
]
