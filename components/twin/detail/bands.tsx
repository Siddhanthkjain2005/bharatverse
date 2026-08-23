'use client'

/**
 * Horizontal registers: coursing, string courses, cornices, carved bands and
 * parapets. These are the elements that stop a wall from reading as a slab —
 * every one of them is a real device for shedding water, marking a floor level
 * or carrying ornament, and together they give the mass its scale.
 */

import * as THREE from 'three'
import { UNIT_BOX } from '@/lib/twin/geometry'
import { Rand } from '@/lib/twin/rng'
import { InstancedSet, type Inst } from './instanced'

export interface RingArgs {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  h: number
  /** How far the band stands out from the wall face. */
  project: number
  /** Thickness of the band ring. */
  t?: number
}

export function ringItems({ cx, cz, w, d, y, h, project, t = 0.5 }: RingArgs): Inst[] {
  const W = w + project * 2
  const D = d + project * 2
  return [
    { p: [cx, y, cz - D / 2 + t / 2], s: [W, h, t] },
    { p: [cx, y, cz + D / 2 - t / 2], s: [W, h, t] },
    { p: [cx - W / 2 + t / 2, y, cz], s: [t, h, D - t * 2] },
    { p: [cx + W / 2 - t / 2, y, cz], s: [t, h, D - t * 2] },
  ]
}

export function Course({ material, ...args }: RingArgs & { material: THREE.Material }) {
  const items = ringItems(args)
  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} />
}

/**
 * One face of a band rather than a ring around it — used where a perimeter is cut
 * into pieces, so a moulding stops at the opening instead of running across it.
 */
export function faceItems({
  cx, cz, w, d, side, y, h, project, t = 0.5,
}: {
  cx: number
  cz: number
  w: number
  d: number
  side: 'NZ' | 'PZ' | 'NX' | 'PX'
  y: number
  h: number
  project: number
  t?: number
}): Inst[] {
  const off = project - t / 2
  if (side === 'NZ' || side === 'PZ') {
    const sz = side === 'NZ' ? -1 : 1
    return [{ p: [cx, y, cz + sz * (d / 2 + off)], s: [w, h, t] }]
  }
  const sx = side === 'NX' ? -1 : 1
  return [{ p: [cx + sx * (w / 2 + off), y, cz], s: [t, h, d] }]
}

/** Ashlar seams up a wall face — the layered-block reading, one draw call. */
export function CourseLines({
  cx, cz, w, d, y0, y1, spacing = 1.35, project = 0.09, material,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y0: number
  y1: number
  spacing?: number
  project?: number
  material: THREE.Material
}) {
  const items: Inst[] = []
  const n = Math.max(1, Math.floor((y1 - y0) / spacing))
  for (let i = 1; i <= n; i++) {
    const y = y0 + i * spacing
    if (y > y1 - 0.1) break
    items.push(...ringItems({ cx, cz, w, d, y, h: 0.1, project, t: project * 2 }))
  }
  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} castShadow={false} />
}

/**
 * Projecting cornice: three courses of increasing overhang plus a bracket row.
 * This is what casts the deep horizontal shadow under the roofline.
 */
export function Cornice({
  cx, cz, w, d, y, material, dark, scale = 1,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  material: THREE.Material
  dark: THREE.Material
  scale?: number
}) {
  const s = scale
  const main: Inst[] = [
    ...ringItems({ cx, cz, w, d, y, h: 0.36 * s, project: 0.3 * s, t: 0.6 * s }),
    ...ringItems({ cx, cz, w, d, y: y + 0.4 * s, h: 0.5 * s, project: 0.95 * s, t: 0.7 * s }),
    ...ringItems({ cx, cz, w, d, y: y + 0.86 * s, h: 0.3 * s, project: 0.62 * s, t: 0.6 * s }),
  ]
  // corbels under the widest course
  const brackets: Inst[] = []
  const step = 1.9 * s
  const nx = Math.max(2, Math.floor(w / step))
  const nz = Math.max(2, Math.floor(d / step))
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (w * i) / nx
    for (const sz of [-1, 1]) {
      brackets.push({ p: [x, y - 0.34 * s, cz + (sz * (d / 2 + 0.55 * s))], s: [0.4 * s, 0.6 * s, 1.1 * s] })
    }
  }
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (d * i) / nz
    for (const sx of [-1, 1]) {
      brackets.push({ p: [cx + sx * (w / 2 + 0.55 * s), y - 0.34 * s, z], s: [1.1 * s, 0.6 * s, 0.4 * s] })
    }
  }
  return (
    <>
      <InstancedSet geometry={UNIT_BOX} material={material} items={main} />
      <InstancedSet geometry={UNIT_BOX} material={dark} items={brackets} />
    </>
  )
}

