import type { Entity } from 'kernel-2d/runtime'

import { isSolid } from '../components/roles'
import { TILE } from './tuning'

/**
 * The level as a grid of solids, and axis-separated movement against it.
 *
 * The reference resolves collision one axis at a time — move x, resolve; move
 * y, resolve — against the solid set only, and that shape is kept exactly:
 * it is what makes sliding along a wall and landing on a ledge corner feel the
 * way the reference feels. Everything here is arithmetic over a map built from
 * the entities each step, so a brick removed by a head bump stops colliding on
 * the very next step with nothing invalidated.
 *
 * A hitbox is carried as its centre x and its *bottom* y — the pair every rule
 * in the parity doc is phrased around (feet on floors, feet near enemy tops).
 */

export interface Hitbox {
  /** Centre, scene x. */
  x: number
  /** The feet: the bottom edge, scene y. */
  y: number
  width: number
  height: number
}

export interface SolidGrid {
  /** Solid entities by cell, keyed `column,row` of tile-sized cells. */
  cells: Map<string, Entity>
  /** The level's side walls: the outermost solid columns, as scene x edges. */
  leftWall: number
  rightWall: number
}

const keyOf = (column: number, row: number): string => `${column},${row}`

/** The solids as they stand this step. Tiles sit at cell centres on the 16-grid. */
export function solidGrid(entities: readonly Entity[]): SolidGrid {
  const cells = new Map<string, Entity>()
  let leftmost = Number.POSITIVE_INFINITY
  let rightmost = Number.NEGATIVE_INFINITY

  for (const entity of entities) {
    if (!isSolid(entity)) continue
    const column = Math.round((entity.transform.x - TILE / 2) / TILE)
    const row = Math.round((entity.transform.y - TILE / 2) / TILE)
    cells.set(keyOf(column, row), entity)
    if (column < leftmost) leftmost = column
    if (column > rightmost) rightmost = column
  }

  return {
    cells,
    leftWall: cells.size === 0 ? Number.NEGATIVE_INFINITY : leftmost * TILE,
    rightWall: cells.size === 0 ? Number.POSITIVE_INFINITY : (rightmost + 1) * TILE,
  }
}

/** Is there a solid under this scene point? */
export function solidAt(grid: SolidGrid, x: number, y: number): boolean {
  return grid.cells.has(keyOf(Math.floor(x / TILE), Math.floor(y / TILE)))
}

/** The cell indices a span [min, max) overlaps. Exact edges touch nothing. */
function cellsAcross(min: number, max: number): number[] {
  const from = Math.floor(min / TILE)
  const to = Math.ceil(max / TILE) - 1
  const cells: number[] = []
  for (let at = from; at <= to; at += 1) cells.push(at)
  return cells
}

export interface MovedX {
  x: number
  /** −1 hit a wall on the left, 1 on the right, 0 clear. */
  wall: -1 | 0 | 1
}

/** Moves the hitbox horizontally, stopped by solids and by the level's side walls. */
export function moveX(grid: SolidGrid, box: Hitbox, dx: number): MovedX {
  let x = box.x + dx
  let wall: -1 | 0 | 1 = 0
  const half = box.width / 2

  // The level's outer walls first, so a level whose edge columns are ground
  // behaves exactly as the reference's "side edges solid" does.
  if (x - half < grid.leftWall) {
    x = grid.leftWall + half
    wall = -1
  }
  if (x + half > grid.rightWall) {
    x = grid.rightWall - half
    wall = 1
  }

  const rows = cellsAcross(box.y, box.y + box.height)
  if (dx > 0) {
    const leading = x + half
    for (const row of rows) {
      for (const column of cellsAcross(box.x + half, leading)) {
        if (!grid.cells.has(keyOf(column, row))) continue
        const edge = column * TILE
        if (leading > edge && box.x + half <= edge) {
          x = edge - half
          wall = 1
        }
      }
    }
  } else if (dx < 0) {
    const leading = x - half
    for (const row of rows) {
      for (const column of cellsAcross(leading, box.x - half)) {
        if (!grid.cells.has(keyOf(column, row))) continue
        const edge = (column + 1) * TILE
        if (leading < edge && box.x - half >= edge) {
          x = edge + half
          wall = -1
        }
      }
    }
  }

  return { x, wall }
}

export interface MovedY {
  y: number
  /** Landed on something this move. */
  floor: boolean
  /** The solids the head hit moving up — the bump targets, nearest first. */
  ceiling: Entity[]
}

/** Moves the hitbox vertically. Up is positive, exactly as the scene has it. */
export function moveY(grid: SolidGrid, box: Hitbox, dy: number): MovedY {
  let y = box.y + dy
  let floor = false
  const ceiling: Entity[] = []
  const half = box.width / 2
  const columns = cellsAcross(box.x - half, box.x + half)

  if (dy < 0) {
    for (const column of columns) {
      for (const row of cellsAcross(y, box.y)) {
        if (!grid.cells.has(keyOf(column, row))) continue
        const top = (row + 1) * TILE
        if (y < top && box.y >= top) {
          y = top
          floor = true
        }
      }
    }
  } else if (dy > 0) {
    const head = y + box.height
    for (const column of columns) {
      for (const row of cellsAcross(box.y + box.height, head)) {
        const hit = grid.cells.get(keyOf(column, row))
        if (hit === undefined) continue
        const underside = row * TILE
        if (head > underside && box.y + box.height <= underside) {
          y = underside - box.height
          if (!ceiling.includes(hit)) ceiling.push(hit)
        }
      }
    }
    // The reference bumps the one block over the player's head; when the head
    // clips two, the one nearer the player's centre is the one that was meant.
    ceiling.sort((a, b) => Math.abs(a.transform.x - box.x) - Math.abs(b.transform.x - box.x))
  }

  return { y, floor, ceiling }
}

/** Do two hitboxes overlap? Touching edges do not count, matching the tile rule. */
export function overlaps(a: Hitbox, b: Hitbox): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  )
}
