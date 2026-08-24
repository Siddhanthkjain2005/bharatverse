/**
 * Environment profile.
 *
 * The landscape around a monument is a *conceptual visualisation* — the record
 * documents the building, not every shrub — so it is generated deterministically
 * from the site id and declared as contextual in the Evidence Lens. What it is
 * not is generic: a rock-cut gorge, a Mughal charbagh and a granite boulder field
 * get different terrain, different planting and different ground cover.
 */

import { Rand, smoothstep } from './rng'
import { ARCH_SPEC, type ArchSpec } from './specs'
import type { Archetype } from './specs'

export type TreeKind = 'CYPRESS' | 'BANYAN' | 'PALM' | 'NEEM' | 'SCRUB'

export interface Placement {
  x: number
  z: number
  /** Uniform scale. */
  s: number
  rot: number
  variant: number
  /**
   * Height of the surface this prop stands on, resolved by the world assembler.
   * Terrain is only the answer out on the land: a tree in a raised court stands
   * on the court's paving, and both the collider and the mesh have to agree
   * about which.
   */
  y?: number
}

export interface BoundaryWall {
  x: number
  z: number
  w: number
  d: number
  h: number
}

export interface EnvProfile {
  land: ArchSpec['land']
  treeKind: TreeKind
  secondaryTree: TreeKind
  /** Formal planting laid out on the court axes rather than scattered. */
  formal: boolean
  treeCount: number
  shrubCount: number
  tuftCount: number
  rockCount: number
  fragmentCount: number
  /** 0–1 lushness, drives ground colour blend and grass density. */
  lushness: number
  dustiness: number
  boundary: BoundaryWall[]
  /** Enclosure the boundary defines, for gate placement. */
  boundaryRect: { cx: number; cz: number; w: number; d: number } | null
  /** Corner bastions and gate-flanking towers, only populated for FORT_BASTION land. */
  bastions: { x: number; z: number; r: number; h: number }[]
  viewpoints: { x: number; z: number; label: string }[]
}

const LAND: Record<
  ArchSpec['land'],
  Pick<EnvProfile, 'treeKind' | 'secondaryTree' | 'formal' | 'lushness' | 'dustiness'> & {
    trees: number
    shrubs: number
    tufts: number
    rocks: number
    fragments: number
    wall: boolean
  }
> = {
  CHARBAGH: {
    treeKind: 'CYPRESS',
    secondaryTree: 'NEEM',
    formal: true,
    lushness: 0.85,
    dustiness: 0.25,
    trees: 54,
    shrubs: 90,
    tufts: 2600,
    rocks: 8,
    fragments: 6,
    wall: true,
  },

  TEMPLE_COURT: {
    treeKind: 'BANYAN',
    secondaryTree: 'NEEM',
    formal: false,
    lushness: 0.6,
    dustiness: 0.4,
    trees: 60,
    shrubs: 120,
    tufts: 2200,
    rocks: 30,
    fragments: 26,
    wall: true,
  },

  DESERT_COMPLEX: {
    treeKind: 'NEEM',
    secondaryTree: 'SCRUB',
    formal: false,
    lushness: 0.34,
    dustiness: 0.7,
    trees: 30,
    shrubs: 130,
    tufts: 1300,
    rocks: 40,
    fragments: 34,
    wall: true,
  },

  GORGE: {
    treeKind: 'BANYAN',
    secondaryTree: 'SCRUB',
    formal: false,
    lushness: 0.9,
    dustiness: 0.3,
    trees: 130,
    shrubs: 190,
    tufts: 2600,
    rocks: 90,
    fragments: 10,
    wall: false,
  },

  COASTAL: {
    treeKind: 'PALM',
    secondaryTree: 'SCRUB',
    formal: false,
    lushness: 0.55,
    dustiness: 0.55,
    trees: 70,
    shrubs: 100,
    tufts: 1900,
    rocks: 34,
    fragments: 22,
    wall: true,
  },

  BOULDER_FIELD: {
    treeKind: 'SCRUB',
    secondaryTree: 'NEEM',
    formal: false,
    lushness: 0.4,
    dustiness: 0.6,
    trees: 44,
    shrubs: 150,
    tufts: 1500,
    rocks: 130,
    fragments: 46,
    wall: false,
  },

  PLAZA: {
    treeKind: 'NEEM',
    secondaryTree: 'SCRUB',
    formal: false,
    lushness: 0.5,
    dustiness: 0.5,
    trees: 40,
    shrubs: 90,
    tufts: 1600,
    rocks: 20,
    fragments: 18,
    wall: true,
  },

  /**
   * Red Fort:
   *
   * The fort itself is the visual subject, so the surrounding procedural
   * landscape must stay quiet. The interior is predominantly parade/court
   * surface with formal Mughal planting concentrated toward the palace/garden
   * zone rather than behaving like a natural landscape.
   */
  FORT_BASTION: {
    treeKind: 'CYPRESS',
    secondaryTree: 'NEEM',
    formal: true,
    lushness: 0.45,
    dustiness: 0.52,
    trees: 24,
    shrubs: 35,
    tufts: 900,
    rocks: 0,
    fragments: 3,
    wall: true,
  },
}