/**
 * Sculptural register. The blocks are a stand-in for a carving programme, not a
 * reproduction of one: the viewer grades this as an interpretive reconstruction.
 */
export function CarvedRegister({
  cx, cz, w, d, y, h, seed, material, density = 1.5,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  h: number
  seed: string
  material: THREE.Material
  density?: number
}) {
  const rand = new Rand(seed)
  const items: Inst[] = []
  const push = (x: number, z: number, rot: number) => {
    const hh = h * rand.range(0.55, 0.94)
    items.push({
      p: [x, y + hh / 2 - h * 0.05, z],
      s: [rand.range(0.4, 0.72), hh, rand.range(0.3, 0.5)],
      r: [0, rot, rand.jitter(0.05)],
    })
  }
  const stepX = Math.max(0.75, 1.5 / density)
  const nx = Math.max(1, Math.floor(w / stepX))
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (w * i) / nx
    push(x, cz - d / 2 - 0.16, 0)
    push(x, cz + d / 2 + 0.16, 0)
  }
  const nz = Math.max(1, Math.floor(d / stepX))
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (d * i) / nz
    push(cx - w / 2 - 0.16, z, Math.PI / 2)
    push(cx + w / 2 + 0.16, z, Math.PI / 2)
  }
  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} />
}

/**
 * A carved register on the two broad faces of one solved wall run.
 *
 * Unlike `CarvedRegister`, this works on the wall pieces left after the doorway
 * solver has cut its gaps.  The ornament therefore stops at each jamb instead
 * of continuing across the opening as a row of apparently floating pixels.
 */
export function CarvedWallRegister({
  cx, cz, w, d, y, h, seed, material, density = 1.5,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  h: number
  seed: string
  material: THREE.Material
  density?: number
}) {
  const rand = new Rand(seed)
  const alongX = w >= d
  const run = alongX ? w : d
  const thickness = alongX ? d : w
  const margin = Math.min(0.62, run * 0.16)
  const usable = Math.max(0, run - margin * 2)
  const count = Math.max(0, Math.floor(usable / Math.max(0.78, 1.5 / density)))
  const items: Inst[] = []

  for (const face of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      const along = -usable / 2 + (usable * (i + 0.5)) / count
      const hh = h * rand.range(0.55, 0.94)
      const normal = face * (thickness / 2 + 0.17)
      items.push({
        p: alongX
          ? [cx + along, y + hh / 2 - h * 0.05, cz + normal]
          : [cx + normal, y + hh / 2 - h * 0.05, cz + along],
        s: alongX
          ? [rand.range(0.4, 0.7), hh, 0.34]
          : [0.34, hh, rand.range(0.4, 0.7)],
        r: [0, 0, rand.jitter(0.045)],
      })
    }
  }

  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} />
}

/** Crenellated or merlon parapet along a roof edge. */
export function Parapet({
  cx, cz, w, d, y, material, unit = 0.9, h = 0.85,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  material: THREE.Material
  unit?: number
  h?: number
}) {
  const items: Inst[] = []
  const nx = Math.max(2, Math.round(w / (unit * 2)))
  const nz = Math.max(2, Math.round(d / (unit * 2)))
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (w * i) / nx
    items.push({ p: [x, y + h / 2, cz - d / 2], s: [unit, h, unit * 0.6] })
    items.push({ p: [x, y + h / 2, cz + d / 2], s: [unit, h, unit * 0.6] })
  }
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (d * i) / nz
    items.push({ p: [cx - w / 2, y + h / 2, z], s: [unit * 0.6, h, unit] })
    items.push({ p: [cx + w / 2, y + h / 2, z], s: [unit * 0.6, h, unit] })
  }
  return <InstancedSet geometry={UNIT_BOX} material={material} items={items} />
}
