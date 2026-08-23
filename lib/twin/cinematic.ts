/**
 * Cinematic camera presets and the guided tour.
 *
 * Shots are *solved*, not authored: each one names the part of the building it is
 * about, and the camera distance is the one that contains that subject at the
 * chosen field of view. A 72 m minaret and a 14 m monolithic ratha are therefore
 * both composed whole, on any site in the catalogue, without a per-site table of
 * positions to keep in step with the geometry.
 */

import type { ArchComponent } from './architecture'
import { anchorFor } from './anchors'
import { interiorIdentityFor } from './interior-identity'
import type { TimeOfDay } from './light'
import type { WorldModel } from './model'
import { ARCH_SPEC, CROWN_HEIGHT } from './specs'

export interface Shot {
  id: string
  label: string
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  /** Seconds to hold before advancing. */
  hold: number
  /** Radians per second of drift while held. */
  orbit: number
  timeOfDay?: TimeOfDay
  caption?: string
}

/**
 * The aspect the presets are solved for. The viewer is a wide panel; framing for
 * something narrower than this would leave every shot loose rather than cropped,
 * which is the safe direction to be wrong in.
 */
const ASPECT = 1.6

const SIGNATURE_FEATURE: Record<string, string> = {
  hampi: 'hs-chariot',
  'konark-sun-temple': 'hs-k-wheel',
  'ajanta-caves': 'hs-a-stupa',
  khajuraho: 'hs-kh-registers',
  'qutb-minar': 'hs-q-iron',
  'brihadisvara-thanjavur': 'hs-t-nandi',
  mahabalipuram: 'hs-m-ratha',
}

const SIGNATURE_DISTANCE: Record<string, number> = {
  hampi: 20,
  'konark-sun-temple': 15,
  'ajanta-caves': 14,
  khajuraho: 14,
  'qutb-minar': 16,
  'brihadisvara-thanjavur': 18,
  mahabalipuram: 20,
}

const halfAngle = (fov: number) => (fov * Math.PI) / 360

/**
 * Distance at which a subject of the given half-height and half-width is
 * contained by the frame, with margin for the parts of a building that are not
 * in its bounding box — a finial, a flanking minaret, a flight of steps.
 */
export function fitDistance(
  halfH: number,
  halfW: number,
  fov: number,
  margin = 1.14,
  aspect = ASPECT,
) {
  const t = Math.tan(halfAngle(fov))
  return Math.max(halfH / t, halfW / (t * aspect)) * margin
}

interface Framing {
  /** Half the vertical size of the subject, in metres. */
  halfH: number
  /** Half its horizontal size. */
  halfW: number
  fov: number
  /** Degrees around the axis; 0 looks along +z towards the monument. */
  azimuth: number
  /** Degrees above the subject centre. */
  elevation: number
  margin?: number
  /** Fraction of `halfH` to raise the aim by, so the subject sits low in frame. */
  lift?: number
  /** Metres to push the camera back beyond the solved distance. */
  pull?: number
}

/**
 * Places a camera on a sphere around the subject centre at the fitted distance.
 * Negative elevations are the useful ones for a tall building: to contain a 37 m
 * dome you stand 60 m back, and from there the honest viewpoint is a person's —
 * below the middle of the façade, looking slightly up at it.
 */
function frame(cx: number, cy: number, cz: number, f: Framing) {
  const d = fitDistance(f.halfH, f.halfW, f.fov, f.margin) + (f.pull ?? 0)
  const el = (f.elevation * Math.PI) / 180
  const az = (f.azimuth * Math.PI) / 180
  const flat = d * Math.cos(el)
  const aim = cy + f.halfH * (f.lift ?? 0)
  return {
    position: [
      cx + Math.sin(az) * flat,
      Math.max(2.2, cy + d * Math.sin(el)),
      cz + Math.cos(az) * flat,
    ] as [number, number, number],
    target: [cx, aim, cz] as [number, number, number],
    distance: d,
  }
}