export function buildEnvironment(
  seed: string,
  archetype: Archetype,
  extent: number,
): EnvProfile {
  const spec = ARCH_SPEC[archetype]
  const cfg = LAND[spec.land]
  const ext = extent

  const boundary: BoundaryWall[] = []
  let boundaryRect: EnvProfile['boundaryRect'] = null
  const bastions: EnvProfile['bastions'] = []

  if (cfg.wall) {
    const isFort = spec.land === 'FORT_BASTION'

    /**
     * The Red Fort is not a square garden enclosure.
     *
     * Give the fort a broad rectangular footprint. The exact historical
     * footprint is simplified here, but the long defensive axis is much more
     * important visually than pretending the enclosure is square.
     */
    const w = isFort
      ? Math.max(ext * 2 + 30, 104)
      : ext * 2 + 26

    const d = isFort
      ? Math.max(ext * 1.25 + 30, 68)
      : ext * 2 + 26

    boundaryRect = {
      cx: 0,
      cz: 0,
      w,
      d,
    }

    /**
     * Defensive curtain wall:
     *
     * - taller than ordinary garden/site boundaries
     * - materially thicker
     * - wide central opening
     * - aligned exactly with the gate-flanking bastions
     */
    const h = spec.land === 'CHARBAGH'
      ? 5.4
      : isFort
        ? 9.5
        : 3.6

    const t = isFort ? 2.6 : 1.6
    const gateW = isFort ? 16 : 12

    // Front wall, split around the main gate.
    const sideWallW = w / 2 - gateW / 2
    const sideWallX = (w + gateW) / 4

    boundary.push({
      x: -sideWallX,
      z: d / 2,
      w: sideWallW,
      d: t,
      h,
    })

    boundary.push({
      x: sideWallX,
      z: d / 2,
      w: sideWallW,
      d: t,
      h,
    })

    // Rear curtain wall.
    boundary.push({
      x: 0,
      z: -d / 2,
      w,
      d: t,
      h,
    })

    // Side curtain walls.
    boundary.push({
      x: -w / 2,
      z: 0,
      w: t,
      d,
      h,
    })

    boundary.push({
      x: w / 2,
      z: 0,
      w: t,
      d,
      h,
    })

    /**
     * Bastions:
     *
     * Four large corner drums establish the defensive silhouette.
     * Two smaller drums flank the main gate.
     *
     * These positions intentionally share the exact boundary dimensions above
     * so the visible geometry and the collision geometry remain aligned.
     */
    if (isFort) {
      const cornerR = t * 2.15
      const cornerH = h * 1.32

      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          bastions.push({
            x: sx * (w / 2),
            z: sz * (d / 2),
            r: cornerR,
            h: cornerH,
          })
        }
      }

      const gateR = t * 1.45
      const gateH = h * 1.18

      for (const sx of [-1, 1]) {
        bastions.push({
          x: sx * (gateW / 2),
          z: d / 2,
          r: gateR,
          h: gateH,
        })
      }
    }
  }

  const rand = new Rand(`${seed}:viewpoints`)

  const viewpoints = [
    {
      x: 0,
      z: (boundaryRect?.d ?? ext * 2) * 0.5 + 28,
      label: 'Approach view',
    },
    {
      x: -(boundaryRect?.w ?? ext * 2) * 0.46,
      z: (boundaryRect?.d ?? ext * 2) * 0.34,
      label: 'West corner',
    },
    {
      x: (boundaryRect?.w ?? ext * 2) * 0.46,
      z: -(boundaryRect?.d ?? ext * 2) * 0.22,
      label: 'East flank',
    },
  ].map((v) => ({
    ...v,
    x: v.x + rand.jitter(2),
    z: v.z + rand.jitter(2),
  }))

  return {
    land: spec.land,
    treeKind: cfg.treeKind,
    secondaryTree: cfg.secondaryTree,
    formal: cfg.formal,
    treeCount: cfg.trees,
    shrubCount: cfg.shrubs,
    tuftCount: cfg.tufts,
    rockCount: cfg.rocks,
    fragmentCount: cfg.fragments,
    lushness: cfg.lushness,
    dustiness: cfg.dustiness,
    boundary,
    boundaryRect,
    bastions,
    viewpoints,
  }
}

