import { heldIn, openDoor, pressedIn, sceneIn, type Entity, type System } from 'kernel-2d/runtime'

import { nextOf, wear, type TextureRef } from '../components/roles'
import { ninjaOf, playerIn } from './ninja'
import { HINT_FRAMES, OUCH_BANNER_FRAMES } from './tuning'

/**
 * The screen: the live coin count, the two banners, the controls hint — and R.
 *
 * Everything here is pinned to the screen through the kernel's `screen`
 * component (the first thing on this kernel that lives on the window rather
 * than in the world; the spec names exactly these three). The counter card
 * and the hint are *content*, placed by the author at their corners; what this
 * system adds at run time are the entities no author can place — the digits
 * of a number that changes, and banners that exist only while dying or won —
 * each pinned the same way and wearing textures the counter's prefab already
 * carries (game-content T4), so nothing is loaded mid-run.
 *
 * **R is a door to the same scene.** A restart is "everything back to authored
 * state", and the copy the runner made is exactly that; asking the host to
 * open this scene again throws the copy away and starts fresh. No reset code,
 * nothing to forget to reset — the same reason Stop is free.
 *
 * **The next level is a door to another scene, asked for on the win screen.**
 * A level that has somewhere to go says so with a `next` component naming the
 * scene — on the placed *next-level marker* (`prefabs/next-level.json`,
 * `game-content` T9) or on anything else the Inspector gave one. Whatever
 * carries it is hidden the moment play starts — its sprite goes, the way the
 * death blink hides the ninja — and once the ninja has won, the counter's
 * NEXT LEVEL? card is pinned under the LEVEL CLEAR! banner and Y (or Enter)
 * opens the named scene while N opens this one again, which is R by another
 * key. A level with no `next` never asks.
 */

interface HudArt {
  digits: Record<string, TextureRef>
  ouch: TextureRef | null
  clear: TextureRef | null
  /** The "NEXT LEVEL? Y YES N NO" card, pinned under the win banner when the level has somewhere to go. */
  next: TextureRef | null
}

/** The counter's prefab, read once per run: where the digits and banners come from. */
function hudArtOf(entity: Entity): HudArt | null {
  const component: unknown = entity.components['hud']
  if (typeof component !== 'object' || component === null) return null
  const { digits, banners } = component as { digits?: unknown; banners?: unknown }

  const read: Record<string, TextureRef> = {}
  if (typeof digits === 'object' && digits !== null) {
    for (const [name, value] of Object.entries(digits as Record<string, unknown>)) {
      const ref = textureOf(value)
      if (ref !== null) read[name] = ref
    }
  }
  const banner = (name: string): TextureRef | null =>
    typeof banners === 'object' && banners !== null ? textureOf((banners as Record<string, unknown>)[name]) : null

  return { digits: read, ouch: banner('ouch'), clear: banner('clear'), next: banner('next') }
}

function textureOf(value: unknown): TextureRef | null {
  if (typeof value !== 'object' || value === null) return null
  const texture: unknown = (value as { texture?: unknown }).texture
  if (typeof texture !== 'object' || texture === null) return null
  const { id, path } = texture as { id?: unknown; path?: unknown }
  return typeof id === 'string' && typeof path === 'string' ? { id, path } : null
}

const isHint = (entity: Entity): boolean =>
  typeof entity.components['hint'] === 'object' && entity.components['hint'] !== null

/** Digits are 4 units wide (3 of glyph, 1 of gap); the count is right-aligned inside the card. */
const DIGIT_ADVANCE = 4
/**
 * The counter card (30x12) sits 4 in from the top-right corner, so it spans
 * x -34..-4 and y -16..-4 from that corner. The rightmost digit's 4-wide
 * canvas ends 4 inside the card's right edge (centre -10); its 5-tall glyph
 * sits in the top five rows of a 6-tall canvas, so a centre of -11 lands the
 * glyph centred in the card's interior on whole units.
 */
const COUNTER_LAST_DIGIT_X = -10
const COUNTER_DIGIT_Y = -11
/**
 * The win banner (112x40) is centred; "COINS:" is drawn from 30 in on the
 * text row 18 down, ending at 53 in. The total starts two units after it —
 * first digit centre at +1 — on that same row: canvas top at 18 down from the
 * card's top edge (+20) is a centre of -1.
 */
const TOTAL_FIRST_DIGIT_X = 1
const TOTAL_DIGIT_Y = -1
/**
 * The next-level card (112x24) hangs 4 under the win banner's bottom edge
 * (-20), so its centre is 12 further down: -36.
 */
const PROMPT_Y = -36

/** The keys that answer the card: Y or Enter for the next level, N to play this one again. */
const NEXT_CODES = ['KeyY', 'Enter', 'NumpadEnter']
const AGAIN_CODES = ['KeyN']

/** The scene this level goes on to, or null when it has nowhere to go. */
export function nextIn(entities: readonly Entity[]): string | null {
  for (const one of entities) {
    const next = nextOf(one)
    if (next !== null) return next
  }
  return null
}

