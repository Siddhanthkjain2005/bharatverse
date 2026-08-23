/**
 * Collision and walkable-surface solver for the heritage twin.
 *
 * Deliberately not a physics engine. Everything the visitor can bump into is an
 * axis-aligned box with a vertical band, which is exactly what procedural
 * architecture produces: wall runs, plinth faces, column shafts, boulders. The
 * vertical band is what makes doorways work — a lintel starts above head height,
 * so the solver lets the walker pass beneath it — and what makes steps work,
 * because a box whose top is within `stepUp` of the feet is climbed, not hit.
 */

export interface Collider {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** World y of the top face. */
  top: number
  /** World y of the bottom face. */
  bottom: number
  kind: 'WALL' | 'MASS' | 'PROP' | 'ROCK'
}

export interface Platform {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Walkable surface height. */
  top: number
}

export interface SolveResult {
  x: number
  z: number
  feetY: number
  /** True when the last move was stopped by geometry. */
  hit: boolean
}

const CELL = 10

/**
 * The visitor's body, in metres — one definition, used by the walking camera, by
 * the world assembler when it places spawns, and by the reachability check.
 *
 * These three numbers decide what the architecture has to be: `stepUp / radius`
 * is the steepest flight a visitor can climb, and `radius` is the narrowest
 * doorway they fit through. Change one and the world has to be re-solved.
 */
export const WALKER: Readonly<{ radius: number; height: number; stepUp: number }> = {
  radius: 0.72,
  height: 1.78,
  stepUp: 0.62,
}

export class CollisionWorld {
  readonly colliders: Collider[] = []
  readonly platforms: Platform[] = []
  private grid = new Map<number, number[]>()
  private pgrid = new Map<number, number[]>()
  private minX = Infinity
  private minZ = Infinity
  private cols = 1
  private built = false

  /** Terrain height sampler; replaced by the environment when one exists. */
  terrain: (x: number, z: number) => number = () => 0

  addBox(c: Collider) {
    this.colliders.push(c)
    this.built = false
    return this
  }

  /** Convenience for the common "wall segment centred at (x,z)" case. */
  addSlab(
    x: number,
    z: number,
    w: number,
    d: number,
    bottom: number,
    top: number,
    kind: Collider['kind'] = 'WALL',
  ) {
    return this.addBox({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
      bottom, top, kind,
    })
  }

  addPlatform(p: Platform) {
    this.platforms.push(p)
    this.built = false
    return this
  }

  addCylinder(x: number, z: number, r: number, bottom: number, top: number, kind: Collider['kind'] = 'PROP') {
    // A square inscribed-ish in the circle: cheap and forgiving on corners.
    const s = r * 0.92
    return this.addSlab(x, z, s * 2, s * 2, bottom, top, kind)
  }

  build() {
    if (this.built) return this
    this.grid.clear()
    this.pgrid.clear()
    this.minX = Infinity
    this.minZ = Infinity
    let maxX = -Infinity
    for (const c of this.colliders) {
      this.minX = Math.min(this.minX, c.minX)
      this.minZ = Math.min(this.minZ, c.minZ)
      maxX = Math.max(maxX, c.maxX)
    }
    for (const p of this.platforms) {
      this.minX = Math.min(this.minX, p.minX)
      this.minZ = Math.min(this.minZ, p.minZ)
      maxX = Math.max(maxX, p.maxX)
    }
    if (!Number.isFinite(this.minX)) {
      this.minX = 0
      this.minZ = 0
      maxX = 1
    }
    this.cols = Math.max(1, Math.ceil((maxX - this.minX) / CELL) + 2)
    this.colliders.forEach((c, i) => this.insert(this.grid, c, i))
    this.platforms.forEach((p, i) => this.insert(this.pgrid, p, i))
    this.built = true
    return this
  }

