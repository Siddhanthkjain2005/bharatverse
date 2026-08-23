/**
 * Routes, thresholds and portals.
 *
 * Every parent/child link in the documented room graph becomes something the
 * visitor can actually traverse: an opening in a wall, a flight of steps where
 * the floor level changes, a paved path where the two spaces are not touching,
 * and a portal prompt where the threshold crosses from outside to inside.
 */

import type { PlannedSpace } from './plan'
import type { ArchSpec } from './specs'
import { clampGap, type Gap } from './walls'
import {
  sideNormal,
  sideToward,
  yawAlong,
  type Clearway,
  type PathSeg,
  type Portal,
  type Side,
  type StepRun,
  type WorldSpace,
} from './model'

export interface RouteResult {
  gaps: Map<string, Gap[]>
  paths: PathSeg[]
  steps: StepRun[]
  portals: Portal[]
  doorSide: Map<string, Side>
  clearways: Clearway[]
}

const PATH_W = 3.4
/** Half-width of a walking lane: the walker's radius plus a little slack. */
const LANE = 0.98
/**
 * Steepest flight the walker can actually climb.
 *
 * The walker steps up 0.62 m and is 0.72 m wide. Climbing a flight, its body
 * reaches over the plinth edge one radius before its feet get there, so the mass
 * behind the edge has to be within step-up by then: the whole flight is usable
 * only while rise/run stays under step-up over radius. Anything steeper is a wall
 * with decoration on it, however finely the risers are divided, which is why a
 * flight lengthens instead of steepening when a level change is large.
 */
const MAX_SLOPE = 0.78
/** Must match the apron used when the plinth is built. */
export const APRON = 2.8
/** Courts sit almost at grade, so their edge band is a kerb rather than a plinth. */
export const COURT_APRON = 0.8

function asWorldSpace(p: PlannedSpace, spec: ArchSpec, doorSide: Side): WorldSpace {
  return {
    space: p.space,
    rect: p.rect,
    role: p.role,
    floorY: spec.floorY[p.role],
    wallH: spec.wallH[p.role],
    roofed: p.roofed,
    columns: p.columns,
    doorSide,
    depth: p.depth,
    evidenceClass: p.evidenceClass,
  }
}

/**
 * Straight or L-shaped paved link between two thresholds.
 *
 * The first leg always sets off along the threshold's own normal. A lane that
 * left sideways would run along the face it had just stepped out of and straight
 * through that space's plinth apron — paving laid across solid stone, with the
 * flight of steps it was meant to reach stranded on the other side.
 */
function pathBetween(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  y: number,
  /** The near threshold faces along z, so the lane leaves that way. */
  alongZ: boolean,
): PathSeg[] {
  const dx = bx - ax
  const dz = bz - az
  const legZ = (x: number): PathSeg => ({ x, z: (az + bz) / 2, w: PATH_W, d: Math.abs(dz) + PATH_W, y })
  const legX = (z: number): PathSeg => ({ x: (ax + bx) / 2, z, w: Math.abs(dx) + PATH_W, d: PATH_W, y })
  // Out along the normal, then across on the far threshold's own axis, so both
  // ends of the lane meet their doorway square on.
  if (alongZ) return Math.abs(dx) < 1.2 ? [legZ(ax)] : [legZ(ax), legX(bz)]
  return Math.abs(dz) < 1.2 ? [legX(az)] : [legX(az), legZ(bx)]
}

