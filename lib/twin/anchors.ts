/**
 * Anchors a documented hotspot onto the geometry it describes.
 *
 * A record's `Hotspot.position` is a hand-authored hint in a monument-at-origin
 * frame: the dome overhead, the portal on the approach face, a wheel on the south
 * flank. The solved world puts the monument wherever its documented plan puts it
 * — at the Taj that is 27 m off the centre of the charbagh — so a marker used
 * straight from the record floats in a garden instead of sitting on the building.
 *
 * This resolves each hotspot onto the built element the record names, using the
 * authored point only for the *direction* it indicates. Nothing here invents a
 * feature: it decides where an already-documented one stands in this world, and
 * says which element it landed on so the inspector can size a highlight around
 * it. A hotspot naming something the twin does not model individually — an iron
 * pillar, a monolithic ratha — resolves to the documented space that contains it
 * and is flagged `onFloor`, which reads as "the record places this in this room".
 */

import type { Hotspot } from '@/lib/heritage/types'
import type { Extras } from './extras'
import type { Rect, WorldSpace } from './model'
import { rectContains } from './model'
import { fitDistance } from './cinematic'
import { CROWN_HEIGHT, type ArchSpec } from './specs'

export type AnchorOn =
  | 'CROWN'
  | 'MINARET'
  | 'DOOR'
  | 'GATE'
  | 'WALL'
  | 'PLINTH'
  | 'COLUMNS'
  | 'COURT'
  | 'GROUND'
  | 'SPACE'
  | 'WHEEL'
  | 'HORSE'
  | 'RECORD'

export interface HotspotAnchor {
  id: string
  /** Where the feature the record names actually stands in this world. */
  position: [number, number, number]
  /** Camera that frames it, solved from the feature's own size. */
  camera: { position: [number, number, number]; target: [number, number, number] }
  /** Built element it resolved onto. */
  on: AnchorOn
  /** Documented space it resolved into, when it is inside one. */
  spaceId: string | null
  /** Half-size of the feature, for the inspector's highlight box. */
  size: number
  /** Set when the feature stands on a floor the visitor can reach. */
  onFloor: boolean
}

interface Ctx {
  spaces: WorldSpace[]
  core: WorldSpace | null
  extras: Extras
  spec: ArchSpec
  groundAt: (x: number, z: number) => number
}

interface Dir {
  x: number
  z: number
}

/** Authored direction from the monument centre; the approach face when unstated. */
function dirOf(p: [number, number, number]): Dir {
  const len = Math.hypot(p[0], p[2])
  if (len < 1.2) return { x: 0, z: 1 }
  return { x: p[0] / len, z: p[2] / len }
}

/**
 * A point `out` metres clear of the face of `r` that `dir` points at, offset
 * `lateral` along that face and kept inside it.
 */
function onFace(r: Rect, dir: Dir, out: number, lateral: number) {
  const axisX = Math.abs(dir.x) > Math.abs(dir.z)
  const sx = dir.x >= 0 ? 1 : -1
  const sz = dir.z >= 0 ? 1 : -1
  if (axisX) {
    const room = Math.max(0, r.d / 2 - 1.2)
    return { x: r.cx + sx * (r.w / 2 + out), z: r.cz + Math.max(-room, Math.min(room, lateral)) }
  }
  const room = Math.max(0, r.w / 2 - 1.2)
  return { x: r.cx + Math.max(-room, Math.min(room, lateral)), z: r.cz + sz * (r.d / 2 + out) }
}

const STOP = new Set([
  'the', 'of', 'and', 'a', 'with', 'site', 'stone', 'rock', 'cut', 'rock-cut', 'great',
  'central', 'raised', 'open', 'air', 'principal', 'main',
])

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))

/**
 * The documented space a hotspot reads as belonging to: shared vocabulary first
 * — "Rock-cut mandapa" against "Rock-cut mandapa" is not a coincidence — then the
 * space nearest the authored point once it is put in the monument's frame.
 */
