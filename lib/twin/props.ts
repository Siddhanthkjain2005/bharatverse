/**
 * Prop placement: planting, boulders, architectural fragments and built lamps.
 *
 * Generated in the world layer so that anything solid enough to stop a visitor —
 * a boulder, a tree trunk, a fallen lintel — is also in the collision world.
 * All of it is contextual visualisation, and the Evidence Lens says so.
 */

import { avenue, scatter, type EnvProfile, type Placement } from './environment'
import type { Rect } from './model'
import { Rand } from './rng'

export interface WorldProps {
  /** variant 0 = primary species, 1 = secondary. */
  trees: Placement[]
  shrubs: Placement[]
  rocks: Placement[]
  fragments: Placement[]
  lamps: { x: number; z: number }[]
}

export interface PropInputs {
  seed: string
  env: EnvProfile
  extent: number
  ground: number
  flatRadius: number
  court: Rect | null
  paths: { x: number; z: number; w: number; d: number }[]
  /** Water features: channels, tanks, the sea. Nothing is planted in them. */
  water: Rect[]
  /** Lanes that have to stay walkable; nothing solid may stand in one. */
  clearways: Rect[]
  blocked: (x: number, z: number) => boolean
}

/**
 * Setback for anything solid: the walker's radius plus a trunk's half-width, so a
 * tree beside a lane leaves the lane usable rather than merely uncovered.
 */
const KEEP = 1.4

function makeKeepClear(rects: Rect[]) {
  return (x: number, z: number) =>
    rects.some((r) => Math.abs(x - r.cx) < r.w / 2 + KEEP && Math.abs(z - r.cz) < r.d / 2 + KEEP)
}

export function buildProps(input: PropInputs): WorldProps {
  const { seed, env, extent, ground, court, blocked } = input
  const wet = makeKeepClear(input.water)
  const avoid = (x: number, z: number) => blocked(x, z) || wet(x, z)

  /* ---- planting ---- */
  const trees: Placement[] = []
  if (env.formal && court) {
    // A charbagh is planted on its axes, not scattered. The rows are laid out
    // formally and then thinned: a tree is solid, and the axes are also where the
    // water channels run and where the visitor walks, so a row point that falls
    // in the water or across a lane is dropped rather than planted in it.
    const clear = makeKeepClear([...input.water, ...input.clearways])
    const halfD = court.d / 2 - 4
    const halfW = court.w / 2 - 4
    trees.push(
      ...avenue(`${seed}:av-z`, 'z', court.cz - halfD, court.cz + halfD, court.w * 0.26, 7, [1.0, 1.25])
        .map((p) => ({ ...p, x: p.x + court.cx }))
        .filter((p) => !clear(p.x, p.z)),
      ...avenue(`${seed}:av-x`, 'x', court.cx - halfW, court.cx + halfW, court.d * 0.26, 7, [0.9, 1.15])
        .map((p) => ({ ...p, z: p.z + court.cz }))
        .filter((p) => !clear(p.x, p.z)),
    )
  }
  trees.push(
    ...scatter(`${seed}:trees`, {
      count: env.treeCount,
      from: extent + 6,
      to: ground * 0.94,
      minScale: 0.8,
      maxScale: 1.7,
      variants: 2,
      bias: 0.8,
      avoid,
    }),
  )
  const shrubs = scatter(`${seed}:shrubs`, {
    count: env.shrubCount,
    from: extent * 0.5,
    to: ground * 0.9,
    minScale: 0.6,
    maxScale: 1.5,
    variants: 3,
    bias: 0.9,
    avoid,
  })

  /* ---- geology ---- */
  const rocks = scatter(`${seed}:rocks`, {
    count: env.rockCount,
    from: extent + 4,
    to: ground * 0.96,
    minScale: 1.6,
    maxScale: 6.5,
    variants: 3,
    bias: 0.75,
    avoid,
  })

  /* ---- archaeological fragments ---- */
  const fragments = scatter(`${seed}:fragments`, {
    count: env.fragmentCount,
    from: extent * 0.72,
    to: extent + ground * 0.28,
    minScale: 0.7,
    maxScale: 2.3,
    variants: 4,
    bias: 1.5,
    avoid,
  })

  /* ---- built lamps along the visitor route ---- */
  const rand = new Rand(`${seed}:lamps`)
  const lamps: { x: number; z: number }[] = []
  for (const p of input.paths) {
    const along = Math.max(p.w, p.d)
    if (along < 10) continue
    const n = Math.min(4, Math.max(1, Math.round(along / 16)))
    const horizontal = p.w > p.d
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0.5 : i / n
      const base = horizontal
        ? { x: p.x - p.w / 2 + p.w * t, z: p.z }
        : { x: p.x, z: p.z - p.d / 2 + p.d * t }
      const off = (horizontal ? p.d : p.w) / 2 + 1.1
      for (const s of [-1, 1]) {
        lamps.push({
          x: base.x + (horizontal ? 0 : s * off),
          z: base.z + (horizontal ? s * off : 0),
        })
      }
    }
  }
  // Keep the count sane; a night scene needs pools of light, not a runway.
  const capped = lamps.filter(() => true)
  while (capped.length > 22) capped.splice(rand.int(0, capped.length - 1), 1)

  return { trees, shrubs, rocks, fragments, lamps: capped }
}
