/**
 * World assembler.
 *
 * Turns a heritage record into one continuous walkable world: documented spaces
 * become enclosures, the room graph becomes doorways and paths, floor-level
 * changes become steps, and the whole thing becomes a single collision world so
 * that what the visitor sees and what stops them are always the same geometry.
 */

import type { HeritageSite } from '@/lib/heritage/types'
import { anchorHotspots } from './anchors'
import { CollisionWorld, WALKER, type Platform } from './collision'
import { columnGroups } from './columns'
import { buildEnvironment, makeBlocker } from './environment'
import { extrasFor } from './extras'
import { planSite } from './plan'
import { buildProps } from './props'
import { makeFbm2D, smoothstep } from './rng'
import { runsBySpace, solvePlinth } from './plinth'
import { solveRoutes } from './routes'
import { ARCH_SPEC } from './specs'
import { treadsFor } from './steps'
import { spiralStairFor } from './spiral-stair'
import { solveWalls } from './walls'
import {
  rectContains,
  yawAlong,
  type Doorway,
  type Rect,
  type WallSeg,
  type WaterFeature,
  type WorldModel,
  type WorldSpace,
} from './model'

/** Walker metrics; the walking camera measures itself the same way. */
const { radius: PLAYER_R, height: BODY_H, stepUp: STEP_UP } = WALKER

/** Ground is levelled under the built complex and undulates beyond it. */
export function terrainSampler(seed: string, flatRadius: number, ground: number, amp: number) {
  const fbm = makeFbm2D(`${seed}:terrain`, 4)
  const ridge = makeFbm2D(`${seed}:ridge`, 2)
  return (x: number, z: number) => {
    const r = Math.hypot(x, z)
    const t = smoothstep(flatRadius, flatRadius + ground * 0.4, r)
    if (t <= 0.0001) return 0
    const n = fbm(x / 52, z / 52) * amp
    const rim = smoothstep(flatRadius, ground * 1.15, r) * amp * 1.6
    const bump = ridge(x / 130, z / 130) * amp * 0.9
    return (n + rim + bump) * t
  }
}

const TERRAIN_AMP: Record<string, number> = {
  CHARBAGH: 1.4,
  TEMPLE_COURT: 2.4,
  DESERT_COMPLEX: 2.0,
  GORGE: 9.0,
  COASTAL: 1.8,
  BOULDER_FIELD: 6.5,
  PLAZA: 1.6,
  FORT_BASTION: 1.6,
}