  private insert(
    target: Map<number, number[]>,
    b: { minX: number; maxX: number; minZ: number; maxZ: number },
    index: number,
  ) {
    const x0 = Math.floor((b.minX - this.minX) / CELL)
    const x1 = Math.floor((b.maxX - this.minX) / CELL)
    const z0 = Math.floor((b.minZ - this.minZ) / CELL)
    const z1 = Math.floor((b.maxZ - this.minZ) / CELL)
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const key = z * this.cols + x
        const list = target.get(key)
        if (list) list.push(index)
        else target.set(key, [index])
      }
    }
  }

  private cellKey(x: number, z: number) {
    return (
      Math.floor((z - this.minZ) / CELL) * this.cols +
      Math.floor((x - this.minX) / CELL)
    )
  }

  /** Colliders whose cell the point touches, plus its eight neighbours. */
  private near(x: number, z: number): number[] {
    if (!this.built) this.build()
    const out: number[] = []
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = this.grid.get(this.cellKey(x + dx * CELL, z + dz * CELL))
        if (list) for (const i of list) if (!out.includes(i)) out.push(i)
      }
    }
    return out
  }

  /** Highest walkable surface under the point that the feet can reach. */
  groundAt(x: number, z: number, feetY = Infinity, stepUp = WALKER.stepUp): number {
    if (!this.built) this.build()
    let best = this.terrain(x, z)
    const list = this.pgrid.get(this.cellKey(x, z))
    if (list) {
      for (const i of list) {
        const p = this.platforms[i]
        if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue
        if (p.top > best && p.top <= feetY + stepUp) best = p.top
      }
    }
    return best
  }

  /** True when a capsule of `radius` at (x,z) standing on `feetY` intersects geometry. */
  blocked(x: number, z: number, radius: number, feetY: number, height: number, stepUp: number): boolean {
    for (const i of this.near(x, z)) {
      const c = this.colliders[i]
      if (c.top <= feetY + stepUp) continue
      if (c.bottom >= feetY + height) continue
      if (
        x > c.minX - radius && x < c.maxX + radius &&
        z > c.minZ - radius && z < c.maxZ + radius
      )
        return true
    }
    return false
  }

  /**
   * Move-and-slide. Motion is split into short sub-steps so a fast sprint cannot
   * tunnel through a wall, and each sub-step falls back to single-axis motion so
   * the walker slides along a surface instead of sticking to it.
   */
  solve(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius: number,
    feetY: number,
    height = WALKER.height,
    stepUp = WALKER.stepUp,
  ): SolveResult {
    const dist = Math.hypot(dx, dz)
    const steps = Math.max(1, Math.ceil(dist / (radius * 0.6)))
    let px = x
    let pz = z
    let py = feetY
    let hit = false

    for (let s = 0; s < steps; s++) {
      const sx = dx / steps
      const sz = dz / steps
      const tx = px + sx
      const tz = pz + sz
      const groundFull = this.groundAt(tx, tz, py, stepUp)
      if (!this.blocked(tx, tz, radius, Math.max(py, groundFull) - 0.02, height, stepUp)) {
        px = tx
        pz = tz
        py = groundFull
        continue
      }
      hit = true
      const gx = this.groundAt(tx, pz, py, stepUp)
      if (!this.blocked(tx, pz, radius, Math.max(py, gx) - 0.02, height, stepUp)) {
        px = tx
        py = gx
      }
      const gz = this.groundAt(px, tz, py, stepUp)
      if (!this.blocked(px, tz, radius, Math.max(py, gz) - 0.02, height, stepUp)) {
        pz = tz
        py = gz
      }
    }

    return { x: px, z: pz, feetY: this.groundAt(px, pz, py, stepUp), hit }
  }

  /** Last-resort unstick: shove the walker out of anything it is standing in. */
  depenetrate(x: number, z: number, radius: number, feetY: number, height: number, stepUp: number) {
    let px = x
    let pz = z
    for (const i of this.near(x, z)) {
      const c = this.colliders[i]
      if (c.top <= feetY + stepUp || c.bottom >= feetY + height) continue
      if (px <= c.minX - radius || px >= c.maxX + radius) continue
      if (pz <= c.minZ - radius || pz >= c.maxZ + radius) continue
      const push = [
        { d: px - (c.minX - radius), ax: 'x' as const, to: c.minX - radius },
        { d: c.maxX + radius - px, ax: 'x' as const, to: c.maxX + radius },
        { d: pz - (c.minZ - radius), ax: 'z' as const, to: c.minZ - radius },
        { d: c.maxZ + radius - pz, ax: 'z' as const, to: c.maxZ + radius },
      ].sort((a, b) => a.d - b.d)[0]
      if (push.ax === 'x') px = push.to
      else pz = push.to
    }
    return { x: px, z: pz }
  }
}
