/**
 * Wall solver.
 *
 * Each documented space becomes a rectangular enclosure whose walls are cut by
 * the openings the room graph implies. The solid spans are returned as boxes so
 * the renderer and the collision world are generated from exactly the same
 * numbers — a doorway you can see through is a doorway you can walk through.
 */

import type { Doorway, Side, WallSeg, WorldSpace } from './model'

export interface Gap {
  side: Side
  /** Centre along the wall run's own axis, world metres. */
  center: number
  w: number
  h: number
}

/**
 * Solid spans of a run between `start` and `end` once the gaps are cut out.
 * Shared with the plinth solver, so the opening a flight of steps needs in a
 * plinth perimeter is carved by exactly the code that carves doorways in walls.
 */
export function subtractSpans(start: number, end: number, gaps: [number, number][]): [number, number][] {
  let spans: [number, number][] = [[start, end]]
  for (const [gs, ge] of gaps) {
    const next: [number, number][] = []
    for (const [s, e] of spans) {
      if (ge <= s || gs >= e) {
        next.push([s, e])
        continue
      }
      if (gs > s) next.push([s, gs])
      if (ge < e) next.push([ge, e])
    }
    spans = next
  }
  return spans.filter(([s, e]) => e - s > 0.3)
}

const SIDES: Side[] = ['NZ', 'PZ', 'NX', 'PX']

export interface WallSolution {
  walls: WallSeg[]
  lintels: WallSeg[]
  doorways: Doorway[]
}

/** Clamps an opening so it cannot run off the end of its wall. */
export function clampGap(space: WorldSpace, side: Side, center: number, w: number): number {
  const alongX = side === 'NZ' || side === 'PZ'
  const half = (alongX ? space.rect.w : space.rect.d) / 2
  const axis = alongX ? space.rect.cx : space.rect.cz
  const lo = axis - half + w / 2 + 0.7
  const hi = axis + half - w / 2 - 0.7
  if (hi <= lo) return axis
  return Math.min(Math.max(center, lo), hi)
}

export function solveWalls(space: WorldSpace, gaps: Gap[], wallT: number): WallSolution {
  const walls: WallSeg[] = []
  const lintels: WallSeg[] = []
  const doorways: Doorway[] = []
  const { rect, wallH, floorY } = space
  const parapet = !space.roofed && space.role !== 'GATE'

  for (const side of SIDES) {
    const alongX = side === 'NZ' || side === 'PZ'
    const mine = gaps.filter((g) => g.side === side)
    const start = alongX ? rect.cx - rect.w / 2 : rect.cz - rect.d / 2
    const end = alongX ? rect.cx + rect.w / 2 : rect.cz + rect.d / 2
    const fixed = alongX
      ? rect.cz + (side === 'NZ' ? -rect.d / 2 : rect.d / 2)
      : rect.cx + (side === 'NX' ? -rect.w / 2 : rect.w / 2)

    const ranges: [number, number][] = mine.map((g) => {
      const c = clampGap(space, side, g.center, g.w)
      return [c - g.w / 2, c + g.w / 2]
    })

    for (const [s, e] of subtractSpans(start, end, ranges)) {
      walls.push({
        x: alongX ? (s + e) / 2 : fixed,
        z: alongX ? fixed : (s + e) / 2,
        w: alongX ? e - s : wallT,
        d: alongX ? wallT : e - s,
        h: wallH,
        y: floorY + wallH / 2,
        kind: parapet ? 'PARAPET' : 'WALL',
        spaceId: space.space.id,
      })
    }

    for (let i = 0; i < mine.length; i++) {
      const g = mine[i]
      const [gs, ge] = ranges[i]
      // An open enclosure's opening runs the full height of its parapet: a lintel
      // across a garden gate would be an invisible bar the visitor walks into.
      const doorH = space.roofed ? Math.min(g.h, wallH - 0.5) : wallH
      if (wallH - doorH > 0.25) {
        lintels.push({
          x: alongX ? (gs + ge) / 2 : fixed,
          z: alongX ? fixed : (gs + ge) / 2,
          w: alongX ? ge - gs : wallT,
          d: alongX ? wallT : ge - gs,
          h: wallH - doorH,
          y: floorY + wallH - (wallH - doorH) / 2,
          kind: 'LINTEL',
          spaceId: space.space.id,
        })
      }
      doorways.push({
        x: alongX ? (gs + ge) / 2 : fixed,
        z: alongX ? fixed : (gs + ge) / 2,
        alongX,
        w: ge - gs,
        h: doorH,
        sill: floorY,
        spaceId: space.space.id,
      })
    }
  }

  return { walls, lintels, doorways }
}