/**
 * The same solve, rotated off the authored azimuth until the lens is clear.
 *
 * A shot solved purely from the subject can put the camera inside a lamp standard
 * or a tree, and a 4 m avenue tree two metres from the lens is the whole frame —
 * the monument becomes bokeh behind a trunk. Rather than authoring a per-site
 * table of exceptions, the azimuth is walked outward in small steps and the first
 * bearing whose standpoint is clear of planting and fittings wins; if none is,
 * the authored bearing is kept, because a slightly blocked hero is better than a
 * hero pointing somewhere else.
 */
function clearFrame(cx: number, cy: number, cz: number, f: Framing, world: WorldModel) {
  const solid: { x: number; z: number; r: number }[] = [
    ...world.props.lamps.map((p) => ({ x: p.x, z: p.z, r: 2.6 })),
    ...world.props.trees.map((p) => ({ x: p.x, z: p.z, r: 2.2 + p.s * 1.5 })),
    ...world.props.rocks.map((p) => ({ x: p.x, z: p.z, r: 1.2 + p.s })),
  ]
  const blocked = (pos: [number, number, number]) => {
    for (const o of solid) {
      if (Math.hypot(pos[0] - o.x, pos[2] - o.z) < o.r + 1.4) return true
    }
    return false
  }
  const first = frame(cx, cy, cz, f)
  if (!blocked(first.position)) return first
  for (const step of [5, -5, 10, -10, 16, -16, 23, -23, 31, -31]) {
    const alt = frame(cx, cy, cz, { ...f, azimuth: f.azimuth + step })
    if (!blocked(alt.position)) return alt
  }
  return first
}