export function buildWorld(site: HeritageSite): WorldModel {
  const spec = ARCH_SPEC[site.twin.archetype]
  const plan = planSite(site, spec)
  const routes = solveRoutes(plan.spaces, spec)

  const spaces: WorldSpace[] = plan.spaces.map((p) => ({
    space: p.space,
    rect: p.rect,
    role: p.role,
    floorY: spec.floorY[p.role],
    wallH: spec.wallH[p.role],
    roofed: p.roofed,
    columns: p.columns,
    doorSide: routes.doorSide.get(p.space.id) ?? 'PZ',
    depth: p.depth,
    evidenceClass: p.evidenceClass,
  }))

  const core = spaces.find((s) => s.role === 'CORE') ?? null

  const walls: WallSeg[] = []
  const lintels: WallSeg[] = []
  const doorways: Doorway[] = []
  for (const s of spaces) {
    const sol = solveWalls(s, routes.gaps.get(s.space.id) ?? [], spec.wallT)
    walls.push(...sol.walls)
    lintels.push(...sol.lintels)
    doorways.push(...sol.doorways)
  }

  let extent = 24
  for (const s of spaces) {
    extent = Math.max(extent, Math.abs(s.rect.cx) + s.rect.w / 2, Math.abs(s.rect.cz) + s.rect.d / 2)
  }
  extent += 6
  const ground = Math.max(spec.ground, extent * 2.1)
  const flatRadius = extent + 16

  /* ---------------- collision + walkable surfaces ---------------- */

  const collision = new CollisionWorld()
  collision.terrain = terrainSampler(site.id, flatRadius, ground, TERRAIN_AMP[spec.land] ?? 2)
  const platforms: Platform[] = []

  const addPlatform = (cx: number, cz: number, w: number, d: number, top: number) => {
    const p: Platform = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top }
    platforms.push(p)
    collision.addPlatform(p)
  }

  const runs = runsBySpace(routes.steps)

  /**
   * The plinth solver decides where a plinth is stone and where it is cut open
   * for steps; here that answer becomes both the walkable surface and the mass.
   * An uncut apron at plinth height would bury its own treads and the visitor
   * would walk off a ledge where they should have walked down steps.
   */
  for (const s of spaces) {
    const p = solvePlinth(s, runs.get(s.space.id) ?? [])
    for (const b of [p.core, ...p.bands]) {
      addPlatform(b.cx, b.cz, b.w, b.d, s.floorY)
      if (p.solid) collision.addSlab(b.cx, b.cz, b.w, b.d, 0, s.floorY, 'MASS')
    }
  }

  for (const p of routes.paths) {
    addPlatform(p.x, p.z, p.w, p.d, p.y)
  }

  // One tread generator for collision and for the renderer, so the step the
  // visitor sees is the step they stand on.
  //
  // Treads are walkable surfaces, never mass. A riser is shorter than the
  // walker's step-up but a tread is shallower than the walker's radius, so
  // solid treads would put the walker's shoulders inside the *next* step but
  // one and the climb would be blocked by the very flight it is climbing. The
  // flight's understructure is solid up to the level it is entered from, which
  // is all the mass a flight of steps actually has.
  for (const run of routes.steps) {
    const treads = treadsFor(run)
    if (treads.length === 0) continue
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const t of treads) {
      addPlatform(t.cx, t.cz, t.w, t.d, t.top)
      minX = Math.min(minX, t.cx - t.w / 2)
      maxX = Math.max(maxX, t.cx + t.w / 2)
      minZ = Math.min(minZ, t.cz - t.d / 2)
      maxZ = Math.max(maxZ, t.cz + t.d / 2)
    }
    const base = Math.min(run.from, run.to)
    if (base > 0.08) {
      collision.addSlab((minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ, 0, base, 'MASS')
    }
  }

  // Qutb's internal spiral is part of the virtual reconstruction rather than
  // the plan-to-plan route graph. It still uses real walkable platforms: the
  // renderer consumes the same solved treads below, so no visible stair can be
  // fallen through.
  if (site.slug === 'qutb-minar') {
    const room = spaces.find((s) => s.space.id === 'sp-q-minar')
    if (room) {
      const spiral = spiralStairFor(room)
      for (const tread of spiral.treads) {
        addPlatform(
          room.rect.cx + tread.x,
          room.rect.cz + tread.z,
          spiral.walkPad,
          spiral.walkPad,
          room.floorY + tread.top,
        )
      }
    }
  }


  for (const w of walls) {
    collision.addSlab(w.x, w.z, w.w, w.d, w.y - w.h / 2, w.y + w.h / 2, 'WALL')
  }
  for (const l of lintels) {
    collision.addSlab(l.x, l.z, l.w, l.d, l.y - l.h / 2, l.y + l.h / 2, 'WALL')
  }

  /* ---------------- water ---------------- */

  const water: WaterFeature[] = []
  const court = spaces.find((s) => s.role === 'COURT')
  if (spec.land === 'CHARBAGH' && court) {
    const y = court.floorY + 0.06
    water.push({ kind: 'CHANNEL', x: court.rect.cx, z: court.rect.cz, w: 2.8, d: court.rect.d - 2, y })
    water.push({ kind: 'CHANNEL', x: court.rect.cx, z: court.rect.cz, w: court.rect.w - 2, d: 2.8, y })
    water.push({ kind: 'TANK', x: court.rect.cx, z: court.rect.cz, w: 9, d: 9, y })
  }
  if (spec.land === 'GORGE') {
    water.push({ kind: 'RIVER', x: 0, z: extent + 26, w: ground * 1.9, d: 30, y: -1.6 })
  }
  if (spec.land === 'COASTAL') {
    water.push({ kind: 'RIVER', x: 0, z: ground * 0.92, w: ground * 2.4, d: ground * 0.7, y: -2.2 })
  }
  if (spec.extras.includes('STEP_TANK')) {
    water.push({ kind: 'POOL', x: -extent * 0.72, z: extent * 0.55, w: 13, d: 13, y: -2.6 })
  }

  /* ---------------- columns, planting, geology ---------------- */

  const columns = columnGroups(spaces, spec, routes.clearways)
  for (const g of columns) {
    for (const p of g.positions) {
      collision.addCylinder(p.x, p.z, g.radius + 0.16, g.y, g.y + g.h, 'PROP')
    }
  }

  const env = buildEnvironment(site.id, site.twin.archetype, extent)
  for (const b of env.boundary) {
    collision.addSlab(b.x, b.z, b.w, b.d, 0, b.h, 'WALL')
  }

  const extras = extrasFor(core, spec, extent)
  for (const mn of extras.minarets) {
    collision.addCylinder(mn.x, mn.z, mn.r * 1.25, 0, mn.h, 'MASS')
  }
  if (extras.cliff) {
    const c = extras.cliff
    collision.addSlab(c.back.x, c.back.z, c.back.w, c.back.d, 0, c.back.h, 'MASS')
    for (const wing of c.wings) {
      collision.addSlab(wing.x, wing.z, wing.w, wing.d, 0, wing.h, 'MASS')
    }
  }
  for (const bn of env.bastions) {
    collision.addCylinder(bn.x, bn.z, bn.r * 1.2, 0, bn.h, 'MASS')
  }

  const blocked = makeBlocker(
    spaces.map((s) => s.rect),
    routes.paths,
  )
  const props = buildProps({
    seed: site.id,
    env,
    extent,
    ground,
    flatRadius,
    court: court?.rect ?? null,
    paths: routes.paths,
    water: water.map((w) => ({ cx: w.x, cz: w.z, w: w.w, d: w.d })),
    clearways: routes.clearways.map((c) => c.rect),
    blocked,
  })

  /**
   * Every prop stands on the surface that is actually under it — a charbagh
   * cypress on the court paving, a boulder on the land — resolved here, once,
   * while the platform index is still the only thing in the collision world, and
   * carried on the placement so the mesh and the collider cannot disagree.
   */
  for (const list of [props.trees, props.shrubs, props.rocks, props.fragments]) {
    for (const p of list) p.y = collision.groundAt(p.x, p.z, Infinity, STEP_UP)
  }
  for (const r of props.rocks) {
    if (r.s < 2.2) continue
    const h = r.y ?? 0
    collision.addCylinder(r.x, r.z, r.s * 0.62, h - 1, h + r.s * 0.9, 'ROCK')
  }
  for (const t of props.trees) {
    const h = t.y ?? 0
    collision.addCylinder(t.x, t.z, 0.55 * t.s, h, h + 3.5, 'PROP')
  }

  /* ---------------- focal interior objects ---------------- */

  // The renderer gives each monument a central identity. Give the largest of
  // those objects a conservative collision footprint too, so a room teleport
  // cannot put the visitor inside a stupa, cenotaph enclosure or shrine image.
  // Wall-bound reliefs stay out of this list because the enclosing wall already
  // provides their collision surface.
  const focalCollision = (
    spaceId: string,
    widthRatio: number,
    depthRatio: number,
    height: number,
  ) => {
    const s = spaces.find((candidate) => candidate.space.id === spaceId)
    if (!s) return
    collision.addSlab(
      s.rect.cx,
      s.rect.cz,
      Math.min(s.rect.w - 2.2, s.rect.w * widthRatio),
      Math.min(s.rect.d - 2.2, s.rect.d * depthRatio),
      s.floorY,
      s.floorY + height,
      'PROP',
    )
  }
  switch (site.slug) {
    case 'taj-mahal':
      focalCollision('sp-cenotaph', 0.56, 0.62, 2.8)
      break
    case 'hampi':
      focalCollision('sp-h-sanctum', 0.52, 0.52, 1.4)
      break
    case 'konark-sun-temple':
      focalCollision('sp-k-deul', 0.52, 0.52, 1.6)
      {
        const hall = spaces.find((candidate) => candidate.space.id === 'sp-k-jagamohana')
        if (hall) {
          collision.addSlab(
            hall.rect.cx - hall.rect.w * 0.18,
            hall.rect.cz - hall.rect.d * 0.24,
            5.8,
            2.6,
            hall.floorY,
            hall.floorY + 5.4,
            'PROP',
          )
        }
      }
      break
    case 'ajanta-caves':
      focalCollision('sp-a-apse', 0.38, 0.38, 4.2)
      break
    case 'khajuraho':
      focalCollision('sp-kh-garbha', 0.5, 0.42, 4.4)
      break
    case 'qutb-minar': {
      const minar = spaces.find((candidate) => candidate.space.id === 'sp-q-minar')
      if (minar) collision.addCylinder(minar.rect.cx, minar.rect.cz, 0.38, minar.floorY, minar.floorY + minar.wallH, 'PROP')
      break
    }
    case 'brihadisvara-thanjavur':
      focalCollision('sp-t-sanctum', 0.52, 0.44, 5.2)
      break
    case 'mahabalipuram':
      focalCollision('sp-m-shrine', 0.48, 0.42, 4.2)
      break
  }

  collision.build()

  /* ---------------- spawns ---------------- */

  /**
   * A spawn has to be somewhere a walker can actually stand — not inside a
   * column, a parapet or a plinth face. Preferred points are tried in order and
   * then rings outward, so entering a room always lands on that room's floor.
   */
  const standable = (x: number, z: number, floorY: number | null) => {
    const g = collision.groundAt(x, z, floorY ?? Infinity, STEP_UP)
    if (floorY !== null && Math.abs(g - floorY) > 0.75) return false
    return !collision.blocked(x, z, PLAYER_R, g - 0.02, BODY_H, STEP_UP)
  }

  const freeSpot = (
    prefer: [number, number][],
    centre: [number, number],
    bound: Rect | null,
    floorY: number | null,
    avoid: Rect[] = [],
  ) => {
    const usable = (x: number, z: number) =>
      !avoid.some((rect) => rectContains(rect, x, z, PLAYER_R * 0.25)) &&
      standable(x, z, floorY)
    for (const [x, z] of prefer) if (usable(x, z)) return { x, z }
    for (let ring = 1; ring <= 9; ring++) {
      const rad = ring * 0.85
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + ring * 0.37
        const x = centre[0] + Math.cos(a) * rad
        const z = centre[1] + Math.sin(a) * rad
        if (bound && (Math.abs(x - bound.cx) > bound.w / 2 - 1 || Math.abs(z - bound.cz) > bound.d / 2 - 1)) {
          continue
        }
        if (usable(x, z)) return { x, z }
      }
    }
    return { x: centre[0], z: centre[1] }
  }

  const root = [...spaces].sort((a, b) => a.depth - b.depth)[0]
  const focus = core ?? root ?? null
  const rootX = root?.rect.cx ?? 0
  const approachZ = (root?.rect.cz ?? 0) + (root?.rect.d ?? 0) / 2 + 11
  const arrival = freeSpot(
    [
      [rootX, approachZ],
      [rootX, approachZ + 4.5],
      [rootX, approachZ + 9],
    ],
    [rootX, approachZ],
    null,
    null,
  )
  const spawnOutside = {
    x: arrival.x,
    z: arrival.z,
    yaw: yawAlong((focus?.rect.cx ?? 0) - arrival.x, (focus?.rect.cz ?? 0) - arrival.z),
  }

  const spawns: Record<string, { x: number; z: number; yaw: number }> = {}
  for (const s of spaces) {
    const nested = spaces
      .filter((candidate) => candidate.depth > s.depth)
      .map((candidate) => candidate.rect)
    const [nx, nz] =
      s.doorSide === 'PZ' ? [0, 1] : s.doorSide === 'NZ' ? [0, -1] : s.doorSide === 'PX' ? [1, 0] : [-1, 0]
    // Stand near the entry wall, looking across the whole room. Using the
    // room's approach axis (rather than its shortest dimension) prevents a
    // teleport from landing inside a central focal object in deep chambers.
    const axisHalf = s.doorSide === 'PZ' || s.doorSide === 'NZ' ? s.rect.d / 2 : s.rect.w / 2
    const inset = Math.max(1.2, axisHalf - 1.25)
    const spot = freeSpot(
      [
        [s.rect.cx + nx * inset, s.rect.cz + nz * inset],
        [s.rect.cx + nx * inset * 0.76, s.rect.cz + nz * inset * 0.76],
        [s.rect.cx + nx * inset * 0.48, s.rect.cz + nz * inset * 0.48],
        [s.rect.cx, s.rect.cz],
      ],
      [s.rect.cx, s.rect.cz],
      s.rect,
      s.floorY,
      nested,
    )
    spawns[s.space.id] = { x: spot.x, z: spot.z, yaw: yawAlong(-nx, -nz) }
  }

  const anchors = anchorHotspots(
    {
      spaces,
      core,
      extras,
      spec,
      groundAt: (x, z) => collision.groundAt(x, z, 40),
    },
    site.hotspots,
  )

  return {
    site,
    seed: site.id,
    ground,
    flatRadius,
    planScale: plan.scale,
    spaces,
    core,
    walls,
    lintels,
    doorways,
    portals: routes.portals,
    paths: routes.paths,
    steps: routes.steps,
    clearways: routes.clearways,
    water,
    platforms,
    collision,
    env,
    props,
    columns,
    extras,
    anchors,
    spawnOutside,
    spawns,
    extent,
  }
}

const WORLD_CACHE = new Map<string, WorldModel>()

/** Memoised per site — solving a world touches a few thousand placements. */
export function getWorld(site: HeritageSite): WorldModel {
  const hit = WORLD_CACHE.get(site.id)
  if (hit) return hit
  const world = buildWorld(site)
  WORLD_CACHE.set(site.id, world)
  return world
}
