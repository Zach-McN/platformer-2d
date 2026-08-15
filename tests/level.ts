import { SOUND_ENTITY_ID, inputEntity, soundIn, stepSystems, storyEntity, writeInput, type Entity } from 'kernel-2d/runtime'

import { systems } from '../src/systems/index'
import { RECIPES, type SoundName } from '../src/systems/sound'
import { TILE } from '../src/systems/tuning'

/**
 * Levels to test against, built the way a level is built (`genre-spinup` S5):
 * entity lists, never files. A system is handed the entities of a running
 * level and nothing else, so a fixture that went through JSON would be testing
 * the kernel's loader on the way past.
 *
 * Cells are named the scene's way — y-up, tile centres on the 16-grid — and
 * the helpers hand back exactly what the generated prefabs put on entities
 * (game-content T1), with made-up texture ids: no system reads a texture's
 * bytes, only its reference.
 */

export { TILE }

/** The centre of a cell, scene units, y-up. */
export function centre(column: number, row: number): { x: number; y: number } {
  return { x: column * TILE + TILE / 2, y: row * TILE + TILE / 2 }
}

let minted = 0

export function entity(name: string, x: number, y: number, components: Record<string, unknown>): Entity {
  minted += 1
  return {
    id: `${name}#${minted}`,
    name,
    transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
    components,
  }
}

const art = (path: string): { texture: { id: string; path: string } } => ({
  texture: { id: `id-${path}`, path },
})

/** One ground tile: solid, on the grid. */
export function ground(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Ground', at.x, at.y, { sprite: art('ground.png'), grid: { tileSize: TILE }, solid: {} })
}

/** A run of ground along one row. */
export function floor(fromColumn: number, toColumn: number, row = 0): Entity[] {
  const tiles: Entity[] = []
  for (let column = fromColumn; column <= toColumn; column += 1) tiles.push(ground(column, row))
  return tiles
}

export function brick(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Brick', at.x, at.y, {
    sprite: art('brick.png'),
    grid: { tileSize: TILE },
    solid: {},
    breakable: { dust: art('fx/dust-brick.png') },
  })
}

export function questBlock(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('? Block', at.x, at.y, {
    sprite: art('quest.png'),
    grid: { tileSize: TILE },
    solid: {},
    bonus: { coins: 1, used: art('used.png') },
  })
}

export function coin(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Coin', at.x, at.y, {
    sprite: art('coin.png'),
    grid: { tileSize: TILE },
    coin: {
      sparkle: { cream: art('fx/sparkle-cream.png'), gold: art('fx/sparkle-gold.png') },
      flash: art('fx/coin-flash.png'),
    },
  })
}

export function spike(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Spike', at.x, at.y, { sprite: art('spike.png'), grid: { tileSize: TILE }, deadly: {} })
}

export function flag(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Flag', at.x, at.y, { sprite: art('flag.png'), grid: { tileSize: TILE }, goal: {} })
}

/** The spawn marker, carrying the ninja's seven frames as the prefab does. */
export function spawn(column: number, row: number): Entity {
  const at = centre(column, row)
  return entity('Spawn', at.x, at.y, {
    sprite: art('spawn.png'),
    grid: { tileSize: TILE },
    spawn: {},
    player: {
      frames: {
        idle: art('ninja/idle.png'),
        walk0: art('ninja/walk-0.png'),
        walk1: art('ninja/walk-1.png'),
        walk2: art('ninja/walk-2.png'),
        walk3: art('ninja/walk-3.png'),
        jump: art('ninja/jump.png'),
        fall: art('ninja/fall.png'),
      },
    },
  })
}

export function walker(column: number, row: number, unitsPerSecond = 33): Entity {
  const at = centre(column, row)
  return entity('Walker', at.x, at.y, {
    sprite: art('walker.png'),
    grid: { tileSize: TILE },
    walker: {
      unitsPerSecond,
      squashed: art('walker-squashed.png'),
      puff: art('fx/puff-walker.png'),
      knockPuff: art('fx/puff-knock-walker.png'),
    },
  })
}

