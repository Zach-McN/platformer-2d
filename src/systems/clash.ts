import type { System } from 'kernel-2d/runtime'

import { spawnPuff } from './effects'
import { enemyOf, enemyHitbox, kick, rest, squash, tuck } from './enemies'
import { hitboxOf, killNinja, ninjaOf, playerIn } from './ninja'
import { sound } from './sound'
import { overlaps } from './tiles'
import {
  SHELL_KICK_GRACE,
  SHELL_KICK_SPEED,
  SHELL_REST_GRACE,
  SHELL_STOP_GRACE,
  STOMP_BOUNCE,
  STOMP_FALLING,
  STOMP_REACH,
} from './tuning'

/**
 * The player meeting an enemy — the one place the two sets of rules touch.
 *
 * Runs after `ninja` and `enemies` so both sides stand where this step put
 * them. Contact only counts while the player is alive and has not won, and
 * only for an enemy whose grace has run out; a squashed or tumbling enemy is
 * already out of the game.
 *
 * The stomp test is the doc's, applied to every kind: the player falling
 * faster than 0.5 px/frame with feet within 10 px of the enemy's top. Every
 * stomp bounces the player at the same speed. What the stomp *does* differs
 * by kind and mode, and the resting shell is the one enemy whose side contact
 * is not death — touching it is the kick.
 */
export const clashSystem: System = {
  id: 'clash',

  step: (entities) => {
    const marker = playerIn(entities)
    if (marker === null) return
    const player = ninjaOf(marker)
    if (player === null || player.dyingFrames !== null || player.won) return

    for (const entity of entities) {
      const enemy = enemyOf(entity)
      if (enemy === null) continue
      if (enemy.mode === 'squashed' || enemy.mode === 'tumble') continue
      if (enemy.graceFrames > 0) continue
      if (!overlaps(hitboxOf(player), enemyHitbox(enemy))) continue

      const enemyTop = enemy.y + enemy.height
      const stomped = player.vy < -STOMP_FALLING && Math.abs(player.y - enemyTop) <= STOMP_REACH

      if (enemy.mode === 'shell') {
        // Touching or stomping a resting shell kicks it away; only the stomp
        // bounces the player with it.
        kick(enemy, player.x, SHELL_KICK_SPEED, SHELL_KICK_GRACE)
        sound(entities, 'stomp')
        spawnPuff(entities, enemy.x, enemy.y, enemy.puffTexture)
        if (stomped) player.vy = STOMP_BOUNCE
        continue
      }

      if (!stomped) {
        killNinja(entities, player, true)
        return
      }

      // A shell stomped back to rest is the one stomp the reference throws no
      // puff for — nothing is squashed and nothing tucks, it simply stops.
      if (enemy.mode === 'sliding') rest(enemy, SHELL_STOP_GRACE)
      else {
        if (enemy.kind === 'walker') squash(entity, enemy)
        else tuck(entity, enemy, SHELL_REST_GRACE)
        spawnPuff(entities, enemy.x, enemy.y, enemy.puffTexture)
      }
      player.vy = STOMP_BOUNCE
      sound(entities, 'stomp')
    }
  },
}
