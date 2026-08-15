import { factOf, learn, playSound, pressedIn, type Entity, type SoundCue, type System } from 'kernel-2d/runtime'

/**
 * The game's seven noises, and the mute that silences them.
 *
 * `docs/REMAKE-PARITY.md` §8 is a table of notes, and this file is that table —
 * the same relationship `tuning.ts` has to §1–§7, without the arithmetic: Hz
 * are Hz and seconds are seconds in both the reference and the kernel, so
 * nothing is converted and nothing can be converted wrongly. The rule is
 * `game-code` C1's all the same — **a frequency or a duration appearing
 * anywhere else in `src/` is a defect**, and changing how something sounds
 * means changing the doc first.
 *
 * A cue reaches the speaker through the kernel's sound seam
 * (`kernel-2d/runtime/game/sound.ts`): the game says which notes, the host
 * synthesizes them. Nothing here knows what an audio context is, which is why
 * every one of these is asserted in plain Node.
 *
 * **Mute is a fact, not a variable** (`kernel-2d/runtime/game/story.ts`).
 * The reference keeps `soundOn` in a module variable, which survives its R
 * restart because nothing reloads; here R reloads the whole scene
 * (`game-code` C8), so a variable — or a WeakMap beside the level — would be
 * un-muted by the very key that restarts. A fact survives, because surviving a
 * run is the whole of what a fact is for. It also outlives the tab, which the
 * reference does not do: a sound setting that stays set is the ordinary
 * behaviour of a game, and the alternative is losing it every restart.
 *
 * A run with no story carrier — a fixture that built none — cannot remember
 * being muted, so it plays everything. That is the component-reader rule
 * again: absent means absent, never a throw.
 */

export type SoundName = 'jump' | 'coin' | 'bump' | 'break' | 'stomp' | 'hurt' | 'win'

/** The fact mute sleeps in. Flat and boolean, like every other. */
export const MUTED_FACT = 'muted'

/** The key that toggles it, and the only key this system reads. */
const MUTE_CODE = 'KeyM'

/**
 * §8, note for note. Every line is the doc's row: from Hz, to Hz, seconds,
 * wave, volume, and the delay that makes a chord out of two notes.
 */
export const RECIPES: Record<SoundName, SoundCue> = {
  // square 200→640, 0.16 s, vol 0.10
  jump: [{ from: 200, to: 640, seconds: 0.16, wave: 'square', volume: 0.1 }],

  // square 988, 0.07 s, 0.10; then square 1319, 0.22 s, 0.10 at +0.07 s
  coin: [
    { from: 988, to: 988, seconds: 0.07, wave: 'square', volume: 0.1 },
    { from: 1319, to: 1319, seconds: 0.22, wave: 'square', volume: 0.1, delay: 0.07 },
  ],

  // square 130→60, 0.09 s, 0.16
  bump: [{ from: 130, to: 60, seconds: 0.09, wave: 'square', volume: 0.16 }],

  // saw 320→55, 0.14 s, 0.14 + square 700→120, 0.08 s, 0.08
  break: [
    { from: 320, to: 55, seconds: 0.14, wave: 'sawtooth', volume: 0.14 },
    { from: 700, to: 120, seconds: 0.08, wave: 'square', volume: 0.08 },
  ],

  // square 420→80, 0.11 s, 0.15
  stomp: [{ from: 420, to: 80, seconds: 0.11, wave: 'square', volume: 0.15 }],

  // saw 520→85, 0.38 s, 0.12
  hurt: [{ from: 520, to: 85, seconds: 0.38, wave: 'sawtooth', volume: 0.12 }],

  // squares 523, 659, 784, 1047 — 0.15 s each, 0.10 vol, 0.12 s apart
  win: [
    { from: 523, to: 523, seconds: 0.15, wave: 'square', volume: 0.1 },
    { from: 659, to: 659, seconds: 0.15, wave: 'square', volume: 0.1, delay: 0.12 },
    { from: 784, to: 784, seconds: 0.15, wave: 'square', volume: 0.1, delay: 0.24 },
    { from: 1047, to: 1047, seconds: 0.15, wave: 'square', volume: 0.1, delay: 0.36 },
  ],
}

/** Whether this game is muted right now. */
export function isMuted(entities: readonly Entity[]): boolean {
  return factOf(entities, MUTED_FACT) === true
}

/**
 * Makes one of the seven noises — or does not, if the game is muted.
 *
 * The mute check is here rather than in the host because muting is a fact
 * about the game (see above), and a silenced game is one that never asks. Every
 * rule in `src/` calls this and none of them has to remember.
 */
export function sound(entities: Entity[], name: SoundName): void {
  if (isMuted(entities)) return
  playSound(entities, RECIPES[name])
}

/**
 * M, and nothing else.
 *
 * First in the run order, so an unmute's confirming coin is queued before
 * whatever else this step makes a noise about — the reference plays it the
 * instant the key is read. Unmuting confirms with the coin; muting is
 * confirmed by the silence.
 */
export const soundSystem: System = {
  id: 'sound',

  step: (entities) => {
    if (!pressedIn(entities).includes(MUTE_CODE)) return
    const muting = !isMuted(entities)
    learn(entities, MUTED_FACT, muting)
    if (!muting) sound(entities, 'coin')
  },
}
