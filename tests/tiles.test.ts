import { describe, expect, it } from 'vitest'

import { moveX, moveY, overlaps, solidAt, solidGrid } from '../src/systems/tiles'
import { floor, ground, playing, spawn } from './level'

/**
 * The collision arithmetic on its own: the solid map, the axis-separated
 * moves, and the exact-edge rule (touching is not colliding) everything above
 * it depends on.
 */

describe('the solid map', () => {
  it('holds the solid tiles by cell and knows the level\'s outer walls', () => {
    const grid = solidGrid(floor(0, 9))
    expect(solidAt(grid, 8, 8)).toBe(true)
    expect(solidAt(grid, 8, 24)).toBe(false)
    expect(grid.leftWall).toBe(0)
    expect(grid.rightWall).toBe(160)
  })

  it('ignores everything that is not solid', () => {
    const grid = solidGrid([spawn(1, 1)])
    expect(grid.cells.size).toBe(0)
  })
})

describe('moving against tiles', () => {
  const box = { x: 24, y: 16, width: 11, height: 14 }

  it('walks freely along a clear row', () => {
    const grid = solidGrid(floor(0, 9))
    expect(moveX(grid, box, 5)).toEqual({ x: 29, wall: 0 })
  })

  it('stops at a wall and says which side', () => {
    const grid = solidGrid([...floor(0, 9), ground(3, 1)])
    // The wall tile spans x 48..64; the hitbox is 11 wide, so its centre stops at 42.5.
    expect(moveX(grid, box, 30)).toEqual({ x: 42.5, wall: 1 })
  })

  it('stops at the level\'s outer wall even with no tile there', () => {
    const grid = solidGrid(floor(0, 9))
    expect(moveX(grid, { ...box, x: 8 }, -20)).toEqual({ x: 5.5, wall: -1 })
  })

  it('lands on a floor moving down', () => {
    const grid = solidGrid(floor(0, 9))
    const landed = moveY(grid, { ...box, y: 20 }, -8)
    expect(landed.y).toBe(16)
    expect(landed.floor).toBe(true)
  })

  it('reports the block the head hits moving up, nearest the centre first', () => {
    const grid = solidGrid([...floor(0, 9), ground(1, 3), ground(2, 3)])
    const bumped = moveY(grid, { ...box, y: 30 }, 6)
    expect(bumped.y).toBe(34)
    expect(bumped.ceiling[0]?.transform.x).toBe(24)
  })

  it('touching an edge exactly is not a collision', () => {
    const grid = solidGrid(floor(0, 9))
    // Standing exactly on the floor and moving nowhere: no clamp, no floor hit.
    expect(moveY(grid, box, 0).floor).toBe(false)
  })
})

describe('hitbox overlap', () => {
  it('overlaps on both axes or not at all, and touching does not count', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    expect(overlaps(a, { x: 8, y: 5, width: 10, height: 10 })).toBe(true)
    expect(overlaps(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false)
    expect(overlaps(a, { x: 0, y: 10, width: 10, height: 10 })).toBe(false)
  })
})

describe('a playing fixture settles', () => {
  it('drops the ninja onto the floor and holds it there', () => {
    const level = playing([...floor(0, 9), spawn(2, 1)])
    level.step(10)
    const marker = level.entities.find((one) => one.name === 'Spawn')
    // Feet on the floor top: sprite centre 6 above (16-tall sprite sunk 2).
    expect(marker?.transform.y).toBeCloseTo(22, 5)
    expect(marker?.transform.x).toBeCloseTo(40, 5)
  })
})