export function shotsFor(world: WorldModel): Shot[] {
  const spec = ARCH_SPEC[world.site.twin.archetype]
  const core = world.core
  const cx = core?.rect.cx ?? 0
  const cz = core?.rect.cz ?? 0
  const coreW = core?.rect.w ?? 14
  const coreD = core?.rect.d ?? 14
  const wallTop = core ? core.floorY + core.wallH : 12
  const crown = wallTop + CROWN_HEIGHT[spec.crown]
  const e = world.extent
  const mid = wallTop * 0.55

  const gate = world.spaces.find((s) => s.role === 'GATE')
  const court = world.spaces.find((s) => s.role === 'COURT')
  const hall = world.spaces.find((s) => s.columns) ?? core
  const interiorIdentity = interiorIdentityFor(world)
  const inner = interiorIdentity?.space ?? core
  const innerSpawn = inner ? world.spawns[inner.space.id] : null
  const innerParent = inner?.space.parentId
    ? world.spaces.find((s) => s.space.id === inner.space.parentId) ?? null
    : null
  const innerVantage = innerParent ? world.spawns[innerParent.space.id] ?? innerSpawn : innerSpawn
  const signatureHotspot = world.site.hotspots.find(
    (h) => h.id === SIGNATURE_FEATURE[world.site.slug],
  )
  const signatureAnchor = anchorFor(world.anchors, signatureHotspot?.id ?? null)
  const signatureCamera = (() => {
    if (!signatureAnchor) return null
    const p = signatureAnchor.camera.position
    const t = signatureAnchor.camera.target
    const dx = p[0] - t[0]
    const dy = p[1] - t[1]
    const dz = p[2] - t[2]
    const distance = Math.hypot(dx, dy, dz) || 1
    const desired = Math.max(distance, SIGNATURE_DISTANCE[world.site.slug] ?? 14)
    return [
      t[0] + (dx / distance) * desired,
      t[1] + (dy / distance) * desired,
      t[2] + (dz / distance) * desired,
    ] as [number, number, number]
  })()

  /**
   * The hero subject is the monument and whatever stands immediately beside it —
   * a chhatri, a flanking minaret — not the whole walled enclosure, which would
   * shrink the building to a detail in its own portrait.
   */
  const heroHalfW = Math.min(e * 0.92, Math.max(coreW, coreD) * 1.15 + 6)
  const hero = clearFrame(cx, crown * 0.5, cz, {
    halfH: crown * 0.5,
    halfW: heroHalfW,
    fov: 38,
    azimuth: 24,
    elevation: -12,
    margin: 1.2,
    lift: 0.06,
  }, world)

  /** The axial view, taken from the gate if the gate stands further back. */
  const approachFit = frame(cx, crown * 0.5, cz, {
    halfH: crown * 0.5,
    halfW: Math.min(e * 0.8, Math.max(coreW, coreD) * 1.4),
    fov: 46,
    azimuth: 0,
    elevation: -14,
    lift: 0.04,
  })
  const gateZ = gate ? gate.rect.cz + gate.rect.d / 2 + 8 : -Infinity
  const approachZ = Math.max(approachFit.position[2], gateZ)

  const doorH = spec.door.h
  const entrance = frame(cx, (core?.floorY ?? 0) + doorH * 0.55, cz + coreD / 2, {
    halfH: doorH * 0.92,
    halfW: spec.door.w * 1.5,
    fov: 44,
    azimuth: 11,
    elevation: -6,
    lift: 0.1,
  })

  const superstructure = frame(cx, wallTop + (crown - wallTop) * 0.5, cz, {
    halfH: (crown - wallTop) * 0.62,
    halfW: Math.max(coreW, coreD) * 0.62,
    fov: 34,
    azimuth: 32,
    elevation: 6,
  })

  const enclosure = clearFrame(cx, crown * 0.42, cz, {
    halfH: crown * 0.5,
    halfW: e,
    fov: 52,
    azimuth: -18,
    elevation: -8,
  }, world)

  const golden = clearFrame(cx, crown * 0.5, cz, {
    halfH: crown * 0.52,
    halfW: heroHalfW,
    fov: 40,
    azimuth: -64,
    elevation: -10,
    margin: 1.18,
    lift: 0.05,
  }, world)

  const night = clearFrame(cx, crown * 0.5, cz, {
    halfH: crown * 0.52,
    halfW: heroHalfW,
    fov: 42,
    azimuth: 46,
    elevation: -9,
    margin: 1.18,
    lift: 0.05,
  }, world)

  /**
   * The plan reading: the whole enclosure from high enough to read as a plan —
   * but a minaret is taller than its own courtyard is wide, so the tower, not the
   * plan, decides the distance when it is the larger subject.
   */
  const aerial = frame(cx, crown * 0.35, cz, {
    halfH: Math.max(e * 0.66, crown * 0.62),
    halfW: e,
    fov: 46,
    azimuth: 34,
    elevation: 46,
  })

  const shots: Shot[] = [
    {
      id: 'hero',
      label: 'Hero',
      position: hero.position,
      target: hero.target,
      fov: 38,
      hold: 6,
      orbit: 0.03,
      caption: 'The monument in its landscape.',
    },
    {
      id: 'approach',
      label: 'Approach',
      position: [cx + approachFit.position[0] * 0.12, Math.max(6.5, crown * 0.16), approachZ],
      target: approachFit.target,
      fov: 46,
      hold: 5,
      orbit: 0,
      caption: 'The framed first view from the gate axis.',
    },
    {
      id: 'entrance',
      label: 'Entrance',
      position: entrance.position,
      target: entrance.target,
      fov: 44,
      hold: 5,
      orbit: 0.012,
      caption: 'The threshold the visitor walks through.',
    },
    {
      id: 'crown',
      label: 'Superstructure',
      position: superstructure.position,
      target: superstructure.target,
      fov: 34,
      hold: 5,
      orbit: 0.035,
      caption: 'The element that carries the skyline.',
    },
    {
      id: 'court',
      label: 'Enclosure',
      position: [
        court ? court.rect.cx + enclosure.position[0] * 0.5 : enclosure.position[0],
        (court?.floorY ?? 0) + Math.max(4, enclosure.position[1] * 0.5),
        enclosure.position[2],
      ],
      target: [cx, mid, cz],
      fov: 52,
      hold: 5,
      orbit: 0.02,
      caption: 'The enclosure that sets the viewing distance.',
    },
    {
      id: 'interior',
      label: 'Interior',
      position: [
        (hall?.rect.cx ?? cx) + (hall?.rect.w ?? 10) * 0.3,
        (hall?.floorY ?? 0) + 2.2,
        (hall?.rect.cz ?? cz) + (hall?.rect.d ?? 10) * 0.34,
      ],
      target: [
        hall?.rect.cx ?? cx,
        (hall?.floorY ?? 0) + 2.4,
        (hall?.rect.cz ?? cz) - (hall?.rect.d ?? 10) * 0.4,
      ],
      fov: 62,
      hold: 5,
      orbit: 0.01,
      caption: 'Inside the documented sequence of spaces.',
    },
    ...(inner
      ? [
          {
            id: 'inner-core',
            label: interiorIdentity?.label ?? 'Inner chamber',
            position: [
              innerVantage?.x ?? inner.rect.cx + inner.rect.w * 0.18,
              (innerParent?.floorY ?? inner.floorY) + 2.15,
              innerVantage?.z ?? inner.rect.cz + inner.rect.d * 0.26,
            ] as [number, number, number],
            target: [inner.rect.cx, inner.floorY + 1.65, inner.rect.cz] as [number, number, number],
            fov: 56,
            hold: 5,
            orbit: 0.008,
            caption: interiorIdentity?.caption ?? 'The monument-specific focal object inside the innermost documented space.',
          },
        ]
      : []),
    ...(signatureHotspot && signatureAnchor && signatureCamera
      ? [
          {
            id: 'signature-detail',
            label: signatureHotspot.name,
            position: signatureCamera,
            target: signatureAnchor.camera.target,
            fov: 38,
            hold: 5,
            orbit: 0.01,
            caption: signatureHotspot.summary,
          },
        ]
      : []),
    {
      id: 'golden',
      label: 'Golden hour',
      position: golden.position,
      target: golden.target,
      fov: 40,
      hold: 6,
      orbit: 0.026,
      timeOfDay: 'DUSK',
      caption: 'Raking light across the carved registers.',
    },
    {
      id: 'night',
      label: 'Night',
      position: night.position,
      target: night.target,
      fov: 42,
      hold: 6,
      orbit: 0.02,
      timeOfDay: 'NIGHT',
      caption: 'The complex after dark.',
    },
    {
      id: 'aerial',
      label: 'Aerial',
      position: aerial.position,
      target: [cx, (core?.floorY ?? 0) + 2, cz],
      fov: 46,
      hold: 6,
      orbit: 0.04,
      caption: 'The plan of the whole complex.',
    },
  ]

  return shots
}