/* ------------------------------------------------------------------ */
/* scatter                                                             */
/* ------------------------------------------------------------------ */

/** True when a point falls on built ground, where planting would look wrong. */
export function makeBlocker(
  rects: { cx: number; cz: number; w: number; d: number }[],
  paths: { x: number; z: number; w: number; d: number }[],
) {
  const all = [
    ...rects.map((s) => ({
      minX: s.cx - s.w / 2 - 3.4,
      maxX: s.cx + s.w / 2 + 3.4,
      minZ: s.cz - s.d / 2 - 3.4,
      maxZ: s.cz + s.d / 2 + 3.4,
    })),

    ...paths.map((p) => ({
      minX: p.x - p.w / 2 - 1.2,
      maxX: p.x + p.w / 2 + 1.2,
      minZ: p.z - p.d / 2 - 1.2,
      maxZ: p.z + p.d / 2 + 1.2,
    })),
  ]

  return (x: number, z: number) => {
    for (const r of all) {
      if (
        x > r.minX &&
        x < r.maxX &&
        z > r.minZ &&
        z < r.maxZ
      ) {
        return true
      }
    }

    return false
  }
}

export interface ScatterOptions {
  count: number

  /** Inner and outer radius of the annulus to fill. */
  from: number
  to: number

  minScale: number
  maxScale: number
  variants: number

  /** Bias placement outward (>1) or inward (<1). */
  bias?: number

  /** Skip points that fall on built ground. */
  avoid?: (x: number, z: number) => boolean
}

export function scatter(
  seed: string,
  opts: ScatterOptions,
): Placement[] {
  const rand = new Rand(seed)
  const out: Placement[] = []
  const bias = opts.bias ?? 1

  let guard = 0

  while (
    out.length < opts.count &&
    guard < opts.count * 14
  ) {
    guard++

    const a = rand.range(0, Math.PI * 2)
    const t = Math.pow(rand.unit(), bias)
    const r = opts.from + t * (opts.to - opts.from)

    const x = Math.cos(a) * r
    const z = Math.sin(a) * r * rand.range(0.86, 1.14)

    if (opts.avoid?.(x, z)) continue

    out.push({
      x,
      z,
      s: rand.range(opts.minScale, opts.maxScale),
      rot: rand.range(0, Math.PI * 2),
      variant: rand.int(
        0,
        Math.max(0, opts.variants - 1),
      ),
    })
  }

  return out
}

/** Formal avenue planting: paired rows either side of an axis. */
export function avenue(
  seed: string,
  axis: 'x' | 'z',
  from: number,
  to: number,
  offset: number,
  count: number,
  scale: [number, number],
): Placement[] {
  const rand = new Rand(seed)
  const out: Placement[] = []

  for (let i = 0; i < count; i++) {
    const t = count === 1
      ? 0.5
      : i / (count - 1)

    const along = from + (to - from) * t

    for (const side of [-1, 1]) {
      out.push({
        x: axis === 'z'
          ? side * offset
          : along,

        z: axis === 'z'
          ? along
          : side * offset,

        s: rand.range(
          scale[0],
          scale[1],
        ),

        rot: rand.range(
          0,
          Math.PI * 2,
        ),

        variant: 0,
      })
    }
  }

  return out
}

/** Ground-cover density falls off away from the watered core of the site. */
export function coverDensity(
  r: number,
  flatRadius: number,
  ground: number,
  lushness: number,
) {
  return lushness * (
    1 -
    smoothstep(
      flatRadius * 0.9,
      ground * 0.95,
      r,
    ) * 0.75
  )
}