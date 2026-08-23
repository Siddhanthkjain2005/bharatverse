/**
 * Step geometry.
 *
 * One generator, used by the collision world and by the renderer, so the tread a
 * visitor sees is the tread they stand on. A flight descends from the plinth edge
 * across the apron — which is also where the plinth's perimeter is left open — and
 * projects further out when the level change is too large to climb inside it.
 */

import type { Side, StepRun } from './model'

export interface Tread {
  cx: number
  cz: number
  w: number
  d: number
  top: number
}

export function sideVector(side: Side): [number, number] {
  switch (side) {
    case 'PZ': return [0, 1]
    case 'NZ': return [0, -1]
    case 'PX': return [1, 0]
    default: return [-1, 0]
  }
}

export function treadsFor(run: StepRun): Tread[] {
  const [nx, nz] = sideVector(run.side)
  const out: Tread[] = []
  // Treads tile the apron from the threshold outward. The flight starts flush
  // with the plinth edge, because the plinth's own perimeter is cut away over
  // exactly this span — leave a margin and the visitor steps into a hole.
  const span = Math.max(1.2, run.span)
  const depth = span / run.count
  for (let i = 0; i < run.count; i++) {
    // i = 0 is the lowest tread, furthest from the plinth.
    const top = run.from + ((run.to - run.from) * (i + 1)) / run.count
    const dist = span - (i + 0.5) * depth
    const cx = run.x + nx * dist
    const cz = run.z + nz * dist
    out.push({
      cx,
      cz,
      w: nz !== 0 ? run.w : depth,
      d: nz !== 0 ? depth : run.w,
      top,
    })
  }
  return out
}

/** Opening left in a plinth's perimeter so its flight of steps is usable. */
export function stairGap(run: StepRun): { side: Side; from: number; to: number } {
  const alongX = run.side === 'NZ' || run.side === 'PZ'
  const centre = alongX ? run.x : run.z
  return { side: run.side, from: centre - run.w / 2, to: centre + run.w / 2 }
}