/** Ordered tour: hero → approach → threshold → interior → detail → aerial. */
export function tourFor(world: WorldModel, components: ArchComponent[]): Shot[] {
  const base = shotsFor(world)
  const pick = (id: string) => base.find((s) => s.id === id)
  const detail = components.find((c) => c.id.startsWith('ac-inscription') || c.id.startsWith('ac-sculpture'))

  const list: Shot[] = []
  const order = ['hero', 'approach', 'entrance', 'interior', 'inner-core', 'signature-detail', 'crown', 'court', 'golden', 'aerial']
  for (const id of order) {
    const s = pick(id)
    if (s) list.push(s)
  }
  if (detail) {
    list.splice(5, 0, {
      id: `tour-${detail.id}`,
      label: detail.name,
      position: detail.camera.position,
      target: detail.camera.target,
      fov: 36,
      hold: 5,
      orbit: 0.01,
      caption: detail.name,
    })
  }
  return list
}

/** Default orbit frame: always fits the complex, never authored per site. */
export function orbitFrame(world: WorldModel) {
  const hero = shotsFor(world)[0]
  const reach = Math.hypot(hero.position[0], hero.position[2] - (world.core?.rect.cz ?? 0))
  return {
    camera: hero.position,
    target: hero.target,
    minDistance: Math.max(10, world.extent * 0.22),
    maxDistance: Math.max(world.ground * 1.25, reach * 1.6),
  }
}
