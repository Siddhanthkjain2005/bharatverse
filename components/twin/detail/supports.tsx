'use client'

/**
 * Supports: columns, colonnades and the beams they carry.
 *
 * A pillared hall is dozens of identical columns, so the whole set is drawn as a
 * handful of instanced meshes — bases, shafts, necks, capitals, brackets — which
 * keeps a hundred-column mandapa at the cost of six draws.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX, UNIT_CYL } from '@/lib/twin/geometry'
import { InstancedSet, type Inst } from './instanced'

export type ColumnStyle = 'MUGHAL' | 'DRAVIDIAN' | 'NAGARA' | 'ROCK' | 'VIJAYANAGARA'

interface ColumnProportions {
  base: number
  shaftTop: number
  shaftBottom: number
  neck: number
  capital: number
  abacus: number
  bracket: boolean
  faceted: number
}

const PROP: Record<ColumnStyle, ColumnProportions> = {
  MUGHAL: { base: 1.05, shaftTop: 0.3, shaftBottom: 0.36, neck: 0.44, capital: 0.78, abacus: 0.92, bracket: true, faceted: 8 },
  DRAVIDIAN: { base: 1.5, shaftTop: 0.45, shaftBottom: 0.52, neck: 0.6, capital: 1.15, abacus: 1.35, bracket: true, faceted: 8 },
  NAGARA: { base: 1.25, shaftTop: 0.4, shaftBottom: 0.46, neck: 0.56, capital: 1.0, abacus: 1.15, bracket: false, faceted: 16 },
  ROCK: { base: 1.4, shaftTop: 0.5, shaftBottom: 0.62, neck: 0.7, capital: 1.1, abacus: 1.3, bracket: false, faceted: 12 },
  VIJAYANAGARA: { base: 1.6, shaftTop: 0.42, shaftBottom: 0.5, neck: 0.62, capital: 1.2, abacus: 1.45, bracket: true, faceted: 8 },
}

export interface ColumnSet {
  positions: { x: number; z: number }[]
  /** Floor level the columns stand on. */
  y: number
  h: number
  style: ColumnStyle
  scale?: number
}

/** Columns for a whole hall, drawn as instanced parts. */
export function Colonnade({
  set, stone, dark, trim,
}: {
  set: ColumnSet
  stone: THREE.Material
  dark: THREE.Material
  trim: THREE.Material
}) {
  const parts = useMemo(() => {
    const p = PROP[set.style]
    const s = set.scale ?? 1
    const bases: Inst[] = []
    const shafts: Inst[] = []
    const necks: Inst[] = []
    const caps: Inst[] = []
    const abaci: Inst[] = []
    const brackets: Inst[] = []
    const baseH = 0.55 * s
    const abH = 0.34 * s
    const capH = 0.4 * s
    const shaftH = Math.max(1.2, set.h - baseH - abH - capH - 0.3 * s)
    for (const { x, z } of set.positions) {
      const y0 = set.y
      bases.push({ p: [x, y0 + baseH / 2, z], s: [p.base * s, baseH, p.base * s] })
      shafts.push({
        p: [x, y0 + baseH + shaftH / 2, z],
        s: [p.shaftBottom * 2 * s, shaftH, p.shaftBottom * 2 * s],
      })
      necks.push({ p: [x, y0 + baseH + shaftH + 0.1 * s, z], s: [p.neck * 2 * s, 0.2 * s, p.neck * 2 * s] })
      caps.push({ p: [x, y0 + baseH + shaftH + capH / 2 + 0.2 * s, z], s: [p.capital * s, capH, p.capital * s] })
      abaci.push({
        p: [x, y0 + baseH + shaftH + capH + abH / 2 + 0.2 * s, z],
        s: [p.abacus * s, abH, p.abacus * s],
      })
      if (p.bracket) {
        for (const dir of [0, Math.PI / 2]) {
          brackets.push({
            p: [x, y0 + baseH + shaftH + capH + 0.05 * s, z],
            s: [p.abacus * 1.55 * s, 0.26 * s, 0.3 * s],
            r: [0, dir, 0],
          })
        }
      }
    }
    return { bases, shafts, necks, caps, abaci, brackets }
  }, [set])

  return (
    <>
      <InstancedSet geometry={UNIT_BOX} material={dark} items={parts.bases} />
      <InstancedSet geometry={UNIT_CYL} material={stone} items={parts.shafts} />
      <InstancedSet geometry={UNIT_BOX} material={trim} items={parts.necks} />
      <InstancedSet geometry={UNIT_BOX} material={stone} items={parts.caps} />
      <InstancedSet geometry={UNIT_BOX} material={dark} items={parts.abaci} />
      <InstancedSet geometry={UNIT_BOX} material={stone} items={parts.brackets} />
    </>
  )
}

/** Beams spanning a column grid, so the roof looks carried rather than floating. */
export function Architrave({
  positions, y, material, along = 'x', depth = 0.55, height = 0.5,
}: {
  positions: { x: number; z: number }[]
  y: number
  material: THREE.Material
  along?: 'x' | 'z'
  depth?: number
  height?: number
}) {
  const items = useMemo<Inst[]>(() => {
    const byLine = new Map<string, number[]>()
    for (const p of positions) {
      const key = (along === 'x' ? p.z : p.x).toFixed(1)
      const list = byLine.get(key)
      const v = along === 'x' ? p.x : p.z
      if (list) list.push(v)
      else byLine.set(key, [v])
    }
    const out: Inst[] = []
    for (const [key, values] of byLine) {
      if (values.length < 2) continue
      values.sort((a, b) => a - b)
      const fixed = Number(key)
      for (let i = 0; i < values.length - 1; i++) {
        const a = values[i]
        const b = values[i + 1]
        if (b - a > 9) continue
        const mid = (a + b) / 2
        out.push({
          p: along === 'x' ? [mid, y, fixed] : [fixed, y, mid],
          s: along === 'x' ? [b - a + depth, height, depth] : [depth, height, b - a + depth],
        })
      }
    }
    return out
  }, [positions, y, along, depth, height])
  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} />
}

/** Perimeter column grid for a hall: keeps the middle of the room walkable. */
export function hallColumns(
  cx: number,
  cz: number,
  w: number,
  d: number,
  spacing = 5,
  inset = 2.6,
): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = []
  const iw = Math.max(2, w - inset * 2)
  const id = Math.max(2, d - inset * 2)
  const nx = Math.max(1, Math.round(iw / spacing))
  const nz = Math.max(1, Math.round(id / spacing))
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue
      out.push({
        x: cx - iw / 2 + (iw * i) / nx,
        z: cz - id / 2 + (id * j) / nz,
      })
    }
  }
  return out
}
