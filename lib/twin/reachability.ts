/**
 * Reachability check.
 *
 * A documented space the visitor cannot walk into is a bug in the architecture,
 * not a matter of taste, so it is machine-checkable: flood the collision world
 * from the arrival point using the same solver the walking camera uses, and see
 * which spaces the flood managed to stand in.
 *
 * The flood moves like a visitor rather than like a cursor. It sub-steps, slides
 * along walls and climbs tread by tread, so a flight of steps is crossed the way
 * a visitor crosses it instead of as one impossible stride.
 */

import { WALKER } from './collision'
import type { WorldModel } from './model'

/** Lattice pitch, comfortably inside the walker's own width. */
const CELL = 0.9
const DIRS: [number, number][] = [
  [CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL],
  [CELL, CELL], [CELL, -CELL], [-CELL, CELL], [-CELL, -CELL],
]
/** A space counts as reached only if the flood stood this close to its floor. */
const ON_FLOOR = 0.75

export interface Flood {
  /** Heights each ground-plan cell was reached at. */
  seen: Map<string, number[]>
  key: (x: number, z: number) => string
  /** True when the flood ran out of budget rather than out of world. */
  exhausted: boolean
}

export interface SpaceReport {
  id: string
  name: string
  role: string
  floorY: number
  /** The flood stood on this space's own floor, inside its footprint. */
  walkable: boolean
  /** Its per-space spawn point puts the visitor inside solid geometry. */
  spawnBlocked: boolean
}

export interface ReachabilityReport {
  floodCells: number
  floodExhausted: boolean
  spaces: SpaceReport[]
  unreachable: string[]
  stuckSpawns: string[]
}

/**
 * Breadth-first flood over the walkable surface, keyed on plan position *and*
 * height. A raised walkway and the ground beneath it occupy the same cell, so a
 * flood keyed on position alone lets whichever level it meets first lock the
 * other one out; two visits are the same place only when the walker could step
 * between them.
 */
export function floodWorld(world: WorldModel, budget = 400000): Flood {
  const { radius, height, stepUp } = WALKER
  const c = world.collision
  const start = world.spawnOutside
  const limit = world.extent + 26
  const key = (x: number, z: number) => `${Math.round(x / CELL)}:${Math.round(z / CELL)}`
  const seen = new Map<string, number[]>()
  const visit = (k: string, y: number) => {
    const at = seen.get(k)
    if (!at) {
      seen.set(k, [y])
      return true
    }
    if (at.some((h) => Math.abs(h - y) <= stepUp)) return false
    at.push(y)
    return true
  }

  const queue: { x: number; z: number; y: number }[] = []
  const y0 = c.groundAt(start.x, start.z, Infinity, stepUp)
  queue.push({ x: start.x, z: start.z, y: y0 })
  visit(key(start.x, start.z), y0)

  let guard = 0
  let head = 0
  while (head < queue.length && guard < budget) {
    guard++
    const node = queue[head++]
    for (const [dx, dz] of DIRS) {
      const nx = node.x + dx
      const nz = node.z + dz
      if (Math.abs(nx) > limit || Math.abs(nz) > limit) continue
      const res = c.solve(node.x, node.z, dx, dz, radius, node.y, height, stepUp)
      if (Math.hypot(res.x - nx, res.z - nz) > 0.1) continue
      if (!visit(key(nx, nz), res.feetY)) continue
      queue.push({ x: res.x, z: res.z, y: res.feetY })
    }
  }
  return { seen, key, exhausted: head < queue.length }
}

/** True when the flood stood on this space's own floor inside its footprint. */
export function floodReached(
  flood: Flood,
  rect: { cx: number; cz: number; w: number; d: number },
  floorY: number,
): boolean {
  for (let x = rect.cx - rect.w / 2 + 1; x < rect.cx + rect.w / 2 - 1; x += CELL) {
    for (let z = rect.cz - rect.d / 2 + 1; z < rect.cz + rect.d / 2 - 1; z += CELL) {
      const at = flood.seen.get(flood.key(x, z))
      if (at?.some((h) => Math.abs(h - floorY) <= ON_FLOOR)) return true
    }
  }
  return false
}

export function checkReachability(world: WorldModel): ReachabilityReport {
  const { radius, height, stepUp } = WALKER
  const flood = floodWorld(world)
  const spaces: SpaceReport[] = world.spaces.map((s) => {
    const spawn = world.spawns[s.space.id]
    const feet = world.collision.groundAt(spawn.x, spawn.z, Infinity, stepUp) - 0.02
    return {
      id: s.space.id,
      name: s.space.name,
      role: s.role,
      floorY: s.floorY,
      // Walking *underneath* a raised plinth is not arriving in the room above it.
      walkable: floodReached(flood, s.rect, s.floorY),
      spawnBlocked: world.collision.blocked(spawn.x, spawn.z, radius, feet, height, stepUp),
    }
  })
  return {
    floodCells: flood.seen.size,
    floodExhausted: flood.exhausted,
    spaces,
    unreachable: spaces.filter((s) => !s.walkable).map((s) => s.name),
    stuckSpawns: spaces.filter((s) => s.spawnBlocked).map((s) => s.name),
  }
}
