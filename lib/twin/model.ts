/**
 * The unified world model for a heritage site.
 *
 * Exterior and interior are not two scenes. A monument, its grounds, its
 * courtyards and its documented rooms are solved into one coordinate frame, so
 * walking through a doorway is genuinely walking through a doorway — the visitor
 * can turn around inside the sanctum and see the garden they crossed.
 *
 * Every rectangle here traces back to a documented space on the site record. The
 * mapping from the schematic plan to metres is a reconstruction, and the viewer
 * says so; what it never does is invent a room that the record does not contain.
 */

import type { EvidenceLevel, HeritageSite, InteriorSpace } from '@/lib/heritage/types'
import type { HotspotAnchor } from './anchors'
import type { CollisionWorld, Platform } from './collision'
import type { ColumnGroup } from './columns'
import type { EnvProfile } from './environment'
import type { Extras } from './extras'
import type { EvidenceClass } from './materials'
import type { WorldProps } from './props'

export type Side = 'NZ' | 'PZ' | 'NX' | 'PX'

export interface Rect {
  cx: number
  cz: number
  w: number
  d: number
}

export type StructureRole = 'CORE' | 'BUILDING' | 'COURT' | 'GATE' | 'TERRACE'

export interface WorldSpace {
  space: InteriorSpace
  rect: Rect
  role: StructureRole
  /** Walking surface inside this space. */
  floorY: number
  wallH: number
  roofed: boolean
  /** Colonnade rhythm inside halls and galleries. */
  columns: boolean
  /** Face the approach route arrives on. */
  doorSide: Side
  /** Depth in the documented room graph. */
  depth: number
  /** How well attested this space's geometry is. */
  evidenceClass: EvidenceClass
}

export interface WallSeg {
  x: number
  z: number
  w: number
  d: number
  h: number
  /** Centre height. */
  y: number
  kind: 'WALL' | 'PARAPET' | 'LINTEL'
  spaceId: string
}

export interface Doorway {
  x: number
  z: number
  /** The opening runs along the x axis. */
  alongX: boolean
  w: number
  h: number
  /** Floor height at the threshold. */
  sill: number
  spaceId: string
}

export interface Portal {
  id: string
  label: string
  detail: string
  /** Threshold, world space. */
  position: [number, number, number]
  /** Where the visitor stands after entering. */
  inside: [number, number]
  /** Where the visitor stands after leaving. */
  outside: [number, number]
  /** Yaw to face when entering (looking in). */
  yawIn: number
  radius: number
  spaceId: string
  evidence: EvidenceLevel
  sourceIds: string[]
  accessibility: string | null
  /** Set when the record says the space is closed to visitors. */
  restricted: boolean
}

export interface PathSeg {
  /** Centre. */
  x: number
  z: number
  w: number
  d: number
  y: number
}

/**
 * A lane the visitor has to be able to walk down: the rectangle a walker's
 * centre must be free to occupy through a doorway, up a flight of steps or along
 * a paved path. Route solving declares these, and every generator that puts
 * something solid on the ground — columns first of all — has to respect them, or
 * the way in exists on the plan and not in the world.
 */
export interface Clearway {
  rect: Rect
  /** Axis an obstacle must move along to get out of the lane. */
  across: 'x' | 'z'
}

export interface StepRun {
  /** Space whose plinth this flight climbs onto. */
  spaceId: string
  x: number
  z: number
  /** Width across the run. */
  w: number
  from: number
  to: number
  side: Side
  count: number
  /** How far the flight projects from the threshold; see `MAX_SLOPE` in routes. */
  span: number
}

export interface WaterFeature {
  kind: 'CHANNEL' | 'TANK' | 'RIVER' | 'POOL'
  x: number
  z: number
  w: number
  d: number
  y: number
}

export interface WorldModel {
  site: HeritageSite
  seed: string
  /** Radius of the ground plane and terrain patch. */
  ground: number
  /** Radius inside which terrain is levelled for the built complex. */
  flatRadius: number
  planScale: number
  spaces: WorldSpace[]
  core: WorldSpace | null
  walls: WallSeg[]
  lintels: WallSeg[]
  doorways: Doorway[]
  portals: Portal[]
  paths: PathSeg[]
  steps: StepRun[]
  /** Lanes that must stay walkable; see `Clearway`. */
  clearways: Clearway[]
  water: WaterFeature[]
  platforms: Platform[]
  collision: CollisionWorld
  env: EnvProfile
  props: WorldProps
  columns: ColumnGroup[]
  extras: Extras
  /**
   * Where each documented hotspot actually stands in this world. The record's own
   * coordinate is a hint in a monument-at-origin frame; this is the resolved
   * position on the built element it names. See `./anchors`.
   */
  anchors: HotspotAnchor[]
  /** Spawn on the approach axis, facing the monument. */
  spawnOutside: { x: number; z: number; yaw: number }
  /** Spawn per documented space, so any room can be walked into directly. */
  spawns: Record<string, { x: number; z: number; yaw: number }>
  /** Furthest built extent from the origin, for camera framing. */
  extent: number
}

export function rectContains(r: Rect, x: number, z: number, pad = 0): boolean {
  return (
    x >= r.cx - r.w / 2 - pad &&
    x <= r.cx + r.w / 2 + pad &&
    z >= r.cz - r.d / 2 - pad &&
    z <= r.cz + r.d / 2 + pad
  )
}

export function rectOverlap(a: Rect, b: Rect): number {
  const ox = Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2)
  const oz = Math.min(a.cz + a.d / 2, b.cz + b.d / 2) - Math.max(a.cz - a.d / 2, b.cz - b.d / 2)
  if (ox <= 0 || oz <= 0) return 0
  return (ox * oz) / (a.w * a.d)
}

/** Which face of `from` points at `to`. */
export function sideToward(from: Rect, to: Rect): Side {
  const dx = to.cx - from.cx
  const dz = to.cz - from.cz
  if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 'PX' : 'NX'
  return dz > 0 ? 'PZ' : 'NZ'
}

export function sideNormal(side: Side): [number, number] {
  switch (side) {
    case 'PZ': return [0, 1]
    case 'NZ': return [0, -1]
    case 'PX': return [1, 0]
    default: return [-1, 0]
  }
}

/** Camera yaw that looks along a side normal, for rotation.order YXZ. */
export function yawAlong(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz)
}

/** Room the visitor is standing in, innermost first. */
export function spaceAt(model: WorldModel, x: number, z: number): WorldSpace | null {
  let best: WorldSpace | null = null
  for (const s of model.spaces) {
    if (!rectContains(s.rect, x, z)) continue
    if (!best || s.depth > best.depth || (s.roofed && !best.roofed)) best = s
  }
  return best
}

export function isIndoors(model: WorldModel, x: number, z: number): boolean {
  const s = spaceAt(model, x, z)
  return Boolean(s?.roofed)
}

export type { InteriorSpace, EvidenceLevel, HeritageSite }