export function solveRoutes(planned: PlannedSpace[], spec: ArchSpec): RouteResult {
  const byId = new Map(planned.map((p) => [p.space.id, p]))
  const gaps = new Map<string, Gap[]>()
  const paths: PathSeg[] = []
  const steps: StepRun[] = []
  const portals: Portal[] = []
  const doorSide = new Map<string, Side>()
  const clearways: Clearway[] = []

  /**
   * The lane through an opening runs from well inside the space, across the
   * threshold, and out onto the approach — a doorway is only a route if both
   * sides of it are clear, and the space beyond a threshold is usually the space
   * whose own columns would stand in the way.
   */
  const lane = (x: number, z: number, nx: number, nz: number, inward: number, outward: number) => {
    const acrossX = nz !== 0
    const mid = (outward - inward) / 2
    clearways.push({
      rect: {
        cx: x + nx * mid,
        cz: z + nz * mid,
        w: acrossX ? LANE * 2 : inward + outward,
        d: acrossX ? inward + outward : LANE * 2,
      },
      across: acrossX ? 'x' : 'z',
    })
  }

  const push = (id: string, gap: Gap) => {
    const list = gaps.get(id)
    if (list) list.push(gap)
    else gaps.set(id, [gap])
  }

  const openingFor = (p: PlannedSpace) =>
    p.roofed
      ? { w: spec.door.w, h: spec.door.h }
      : { w: Math.min(spec.door.w * 2.4, Math.min(p.rect.w, p.rect.d) * 0.5), h: 9 }

  for (const child of planned) {
    const parent = child.space.parentId ? byId.get(child.space.parentId) : undefined
    const target = parent?.rect ?? { cx: child.rect.cx, cz: child.rect.cz + 40, w: 4, d: 4 }
    const sideC = sideToward(child.rect, target)
    const sideP = parent ? sideToward(parent.rect, child.rect) : null
    doorSide.set(child.space.id, sideC)

    const alongX = sideC === 'NZ' || sideC === 'PZ'
    const mid = alongX ? (child.rect.cx + target.cx) / 2 : (child.rect.cz + target.cz) / 2

    const oc = openingFor(child)
    const cSpace = asWorldSpace(child, spec, sideC)
    const cCenter = clampGap(cSpace, sideC, mid, oc.w)
    push(child.space.id, { side: sideC, center: cCenter, w: oc.w, h: Math.min(oc.h, cSpace.wallH - 0.5) })

    let pCenter = cCenter
    if (parent && sideP) {
      const op = openingFor(parent)
      const pSpace = asWorldSpace(parent, spec, sideP)
      pCenter = clampGap(pSpace, sideP, mid, op.w)
      push(parent.space.id, { side: sideP, center: pCenter, w: op.w, h: Math.min(op.h, pSpace.wallH - 0.5) })
    }

    // Threshold points on the outside face of each opening.
    const [nx, nz] = sideNormal(sideC)
    const childDoor = {
      x: alongX ? cCenter : child.rect.cx + nx * (child.rect.w / 2),
      z: alongX ? child.rect.cz + nz * (child.rect.d / 2) : cCenter,
    }
    const childFloor = spec.floorY[child.role]
    lane(childDoor.x, childDoor.z, nx, nz, (alongX ? child.rect.d : child.rect.w) / 2 + 2, 6)

    /**
     * A flight of steps always belongs to the higher of the two spaces and
     * descends outward across that space's apron — which is exactly where its
     * plinth perimeter is left open, so the flight is usable rather than decorative.
     * Where the level change is too great to be climbed within the apron, the
     * flight projects beyond it rather than becoming too steep to use.
     */
    const addSteps = (
      owner: PlannedSpace,
      doorX: number,
      doorZ: number,
      side: Side,
      from: number,
      to: number,
      width: number,
    ) => {
      if (to - from <= 0.25) return
      const apron = owner.role === 'COURT' ? COURT_APRON : APRON
      steps.push({
        spaceId: owner.space.id,
        x: doorX,
        z: doorZ,
        w: width + 2.2,
        from,
        to,
        side,
        // Round up, never down: a riser must stay inside the walker's step-up
        // even when the level change divides awkwardly.
        count: Math.max(2, Math.ceil((to - from) / 0.32)),
        span: Math.max(1.6, apron, (to - from) / MAX_SLOPE),
      })
    }

    if (parent) {
      const pAlongX = sideP === 'NZ' || sideP === 'PZ'
      const [pnx, pnz] = sideNormal(sideP!)
      const parentDoor = {
        x: pAlongX ? pCenter : parent.rect.cx + pnx * (parent.rect.w / 2),
        z: pAlongX ? parent.rect.cz + pnz * (parent.rect.d / 2) : pCenter,
      }
      const parentFloor = spec.floorY[parent.role]
      lane(
        parentDoor.x,
        parentDoor.z,
        pnx,
        pnz,
        (pAlongX ? parent.rect.d : parent.rect.w) / 2 + 2,
        6,
      )
      const gapLen = Math.hypot(parentDoor.x - childDoor.x, parentDoor.z - childDoor.z)
      if (gapLen > 2.5) {
        paths.push(
          ...pathBetween(
            childDoor.x,
            childDoor.z,
            parentDoor.x,
            parentDoor.z,
            Math.min(childFloor, parentFloor),
            alongX,
          ),
        )
      }
      addSteps(child, childDoor.x, childDoor.z, sideC, parentFloor, childFloor, oc.w)
      addSteps(parent, parentDoor.x, parentDoor.z, sideP!, childFloor, parentFloor, openingFor(parent).w)
    } else {
      // Root space: the visitor arrives from the terrain, so it needs a way up.
      addSteps(child, childDoor.x, childDoor.z, sideC, 0, childFloor, oc.w)
    }

    if (child.roofed) {
      const inside = [childDoor.x - nx * 3.4, childDoor.z - nz * 3.4] as [number, number]
      const outside = [childDoor.x + nx * 3.6, childDoor.z + nz * 3.6] as [number, number]
      const closed = /closed|not open|restricted|no public/i.test(child.space.accessibility ?? '')
      portals.push({
        id: `portal-${child.space.id}`,
        label: child.space.name,
        detail: child.space.kind.replace(/_/g, ' ').toLowerCase(),
        position: [childDoor.x, childFloor, childDoor.z],
        inside,
        outside,
        yawIn: yawAlong(-nx, -nz),
        radius: 5.2,
        spaceId: child.space.id,
        evidence: child.space.evidence,
        sourceIds: child.space.sourceIds,
        accessibility: child.space.accessibility,
        restricted: closed,
      })
    }
  }

  // A flight of steps and the paving between two thresholds are routes in their
  // own right, so they claim lanes too.
  for (const run of steps) {
    const [rnx, rnz] = sideNormal(run.side)
    lane(run.x, run.z, rnx, rnz, 2.6, run.span + 3)
  }
  for (const p of paths) {
    clearways.push({
      rect: {
        cx: p.x,
        cz: p.z,
        w: p.w <= p.d ? LANE * 2 : p.w,
        d: p.d < p.w ? LANE * 2 : p.d,
      },
      across: p.w <= p.d ? 'x' : 'z',
    })
  }

  return { gaps, paths, steps, portals, doorSide, clearways }
}
