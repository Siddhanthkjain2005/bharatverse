/**
 * Plinth solver.
 *
 * A plinth is solid stone but it is not a solid block: its perimeter is cut open
 * wherever a flight of steps climbs it, which is what makes the flight a route
 * rather than an ornament stuck to a cliff face. The openings are carved by the
 * same span solver that cuts doorways into walls.
 *
 * One generator feeds three consumers — the rendered stone, the walkable
 * surfaces and the collision mass — so the stone the visitor sees is the stone
 * that stops them, and the gap they see is the gap they can climb.
 */

import type { Side, StepRun, WorldSpace } from './model'
import { APRON, COURT_APRON } from './routes'
import { stairGap } from './steps'
import { subtractSpans } from './walls'

export interface PlinthBlock {
  cx: number
  cz: number
  w: number
  d: number
  /** Outward face of this piece; null for the room footprint itself. */
  side: Side | null
}

export interface PlinthSolution {
  /** Depth of the walkable margin around the room footprint. */
  apron: number
  /** True when the plinth stands high enough to be an obstacle in its own right. */
  solid: boolean
  /** The room footprint. */
  core: PlinthBlock
  /** Apron pieces around the footprint, cut open at every flight of steps. */
  bands: PlinthBlock[]
}

const SIDES: Side[] = ['NZ', 'PZ', 'NX', 'PX']

export function apronFor(space: WorldSpace): number {
  return space.role === 'COURT' ? COURT_APRON : APRON
}

/** Groups step runs by the space whose plinth they climb. */
export function runsBySpace(runs: StepRun[]): Map<string, StepRun[]> {
  const out = new Map<string, StepRun[]>()
  for (const r of runs) {
    const list = out.get(r.spaceId)
    if (list) list.push(r)
    else out.set(r.spaceId, [r])
  }
  return out
}

export function solvePlinth(space: WorldSpace, runs: StepRun[]): PlinthSolution {
  const apron = apronFor(space)
  const { rect } = space
  const minX = rect.cx - rect.w / 2 - apron
  const maxX = rect.cx + rect.w / 2 + apron
  const minZ = rect.cz - rect.d / 2 - apron
  const maxZ = rect.cz + rect.d / 2 + apron
  const bands: PlinthBlock[] = []

  for (const side of SIDES) {
    const alongX = side === 'NZ' || side === 'PZ'
    // Corners belong to the x-running bands, so a gap cut into a z-running band
    // is a genuine opening and not an opening with mass left behind it.
    const from = alongX ? minX : minZ + apron
    const to = alongX ? maxX : maxZ - apron
    if (to - from < 0.3) continue

    const gaps = runs
      .filter((r) => r.side === side)
      .map((r) => {
        const g = stairGap(r)
        return [g.from, g.to] as [number, number]
      })
    const fixed = alongX
      ? (side === 'NZ' ? minZ : maxZ - apron) + apron / 2
      : (side === 'NX' ? minX : maxX - apron) + apron / 2

    for (const [a, b] of subtractSpans(from, to, gaps)) {
      bands.push({
        cx: alongX ? (a + b) / 2 : fixed,
        cz: alongX ? fixed : (a + b) / 2,
        w: alongX ? b - a : apron,
        d: alongX ? apron : b - a,
        side,
      })
    }
  }

  return {
    apron,
    solid: space.floorY > 0.45,
    core: { cx: rect.cx, cz: rect.cz, w: rect.w, d: rect.d, side: null },
    bands,
  }
}
