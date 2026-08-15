import type { System } from 'kernel-2d/runtime'

import { chaseSystem } from './chase'
import { clashSystem } from './clash'
import { effectsSystem } from './effects'
import { enemiesSystem } from './enemies'
import { ninjaSystem } from './ninja'
import { poseSystem } from './pose'

/**
 * Everything this game runs, in order — and the order is the rules.
 *
 * The ninja and the enemies move first; `clash` judges their contact where
 * this step actually put them; `effects` flies the debris the bumps threw;
 * `pose` dresses everything for the eye; `chase` aims the camera last, at
 * where the ninja ended up. The engine runs exactly this list (`editor-kernel`
 * D28) — nothing here is optional and nothing else is added.
 */
export const systems: readonly System[] = [
  ninjaSystem,
  enemiesSystem,
  clashSystem,
  effectsSystem,
  poseSystem,
  chaseSystem,
]
