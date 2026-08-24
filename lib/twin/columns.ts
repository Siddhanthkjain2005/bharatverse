/**
 * Column layouts.
 *
 * Generated in the world layer, not the renderer, so that the pillars the
 * visitor sees are the pillars they cannot walk through. Because they are real
 * obstacles they also have to keep out of the routes: a colonnade is set out with
 * an open centre line, and any pillar that still lands in a doorway's lane is
 * moved into the next bay or, failing that, left out.
 */

import { rectContains, type Clearway, type Rect, type WorldSpace } from './model'
import type { ArchSpec } from './specs'

export type ColumnStyleKey = 'MUGHAL' | 'DRAVIDIAN' | 'NAGARA' | 'ROCK' | 'VIJAYANAGARA'

export interface ColumnGroup {
  spaceId: string
  positions: { x: number; z: number }[]
  y: number
  h: number
  style: ColumnStyleKey
  radius: number
  /** Cloisters ring a court; halls fill it. */
  cloister: boolean
}

export const COLUMN_STYLE: Record<ArchSpec['facade'], ColumnStyleKey> = {
  PISHTAQ: 'MUGHAL',
  JANGHA: 'NAGARA',
  FLUTED: 'MUGHAL',
  ROCK: 'ROCK',
  DRAVIDIAN: 'DRAVIDIAN',
  COLONNADE: 'VIJAYANAGARA',
}

/**
 * Bay count across a run of columns.
 *
 * Always odd, which puts an even number of pillars in the row and therefore
 * leaves the centre line of the space open. That is how a mandapa or a cloister
 * is actually set out — the axial bay is the one you walk down — and it means the
 * route in from the doorway is clear by construction rather than by repair.
 */
function bays(span: number, spacing: number): number {
  const n = Math.max(1, Math.round(span / spacing))
  return n % 2 === 1 ? n : n + 1
}

/** Perimeter-plus-aisle grid: leaves the centre of a hall walkable. */
export function hallColumns(
  cx: number,
  cz: number,
  w: number,
  d: number,
  spacing = 5,
  inset = 2.8,
): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = []
  const iw = Math.max(2.5, w - inset * 2)
  const id = Math.max(2.5, d - inset * 2)
  const nx = bays(iw, spacing)
  const nz = bays(id, spacing)
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue
      out.push({ x: cx - iw / 2 + (iw * i) / nx, z: cz - id / 2 + (id * j) / nz })
    }
  }
  return out
}

/** Cloister running just inside a court's parapet. */
export function cloisterColumns(
  cx: number,
  cz: number,
  w: number,
  d: number,
  spacing = 5.6,
): { x: number; z: number }[] {
  const inset = 2.2
  const iw = w - inset * 2
  const id = d - inset * 2
  const out: { x: number; z: number }[] = []
  const nx = bays(iw, spacing)
  const nz = bays(id, spacing)
  for (let i = 0; i <= nx; i++) {
    const x = cx - iw / 2 + (iw * i) / nx
    out.push({ x, z: cz - id / 2 })
    out.push({ x, z: cz + id / 2 })
  }
  for (let j = 1; j < nz; j++) {
    const z = cz - id / 2 + (id * j) / nz
    out.push({ x: cx - iw / 2, z })
    out.push({ x: cx + iw / 2, z })
  }
  return out
}

/**
 * Keeps a set of pillars out of the walking lanes.
 *
 * A pillar that lands in a lane is nudged sideways to the edge of it, so the
 * colonnade keeps its rhythm and simply widens the bay the visitor walks down. It
 * is dropped only when the nudge has nowhere to go — dead on the centre line,
 * outside the room, or on top of the next pillar. Whatever survives is guaranteed
 * clear of every lane, so the route cannot be blocked by decoration.
 */
function clearRoutes(
  positions: { x: number; z: number }[],
  clearways: Clearway[],
  pad: number,
  bound: Rect,
): { x: number; z: number }[] {
  if (clearways.length === 0) return positions
  const kept: { x: number; z: number }[] = []
  for (const start of positions) {
    let p = start
    let ok = true
    for (const cw of clearways) {
      if (!rectContains(cw.rect, p.x, p.z, pad)) continue
      const onX = cw.across === 'x'
      const centre = onX ? cw.rect.cx : cw.rect.cz
      const half = (onX ? cw.rect.w : cw.rect.d) / 2
      const cur = onX ? p.x : p.z
      if (Math.abs(cur - centre) < 0.05) {
        ok = false
        break
      }
      const away = centre + Math.sign(cur - centre) * (half + pad + 0.04)
      const lo = (onX ? bound.cx - bound.w / 2 : bound.cz - bound.d / 2) + pad
      const hi = (onX ? bound.cx + bound.w / 2 : bound.cz + bound.d / 2) - pad
      if (away < lo || away > hi) {
        ok = false
        break
      }
      p = onX ? { x: away, z: p.z } : { x: p.x, z: away }
    }
    if (!ok) continue
    // A nudge out of one lane can land in another, and two nudges can converge on
    // the same spot; both are cheaper to drop than to solve.
    if (clearways.some((cw) => rectContains(cw.rect, p.x, p.z, pad))) continue
    if (kept.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < pad * 1.7)) continue
    kept.push(p)
  }
  return kept
}

export function columnGroups(spaces: WorldSpace[], spec: ArchSpec, clearways: Clearway[] = []): ColumnGroup[] {
  const style = COLUMN_STYLE[spec.facade]
  const out: ColumnGroup[] = []
  const cloisterLands: ArchSpec['land'][] = ['TEMPLE_COURT', 'DESERT_COMPLEX', 'BOULDER_FIELD', 'PLAZA', 'FORT_BASTION']

  for (const s of spaces) {
    if (s.columns && s.roofed) {
      const spacing = style === 'DRAVIDIAN' ? 5.6 : 4.8
      const radius = style === 'DRAVIDIAN' || style === 'ROCK' ? 0.72 : 0.56
      out.push({
        spaceId: s.space.id,
        positions: clearRoutes(
          hallColumns(s.rect.cx, s.rect.cz, s.rect.w, s.rect.d, spacing, 2.9),
          clearways,
          radius + 0.16,
          s.rect,
        ),
        y: s.floorY,
        h: s.wallH - 0.9,
        style,
        radius,
        cloister: false,
      })
    } else if (s.role === 'COURT' && cloisterLands.includes(spec.land)) {
      out.push({
        spaceId: s.space.id,
        positions: clearRoutes(
          cloisterColumns(s.rect.cx, s.rect.cz, s.rect.w, s.rect.d),
          clearways,
          0.76,
          s.rect,
        ),
        y: s.floorY,
        h: 4.6,
        style,
        radius: 0.6,
        cloister: true,
      })
    }
  }
  return out
}
