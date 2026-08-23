/**
 * Maps the documented schematic plan onto metres.
 *
 * `InteriorSpace.plan` is a normalised rectangle — the record's own statement of
 * where a space sits relative to the others. This turns that into a walkable
 * footprint without adding or removing a single space.
 */

import type { HeritageSite, InteriorSpace } from '@/lib/heritage/types'
import type { EvidenceClass } from './materials'
import type { Rect, StructureRole } from './model'
import { ARCH_SPEC, type ArchSpec } from './specs'

export interface PlannedSpace {
  space: InteriorSpace
  rect: Rect
  role: StructureRole
  depth: number
  roofed: boolean
  columns: boolean
  evidenceClass: EvidenceClass
}

export interface PlanResult {
  spaces: PlannedSpace[]
  core: PlannedSpace | null
  scale: number
  /** Half-extent of the built complex on each axis. */
  extentX: number
  extentZ: number
}

const ROOFED: Record<InteriorSpace['kind'], boolean> = {
  ENTRANCE: true,
  COURTYARD: false,
  HALL: true,
  SANCTUM: true,
  GALLERY: true,
  CHAMBER: true,
  TERRACE: false,
}

const CORE_PRIORITY: Record<InteriorSpace['kind'], number> = {
  SANCTUM: 5, CHAMBER: 4, HALL: 2, GALLERY: 1, ENTRANCE: 0, COURTYARD: 0, TERRACE: 0,
}

function depthOf(site: HeritageSite, space: InteriorSpace): number {
  let d = 0
  let cur: InteriorSpace | undefined = space
  const seen = new Set<string>()
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id)
    cur = site.spaces.find((s) => s.id === cur!.parentId)
    d++
  }
  return d
}

function roleOf(kind: InteriorSpace['kind'], core: boolean): StructureRole {
  if (core) return 'CORE'
  if (kind === 'ENTRANCE') return 'GATE'
  if (kind === 'COURTYARD') return 'COURT'
  if (kind === 'TERRACE') return 'TERRACE'
  return 'BUILDING'
}

/** Documented geometry vs. reconstructed massing, for the Evidence Lens. */
function evidenceClassOf(space: InteriorSpace): EvidenceClass {
  switch (space.evidence) {
    case 'VERIFIED_FACT':
      return 'DOCUMENTED'
    case 'INTERPRETATION':
      return 'INTERPRETIVE'
    case 'AI_ASSISTED_SUMMARY':
      return 'AI_ASSISTED'
    default:
      return 'RECONSTRUCTED'
  }
}

function unionRect(a: Rect, b: Rect, pad: number): Rect {
  const minX = Math.min(a.cx - a.w / 2, b.cx - b.w / 2 - pad)
  const maxX = Math.max(a.cx + a.w / 2, b.cx + b.w / 2 + pad)
  const minZ = Math.min(a.cz - a.d / 2, b.cz - b.d / 2 - pad)
  const maxZ = Math.max(a.cz + a.d / 2, b.cz + b.d / 2 + pad)
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ }
}

export function planSite(site: HeritageSite, spec: ArchSpec = ARCH_SPEC[site.twin.archetype]): PlanResult {
  if (site.spaces.length === 0) {
    return { spaces: [], core: null, scale: spec.ground * spec.planScale, extentX: 0, extentZ: 0 }
  }

  const scale = spec.ground * spec.planScale
  const depths = new Map(site.spaces.map((s) => [s.id, depthOf(site, s)]))

  // Innermost documented room becomes the monument core.
  const coreId = [...site.spaces]
    .sort((a, b) => {
      const p = CORE_PRIORITY[b.kind] - CORE_PRIORITY[a.kind]
      if (p !== 0) return p
      return (depths.get(b.id) ?? 0) - (depths.get(a.id) ?? 0)
    })[0]?.id

  const planned: PlannedSpace[] = site.spaces.map((space) => {
    const core = space.id === coreId
    const role = roleOf(space.kind, core)
    const minSize = role === 'COURT' || role === 'TERRACE' ? 10 : 6.5
    let w = Math.max(space.plan.w * scale, minSize)
    let d = Math.max(space.plan.h * scale, minSize)
    if (core) {
      w = Math.min(Math.max(w, spec.coreW[0]), spec.coreW[1])
      d = Math.min(Math.max(d, spec.coreD[0]), spec.coreD[1])
    }
    return {
      space,
      rect: {
        cx: (space.plan.x + space.plan.w / 2) * scale,
        cz: (space.plan.y + space.plan.h / 2) * scale,
        w,
        d,
      },
      role,
      depth: depths.get(space.id) ?? 0,
      roofed: ROOFED[space.kind],
      columns: space.kind === 'HALL' || space.kind === 'GALLERY',
      evidenceClass: evidenceClassOf(space),
    }
  })

  const core = planned.find((p) => p.role === 'CORE') ?? null

  // A terrace that carries the core should actually carry it.
  if (core) {
    for (const p of planned) {
      if (p.role === 'TERRACE' && core.space.parentId === p.space.id) {
        p.rect = unionRect(p.rect, core.rect, 3.5)
      }
    }
  }

  // Centre the whole complex on the origin so orbit framing and terrain agree.
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of planned) {
    minX = Math.min(minX, p.rect.cx - p.rect.w / 2)
    maxX = Math.max(maxX, p.rect.cx + p.rect.w / 2)
    minZ = Math.min(minZ, p.rect.cz - p.rect.d / 2)
    maxZ = Math.max(maxZ, p.rect.cz + p.rect.d / 2)
  }
  const ox = (minX + maxX) / 2
  const oz = (minZ + maxZ) / 2
  for (const p of planned) {
    p.rect = { ...p.rect, cx: p.rect.cx - ox, cz: p.rect.cz - oz }
  }

  return {
    spaces: planned,
    core,
    scale,
    extentX: (maxX - minX) / 2,
    extentZ: (maxZ - minZ) / 2,
  }
}