function spaceFor(h: Hotspot, ctx: Ctx, near: Dir & { d: number }): WorldSpace | null {
  if (h.spaceId) {
    const named = ctx.spaces.find((s) => s.space.id === h.spaceId)
    if (named) return named
  }
  const want = words(h.name)
  let best: WorldSpace | null = null
  let bestScore = -1
  const cx = ctx.core?.rect.cx ?? 0
  const cz = ctx.core?.rect.cz ?? 0
  const px = cx + near.x * near.d
  const pz = cz + near.z * near.d
  for (const s of ctx.spaces) {
    const have = words(s.space.name)
    let overlap = 0
    for (const w of want) if (have.some((v) => v === w || v.startsWith(w) || w.startsWith(v))) overlap++
    const reach = Math.max(s.rect.w, s.rect.d) / 2
    const dist = Math.hypot(s.rect.cx - px, s.rect.cz - pz)
    const score = overlap * 10 - Math.max(0, dist - reach) * 0.12
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}

interface Resolved {
  p: [number, number, number]
  on: AnchorOn
  size: number
  spaceId?: string | null
  onFloor?: boolean
}

/**
 * True where a point on the *outside* of a wall is in fact inside something else
 * — the cliff a chamber was excavated from, or an adjoining room. A marker for a
 * painted or carved surface has to be on the side of the wall the visitor can
 * stand on, and at Ajanta the outside of the shrine is solid basalt.
 */
function buried(ctx: Ctx, x: number, z: number, self: WorldSpace): boolean {
  const c = ctx.extras.cliff
  if (c) {
    for (const s of [c.back, ...c.wings]) {
      if (Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2) return true
    }
  }
  for (const s of ctx.spaces) {
    if (s === self || !s.roofed) continue
    if (rectContains(s.rect, x, z)) return true
  }
  return false
}

/** Nearest of a set of placed objects to the authored direction. */
function nearest<T extends { x: number; z: number }>(items: T[], px: number, pz: number): T {
  let best = items[0]
  let bd = Infinity
  for (const it of items) {
    const d = Math.hypot(it.x - px, it.z - pz)
    if (d < bd) {
      bd = d
      best = it
    }
  }
  return best
}

function resolve(h: Hotspot, ctx: Ctx): Resolved {
  const name = h.name.toLowerCase()
  const dir = dirOf(h.position)
  const core = ctx.core
  const authoredR = Math.hypot(h.position[0], h.position[2])
  const near = { ...dir, d: authoredR }
  const axisX = Math.abs(dir.x) > Math.abs(dir.z)
  const lat = axisX ? h.position[2] : h.position[0]
  const cx = core?.rect.cx ?? 0
  const cz = core?.rect.cz ?? 0

  const inSpace = (s: WorldSpace, fromCentre = 0.42): Resolved => {
    const x = s.rect.cx + dir.x * s.rect.w * fromCentre
    const z = s.rect.cz + dir.z * s.rect.d * fromCentre
    return {
      p: [x, s.floorY + 1.5, z],
      on: 'SPACE',
      size: 1.6,
      spaceId: s.space.id,
      onFloor: true,
    }
  }

  // Objects the world places individually.
  if (/minaret/.test(name) && ctx.extras.minarets.length) {
    const mn = nearest(ctx.extras.minarets, cx + dir.x * 30, cz + dir.z * 30)
    const out = mn.r * 1.9
    return {
      p: [mn.x + dir.x * out, mn.h * 0.68, mn.z + dir.z * out],
      on: 'MINARET',
      size: mn.h * 0.22,
    }
  }
  if (/wheel/.test(name) && ctx.extras.wheels.length) {
    const wh = nearest(ctx.extras.wheels, cx + h.position[0], cz + h.position[2])
    const sz = wh.z > cz ? 1 : -1
    return { p: [wh.x, wh.y + wh.r * 0.2, wh.z + sz * (wh.r * 0.3 + 0.6)], on: 'WHEEL', size: wh.r }
  }
  if (/horse/.test(name) && ctx.extras.horses.length) {
    const ho = nearest(ctx.extras.horses, cx + h.position[0], cz + h.position[2])
    return { p: [ho.x, ctx.groundAt(ho.x, ho.z) + 2.4, ho.z], on: 'HORSE', size: 1.8, onFloor: true }
  }

  if (!core) {
    const s = spaceFor(h, ctx, near)
    return s ? inSpace(s) : { p: h.position, on: 'RECORD', size: 2 }
  }

  const r = core.rect
  const wallTop = core.floorY + core.wallH
  const crownH = CROWN_HEIGHT[ctx.spec.crown]
  const door = ctx.spec.door

  /**
   * Absence, before anything else. "Site of the collapsed deul" names a tower
   * that no longer stands, and the word *deul* would otherwise match the
   * superstructure rule and hang the marker 34 m up on a tower that is still
   * there — a visual claim the record explicitly refuses to make. What survives
   * is the ground the structure stood on, so that is where the marker goes, in
   * the direction the record points and at the distance it gives.
   */
  if (/collapse|footprint|ruin|foundation|fallen|no longer|razed|\blost\b|vanish/.test(name)) {
    const reach = Math.max(authoredR, Math.max(r.w, r.d) / 2 + 3)
    const x = r.cx + dir.x * reach
    const z = r.cz + dir.z * reach
    const host = ctx.spaces.find((s) => s !== core && rectContains(s.rect, x, z, 1)) ?? null
    return {
      p: [x, ctx.groundAt(x, z) + 1.6, z],
      on: 'GROUND',
      size: 2.6,
      spaceId: host?.space.id ?? null,
      onFloor: true,
    }
  }

  // The superstructure that carries the skyline.
  if (/dome|gumbad|shikhara|vimana|deul|spire|storey|tower|jagamohana|superstructure|\broof\b|\bminar\b/.test(name)) {
    const rad = Math.min(r.w, r.d) * 0.46
    return {
      p: [r.cx + dir.x * rad, wallTop + crownH * 0.52, r.cz + dir.z * rad],
      on: 'CROWN',
      size: crownH * 0.42,
    }
  }

  /**
   * Features the record documents but the twin does not model as their own
   * geometry — an iron pillar, a monolithic ratha, a stupa in an apse. They
   * belong to a room, and that is what the marker says.
   */
  if (/iron pillar|stupa|ratha|nandi|\blinga/.test(name) || h.kind === 'ARTEFACT') {
    const s = spaceFor(h, ctx, near)
    if (s) return inSpace(s, 0.3)
  }

  // Inscribed bands run beside and above the opening they frame.
  if (h.kind === 'INSCRIPTION' || /inscription|calligraph|epigraph/.test(name)) {
    const side = onFace(r, dir, ctx.spec.wallT + 1.0, Math.sign(lat || 1) * (door.w * 0.72 + 1.1))
    return {
      p: [side.x, core.floorY + door.h + 1.2, side.z],
      on: 'WALL',
      size: 2.2,
      spaceId: core.space.id,
    }
  }

  if (/gopura|gateway|darwaza|torana|\bgate\b/.test(name)) {
    const gate = ctx.spaces.find((s) => s.role === 'GATE')
    if (gate) {
      const g = onFace(gate.rect, { x: 0, z: 1 }, Math.min(ctx.spec.wallT, 1.6) + 1.4, lat * 0.4)
      return {
        p: [g.x, gate.floorY + gate.wallH * 0.64, g.z],
        on: 'GATE',
        size: gate.wallH * 0.34,
        spaceId: gate.space.id,
      }
    }
  }

  if (/iwan|pishtaq|portal|doorway|\bdoor\b|dvara|entrance|threshold/.test(name)) {
    const side = onFace(r, dir, Math.min(ctx.spec.wallT, 1.6) + 1.4, 0)
    return {
      p: [side.x, core.floorY + door.h * 0.58, side.z],
      on: 'DOOR',
      size: door.h * 0.5,
      spaceId: core.space.id,
    }
  }

  if (/colonnade|column|pillar|mandapa|aisle|screen|hypostyle|veranda/.test(name)) {
    const pillared = ctx.spaces.filter((s) => s.columns)
    const s =
      (pillared.length
        ? nearest(
            pillared.map((sp) => ({ x: sp.rect.cx, z: sp.rect.cz, sp })),
            cx + h.position[0],
            cz + h.position[2],
          ).sp
        : null) ?? spaceFor(h, ctx, near)
    if (s) {
      const x = s.rect.cx + dir.x * s.rect.w * 0.3
      const z = s.rect.cz + dir.z * s.rect.d * 0.3
      return {
        p: [x, s.floorY + s.wallH * 0.58, z],
        on: 'COLUMNS',
        size: s.wallH * 0.36,
        spaceId: s.space.id,
        onFloor: true,
      }
    }
  }

  if (/court|bazaar|street|prakara|charbagh|garden|tank|enclosure|plaza/.test(name)) {
    const s = spaceFor(h, ctx, near)
    if (s) {
      const x = s.rect.cx + dir.x * s.rect.w * 0.34
      const z = s.rect.cz + dir.z * s.rect.d * 0.34
      return { p: [x, s.floorY + 2.2, z], on: 'COURT', size: 2.4, spaceId: s.space.id, onFloor: true }
    }
  }

  if (/platform|jagati|plinth|adhisthana|terrace|pista|chabutra/.test(name)) {
    const s = ctx.spaces.find((sp) => sp.role === 'TERRACE') ?? core
    const p = onFace(s.rect, dir, 2.6, lat * 0.5)
    return { p: [p.x, s.floorY + 1.1, p.z], on: 'PLINTH', size: 2.4, spaceId: s.space.id }
  }

  /**
   * The surface programme: carved registers, inlay, plaster, painting, and the
   * conservation record that reads them. All of it sits on a wall face, and which
   * wall is the one the authored point pointed at.
   *
   * Which *side* of that wall matters as much as which wall. A painted surface at
   * Ajanta is on the inside of a chamber cut into a cliff; hung on the outer face
   * it would sit buried in the rock. So when the record's own coordinate falls
   * inside the host room, the marker hugs the inner face and reads as something
   * the visitor sees from the floor of that room.
   */
  const host = spaceFor(h, ctx, near)
  const high = /facade|window|register|band|frieze|cornice|exterior/.test(name)
  /**
   * The room the record's own coordinate lands in, innermost first. When the
   * authored point is indoors, the surface it names is that room's wall seen from
   * inside it, not the outside of the mass.
   *
   * The coordinate is read in both frames the catalogue uses. Some records are
   * authored about the core — the Taj's dome is `[0, 20, 0]`, and the dome stands
   * over the mausoleum, 27 m off the centre of the charbagh — and some about the
   * plan as a whole, where Ajanta's painted surface at `[-7, 7, -6]` is the west
   * aisle of the excavation rather than a point in the rock behind the apse.
   * Whichever reading lands inside a documented room is the one the record meant.
   */
  let indoor: WorldSpace | null = null
  if (!high) {
    for (const s of ctx.spaces) {
      if (!s.roofed) continue
      const named =
        rectContains(s.rect, cx + h.position[0], cz + h.position[2], 0.5) ||
        rectContains(s.rect, h.position[0], h.position[2], 0.5)
      if (!named) continue
      if (!indoor || s.depth > indoor.depth) indoor = s
    }
  }
  const walled =
    indoor ?? (host && (host.roofed || host.role === 'CORE' || host.role === 'BUILDING') ? host : core)
  /**
   * Which *side* of that wall. Outside by default — a carved register is read
   * from the approach. But when the outer face turns out to be buried in the mass
   * the room was cut from, the surface the record names can only be the inner one,
   * seen from the floor of that room.
   */
  const outer = onFace(walled.rect, dir, ctx.spec.wallT + 1.3, lat)
  const inner = Boolean(indoor) || (walled.roofed && !high && buried(ctx, outer.x, outer.z, walled))
  const face = inner ? onFace(walled.rect, dir, -1.1, lat) : outer
  return {
    p: [face.x, walled.floorY + walled.wallH * (high ? 0.74 : 0.44), face.z],
    on: 'WALL',
    size: high ? 3 : 2.2,
    spaceId: walled.space.id,
    onFloor: inner,
  }
}

/**
 * A camera that frames the feature: far enough back to contain it at the
 * inspector's field of view, standing off along the line from the monument
 * centre so the view is never from inside the mass, and looking slightly up at
 * anything above the wall head.
 */
function cameraFor(res: Resolved, ctx: Ctx, wallTop: number): HotspotAnchor['camera'] {
  const [x, y, z] = res.p
  const cx = ctx.core?.rect.cx ?? 0
  const cz = ctx.core?.rect.cz ?? 0
  let ox = x - cx
  let oz = z - cz
  const len = Math.hypot(ox, oz)
  if (len < 0.8) {
    ox = 0
    oz = 1
  } else {
    ox /= len
    oz /= len
  }
  const d = fitDistance(Math.max(2, res.size), Math.max(2, res.size), 34, 1.5)
  const el = ((y > wallTop ? -11 : 5) * Math.PI) / 180
  const flat = d * Math.cos(el)
  const eye = Math.max(ctx.groundAt(x + ox * flat, z + oz * flat) + 1.7, y + d * Math.sin(el))
  return {
    position: [x + ox * flat, eye, z + oz * flat],
    target: [x, y, z],
  }
}

export function anchorHotspots(ctx: Ctx, hotspots: Hotspot[]): HotspotAnchor[] {
  const wallTop = ctx.core ? ctx.core.floorY + ctx.core.wallH : 8
  return hotspots.map((h) => {
    const res = resolve(h, ctx)
    const floor = ctx.groundAt(res.p[0], res.p[2])
    // Never below the ground the visitor stands on.
    const p: [number, number, number] = [res.p[0], Math.max(res.p[1], floor + 1.2), res.p[2]]
    const out = { ...res, p }
    return {
      id: h.id,
      position: p,
      camera: cameraFor(out, ctx, wallTop),
      on: res.on,
      spaceId: res.spaceId ?? null,
      size: res.size,
      onFloor: res.onFloor ?? false,
    }
  })
}

/** The anchor for a hotspot id, or null when the site documents none. */
export function anchorFor(anchors: HotspotAnchor[], id: string | null): HotspotAnchor | null {
  if (!id) return null
  return anchors.find((a) => a.id === id) ?? null
}