interface HudState {
  hintFrames: number
  hintGone: boolean
  ouchFrames: number
}

const states = new WeakMap<Entity, HudState>()

/**
 * A run-time HUD entity. Ids are stable per slot (`hud#digit0`, `hud#banner`)
 * rather than minted per step: the renderer matches drawn objects by id, so a
 * stable id is updated in place while a fresh one every step would destroy
 * and recreate a sprite sixty times a second.
 */
const pinned = (id: string, name: string, anchor: { x: number; y: number }, x: number, y: number, look: TextureRef): Entity => {
  const entity: Entity = {
    id: `hud#${id}`,
    name,
    transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
    components: { screen: { anchor: { x: anchor.x, y: anchor.y } } },
  }
  wear(entity, look)
  return entity
}

export const hudSystem: System = {
  id: 'hud',

  step: (entities, dtSeconds) => {
    const frames = dtSeconds * 60
    const counter = entities.find((one) => hudArtOf(one) !== null) ?? null
    if (counter === null) return
    const art = hudArtOf(counter)
    if (art === null) return

    let state = states.get(counter)
    if (state === undefined) {
      state = { hintFrames: 0, hintGone: false, ouchFrames: 0 }
      states.set(counter, state)
    }

    const marker = playerIn(entities)
    const ninja = marker === null ? null : ninjaOf(marker)
    const next = nextIn(entities)

    // The next-level marker is editor furniture: it stops being drawn the
    // moment play starts, the way the spawn marker becomes the ninja.
    for (const one of entities) {
      if (nextOf(one) !== null && one.components['sprite'] !== undefined) delete one.components['sprite']
    }

    // R restarts: a door back to this very scene, which the host answers by
    // reloading it — every block, coin and enemy back as authored.
    const pressed = pressedIn(entities)
    if (pressed.includes('KeyR')) {
      const here = sceneIn(entities)
      if (here !== null) openDoor(entities, here)
    }

    // The win screen's question, answered by key: Y goes on, N plays again.
    if (ninja?.won === true && next !== null) {
      if (NEXT_CODES.some((code) => pressed.includes(code))) openDoor(entities, next)
      else if (AGAIN_CODES.some((code) => pressed.includes(code))) {
        const here = sceneIn(entities)
        if (here !== null) openDoor(entities, here)
      }
    }

    // The hint fades on the first input or after nine seconds, whichever first.
    if (!state.hintGone) {
      state.hintFrames += frames
      const touched = heldIn(entities).length > 0 || pressedIn(entities).length > 0
      if (touched || state.hintFrames >= HINT_FRAMES) {
        state.hintGone = true
        for (let at = entities.length - 1; at >= 0; at -= 1) {
          const one = entities[at]
          if (one !== undefined && isHint(one)) entities.splice(at, 1)
        }
      }
    }

    // Everything this system drew last step goes, and is drawn again from the
    // facts: a HUD is a picture of state, and redrawing it whole every step is
    // what keeps it from ever being a step stale.
    for (let at = entities.length - 1; at >= 0; at -= 1) {
      const one = entities[at]
      if (one !== undefined && one.id.startsWith('hud#')) entities.splice(at, 1)
    }

    const coins = ninja?.coins ?? 0
    // The count, right-aligned in the card's digit slots.
    const text = String(coins)
    for (let i = 0; i < text.length; i += 1) {
      const look = art.digits[text[text.length - 1 - i] ?? '0']
      if (look === undefined) continue
      entities.push(
        pinned(`digit${i}`, 'Digit', { x: 1, y: 1 }, COUNTER_LAST_DIGIT_X - i * DIGIT_ADVANCE, COUNTER_DIGIT_Y, look),
      )
    }

    if (ninja === null) return

    // OUCH! for 0.7s of the death, then gone even if the timer is still running.
    if (ninja.dyingFrames !== null) state.ouchFrames += frames
    else state.ouchFrames = 0
    if (ninja.dyingFrames !== null && state.ouchFrames <= OUCH_BANNER_FRAMES && art.ouch !== null) {
      entities.push(pinned('banner', 'Banner', { x: 0.5, y: 0.5 }, 0, 0, art.ouch))
    }

    // LEVEL CLEAR!, with the coin total after "COINS:", persisting.
    if (ninja.won && art.clear !== null) {
      entities.push(pinned('banner', 'Banner', { x: 0.5, y: 0.5 }, 0, 0, art.clear))
      const total = String(coins)
      for (let i = 0; i < total.length; i += 1) {
        const look = art.digits[total[i] ?? '0']
        if (look === undefined) continue
        entities.push(
          pinned(`total${i}`, 'Total', { x: 0.5, y: 0.5 }, TOTAL_FIRST_DIGIT_X + i * DIGIT_ADVANCE, TOTAL_DIGIT_Y, look),
        )
      }
      // And the question, when this level has somewhere to go.
      if (next !== null && art.next !== null) {
        entities.push(pinned('prompt', 'Next level?', { x: 0.5, y: 0.5 }, 0, PROMPT_Y, art.next))
      }
    }
  },
}
