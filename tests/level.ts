import { inputEntity, stepSystems, writeInput, type Entity } from 'kernel-2d/runtime'

import { systems } from '../src/systems/index'
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
    breakable: {},
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
  return entity('Coin', at.x, at.y, { sprite: art('coin.png'), grid: { tileSize: TILE }, coin: {} })
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
    walker: { unitsPerSecond, squashed: art('walker-squashed.png') },
  })
}

export function turtle(column: number, row: number, unitsPerSecond = 30): Entity {
  const at = centre(column, row)
  return entity('Turtle', at.x, at.y, {
    sprite: art('turtle.png'),
    grid: { tileSize: TILE },
    turtle: { unitsPerSecond, shell: art('shell.png') },
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
  step: (steps?: number, held?: readonly string[]) => void
}

export function playing(entities: Entity[]): Playing {
  const carrier = inputEntity()
  entities.push(carrier)
  return {
    entities,
    step: (steps = 1, held = []) => {
      for (let at = 0; at < steps; at += 1) {
        writeInput(carrier, { pressed: [], clicked: [], held })
        stepSystems(systems, entities, 1 / 60)
      }
    },
  }
}