export function turtle(column: number, row: number, unitsPerSecond = 30): Entity {
  const at = centre(column, row)
  return entity('Turtle', at.x, at.y, {
    sprite: art('turtle.png'),
    grid: { tileSize: TILE },
    turtle: {
      unitsPerSecond,
      shell: art('shell.png'),
      puff: art('fx/puff-turtle.png'),
      knockPuff: art('fx/puff-knock-turtle.png'),
    },
  })
}

/** The coin counter card, pinned top-right, carrying the digits and banners as the prefab does. */
export function counter(): Entity {
  const digits: Record<string, unknown> = {}
  for (let d = 0; d <= 9; d += 1) digits[String(d)] = art(`ui/digit-${d}.png`)
  return entity('Coin counter', -19, -10, {
    sprite: art('ui/coin-card.png'),
    grid: { tileSize: TILE },
    screen: { anchor: { x: 1, y: 1 } },
    hud: { digits, banners: { ouch: art('ui/banner-ouch.png'), clear: art('ui/banner-clear.png') } },
  })
}

/** The controls hint, pinned bottom-left. */
export function hint(): Entity {
  return entity('Controls hint', 46, 24, {
    sprite: art('ui/hint.png'),
    grid: { tileSize: TILE },
    screen: { anchor: { x: 0, y: 0 } },
    hint: {},
  })
}

/**
 * A running level in miniature: the fixture list plus the input carrier,
 * stepped at the fixed rate with the held keys written the way the runner
 * writes them. `held` may vary by step, which is how a test releases the jump
 * key mid-rise or taps a direction.
 */
export interface Playing {
  entities: Entity[]
  step: (steps?: number, held?: readonly string[], pressed?: readonly string[]) => void
}

/** The scene path the story carrier says this fixture is, for a test that presses R. */
export const FIXTURE_SCENE = 'scenes/fixture.json'

/**
 * Every sound asked for since this was last called, by name — and it empties
 * the queue on the way past.
 *
 * The fixture playing the runner's part, exactly as `playing` writes input the
 * way the runner writes it: a real host takes the queue on every frame it
 * draws, so a test that never emptied it would be reading the whole run's
 * noises at once. Cues come back as §8 names by matching the recipes, which
 * also means a recipe edited away from the doc stops matching and the test
 * that named it says so.
 */
export function heard(level: Playing): SoundName[] {
  const names = soundIn(level.entities).map(nameOfCue)
  const carrier = level.entities.find((one) => one.id === SOUND_ENTITY_ID)
  if (carrier !== undefined) carrier.components['sound'] = { cues: [] }
  return names
}

interface PlayedNote {
  from: number
  to: number
  seconds: number
  wave: string
  volume: number
  delay?: number
}

function nameOfCue(cue: readonly PlayedNote[]): SoundName {
  for (const [name, recipe] of Object.entries(RECIPES)) {
    if (recipe.length !== cue.length) continue
    const same = recipe.every((note, at) => {
      const played = cue[at]
      if (played === undefined) return false
      return (
        note.from === played.from &&
        note.to === played.to &&
        note.seconds === played.seconds &&
        note.wave === played.wave &&
        note.volume === played.volume &&
        (note.delay ?? 0) === (played.delay ?? 0)
      )
    })
    if (same) return name as SoundName
  }
  throw new Error(`a cue was played that is in no recipe: ${JSON.stringify(cue)}`)
}

export function playing(entities: Entity[]): Playing {
  const carrier = inputEntity()
  entities.push(carrier)
  entities.push(storyEntity(FIXTURE_SCENE))
  return {
    entities,
    step: (steps = 1, held = [], pressed = []) => {
      for (let at = 0; at < steps; at += 1) {
        // A press belongs to one step, exactly as the runner hands it out.
        writeInput(carrier, { pressed: at === 0 ? pressed : [], clicked: [], held })
        stepSystems(systems, entities, 1 / 60)
      }
    },
  }
}
