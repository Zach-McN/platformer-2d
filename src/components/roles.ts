import type { Entity } from 'kernel-2d/runtime'

/**
 * The component vocabulary of this game, read tolerantly.
 *
 * The names are the content's (`.claude/skills/game-content` T1): the level was
 * generated carrying them, and the systems in `src/` are written against them.
 * Every reader answers null (or false) for a component that is absent *or*
 * mangled, on the same grounds as every reader in the tower defense: no system
 * could act differently on the difference, and a throw from inside a step is
 * the hardest fault to trace back to the file that caused it.
 */

/** A reference to a texture, the way every component that carries art spells one. */
export interface TextureRef {
  id: string
  path: string
}

function textureRefOf(value: unknown): TextureRef | null {
  if (typeof value !== 'object' || value === null) return null
  const texture: unknown = (value as { texture?: unknown }).texture
  if (typeof texture !== 'object' || texture === null) return null
  const { id, path } = texture as { id?: unknown; path?: unknown }
  if (typeof id !== 'string' || typeof path !== 'string' || path.length === 0) return null
  return { id, path }
}

/** Collides with the ninja and with enemies. */
export function isSolid(entity: Entity): boolean {
  return typeof entity.components['solid'] === 'object' && entity.components['solid'] !== null
}

/** Shatters on a head bump. */
export function isBreakable(entity: Entity): boolean {
  return typeof entity.components['breakable'] === 'object' && entity.components['breakable'] !== null
}

/** A pickup. */
export function isCoin(entity: Entity): boolean {
  return typeof entity.components['coin'] === 'object' && entity.components['coin'] !== null
}

/** Kills on contact — the spike, with its inset lethal zone (`tuning.ts`). */
export function isDeadly(entity: Entity): boolean {
  return typeof entity.components['deadly'] === 'object' && entity.components['deadly'] !== null
}

/** Touching wins — the flag, pole and banner alike. */
export function isGoal(entity: Entity): boolean {
  return typeof entity.components['goal'] === 'object' && entity.components['goal'] !== null
}

export interface Bonus {
  coins: number
  used: TextureRef | null
}

/** A ?-block: pays out on a head bump, then wears the used-block face. */
export function bonusOf(entity: Entity): Bonus | null {
  const component: unknown = entity.components['bonus']
  if (typeof component !== 'object' || component === null) return null
  const coins: unknown = (component as { coins?: unknown }).coins
  return {
    coins: typeof coins === 'number' && Number.isFinite(coins) && coins > 0 ? coins : 1,
    used: textureRefOf((component as { used?: unknown }).used),
  }
}

/** The two colours a collected coin sparkles in, alternating (§7). */
export interface Sparkle {
  cream: TextureRef
  gold: TextureRef
}

/** The sparkle art a coin carries, or null when it carries neither colour. */
export function sparkleOf(entity: Entity): Sparkle | null {
  const component: unknown = entity.components['coin']
  if (typeof component !== 'object' || component === null) return null
  const sparkle: unknown = (component as { sparkle?: unknown }).sparkle
  if (typeof sparkle !== 'object' || sparkle === null) return null
  const cream = textureRefOf((sparkle as { cream?: unknown }).cream)
  const gold = textureRefOf((sparkle as { gold?: unknown }).gold)
  return cream === null || gold === null ? null : { cream, gold }
}

/** The dust a breakable throws with its shards, or null when it carries none. */
export function dustOf(entity: Entity): TextureRef | null {
  const component: unknown = entity.components['breakable']
  if (typeof component !== 'object' || component === null) return null
  return textureRefOf((component as { dust?: unknown }).dust)
}

export interface Patroller {
  unitsPerSecond: number
  /** The art for the state this kind dies into: squashed for a walker, shell for a turtle. */
  stateTexture: TextureRef | null
  /** The colour this kind puffs when it is stomped or kicked. */
  puffTexture: TextureRef | null
  /** The darker colour it puffs when it is knocked out instead — a different burst (§4). */
  knockPuffTexture: TextureRef | null
}

/** The walker component, whole or not at all. */
export function walkerOf(entity: Entity): Patroller | null {
  return patrollerOf(entity.components['walker'], 'squashed')
}

/** The turtle component, whole or not at all. */
export function turtleOf(entity: Entity): Patroller | null {
  return patrollerOf(entity.components['turtle'], 'shell')
}

function patrollerOf(component: unknown, stateField: string): Patroller | null {
  if (typeof component !== 'object' || component === null) return null
  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
  return {
    unitsPerSecond: rate,
    stateTexture: textureRefOf((component as Record<string, unknown>)[stateField]),
    puffTexture: textureRefOf((component as { puff?: unknown }).puff),
    knockPuffTexture: textureRefOf((component as { knockPuff?: unknown }).knockPuff),
  }
}

/** The seven ninja frames the spawn marker carries, by name. */
export function playerFramesOf(entity: Entity): Record<string, TextureRef> | null {
  const component: unknown = entity.components['player']
  if (typeof component !== 'object' || component === null) return null
  const frames: unknown = (component as { frames?: unknown }).frames
  if (typeof frames !== 'object' || frames === null) return null

  const read: Record<string, TextureRef> = {}
  for (const [name, value] of Object.entries(frames as Record<string, unknown>)) {
    const ref = textureRefOf(value)
    if (ref !== null) read[name] = ref
  }
  return Object.keys(read).length > 0 ? read : null
}

/**
 * Dresses an entity in a texture — the one way any system changes what
 * something wears.
 *
 * Merged rather than replaced, because the sprite component can carry more
 * than a texture now: an entity that is halfway through fading (`fade` below)
 * and gets re-dressed would otherwise snap back to solid.
 */
export function wear(entity: Entity, texture: TextureRef): void {
  const standing = entity.components['sprite']
  const kept = typeof standing === 'object' && standing !== null ? standing : {}
  entity.components['sprite'] = { ...kept, texture: { id: texture.id, path: texture.path } }
}

/**
 * How solidly to draw this entity, 0 to 1 — the kernel's `opacity`
 * (`editor-kernel` D34), which is how anything in this game fades.
 */
export function fade(entity: Entity, opacity: number): void {
  const standing = entity.components['sprite']
  if (typeof standing !== 'object' || standing === null) return
  entity.components['sprite'] = { ...standing, opacity }
}

/** The texture an entity is wearing, for effects that shatter it into pieces of itself. */
export function worn(entity: Entity): TextureRef | null {
  return textureRefOf(entity.components['sprite'])
}
