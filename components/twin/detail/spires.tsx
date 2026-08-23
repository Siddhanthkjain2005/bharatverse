'use client'

/**
 * Curvilinear spires and the fluted minar.
 *
 * A shikhara is not a cone: its profile is a power curve, its corners project as
 * vertical offsets (rathas), and its surface is bound by horizontal courses. All
 * three are generated here, and all three collapse into two instanced draws.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX, cylinder, sphere, torus } from '@/lib/twin/geometry'
import { InstancedSet, type Inst } from './instanced'
import { Kalasha } from './crowns'

export function CurvedSpire({
  cx, cz, baseW, baseD, y, height, material, dark, trim, power = 0.62,
  rings = 40, rathas = true, urushringa = 0, progress = 1,
}: {
  cx: number
  cz: number
  baseW: number
  baseD: number
  y: number
  height: number
  material: THREE.Material
  dark: THREE.Material
  trim: THREE.Material
  power?: number
  rings?: number
  rathas?: boolean
  urushringa?: number
  progress?: number
}) {
  const { slabs, courses, projections, top } = useMemo(() => {
    const slabs: Inst[] = []
    const courses: Inst[] = []
    const projections: Inst[] = []
    const shown = Math.max(1, Math.round(rings * Math.min(1, Math.max(0, progress))))
    const ringH = height / rings
    let topW = baseW
    let topY = y
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1)
      const k = Math.pow(1 - t, power)
      const w = baseW * k + baseW * 0.06
      const d = baseD * k + baseD * 0.06
      const cy = y + t * height
      if (i < shown) {
        slabs.push({ p: [cx, cy + ringH / 2, cz], s: [w, ringH * 1.02, d], r: [0, t * 0.05, 0] })
        if (i % 3 === 0) {
          courses.push({ p: [cx, cy + ringH * 0.9, cz], s: [w * 1.05, ringH * 0.22, d * 1.05] })
        }
        if (rathas && i % 2 === 0) {
          const off = 0.34
          for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            projections.push({
              p: [cx + sx * (w / 2 + off * 0.5), cy + ringH / 2, cz + sz * (d / 2 + off * 0.5)],
              s: [sx ? off * 1.6 : w * 0.32, ringH * 1.02, sz ? off * 1.6 : d * 0.32],
            })
          }
        }
        topW = w
        topY = cy + ringH
      }
    }
    return { slabs, courses, projections, top: { w: topW, y: topY, complete: shown >= rings } }
  }, [cx, cz, baseW, baseD, y, height, power, rings, rathas, progress])

  const subs = useMemo(() => {
    if (!urushringa) return []
    const out: { x: number; z: number; h: number; w: number }[] = []
    for (let i = 0; i < urushringa; i++) {
      const a = (i / urushringa) * Math.PI * 2 + Math.PI / 4
      out.push({
        x: cx + Math.cos(a) * baseW * 0.52,
        z: cz + Math.sin(a) * baseD * 0.52,
        h: height * 0.44,
        w: baseW * 0.34,
      })
    }
    return out
  }, [cx, cz, baseW, baseD, height, urushringa])

  return (
    <>
      <InstancedSet geometry={UNIT_BOX} material={material} items={slabs} />
      <InstancedSet geometry={UNIT_BOX} material={dark} items={courses} receiveShadow={false} />
      <InstancedSet geometry={UNIT_BOX} material={material} items={projections} />
      {subs.map((s, i) => (
        <CurvedSpire
          key={i}
          cx={s.x}
          cz={s.z}
          baseW={s.w}
          baseD={s.w}
          y={y}
          height={s.h}
          material={material}
          dark={dark}
          trim={trim}
          rings={16}
          rathas={false}
          progress={progress}
        />
      ))}
      {top.complete && (
        <group position={[cx, top.y, cz]}>
          <mesh geometry={cylinder(top.w * 1.5, top.w * 1.1, top.w * 0.5, 20, 2)} material={material} castShadow />
          <mesh position={[0, top.w * 0.42, 0]} geometry={torus(top.w * 1.35, top.w * 0.24, 8, 24)} material={material} castShadow />
          <Kalasha r={top.w * 0.7} y={top.w * 0.85} material={material} trim={trim} />
        </group>
      )}
    </>
  )
}

/** Tapering fluted tower with corbelled balconies and inscription bands. */
export function MinarShaft({
  cx, cz, y, storeys, material, dark, trim, progress = 1,
}: {
  cx: number
  cz: number
  y: number
  storeys: { h: number; rb: number; rt: number; flutes: number }[]
  material: THREE.Material
  dark: THREE.Material
  trim: THREE.Material
  progress?: number
}) {
  const shown = Math.max(1, Math.round(storeys.length * Math.min(1, Math.max(0.001, progress))))
  const flutes = useMemo<Inst[]>(() => {
    const out: Inst[] = []
    let cy = y
    for (let s = 0; s < Math.min(shown, storeys.length); s++) {
      const st = storeys[s]
      const r = (st.rb + st.rt) / 2
      for (let f = 0; f < st.flutes; f++) {
        const a = (f / st.flutes) * Math.PI * 2
        out.push({
          p: [cx + Math.cos(a) * r * 0.97, cy + st.h / 2, cz + Math.sin(a) * r * 0.97],
          s: [r * 0.24, st.h, r * 0.24],
          r: [0, -a, 0],
        })
      }
      cy += st.h + 0.8
    }
    return out
  }, [cx, cz, y, storeys, shown])

  let cy = y
  const parts: React.ReactNode[] = []
  for (let s = 0; s < Math.min(shown, storeys.length); s++) {
    const st = storeys[s]
    const at = cy
    parts.push(
      <group key={s} position={[cx, at, cz]}>
        <mesh position={[0, st.h / 2, 0]} geometry={cylinder(st.rt, st.rb, st.h, 32, 3)} material={material} castShadow receiveShadow />
        {[0.26, 0.66].map((t, i) => (
          <mesh key={i} position={[0, st.h * t, 0]} geometry={cylinder(st.rb * 1.01, st.rb * 1.02, 0.66, 32, 2)} material={dark} castShadow />
        ))}
        <mesh position={[0, st.h + 0.18, 0]} geometry={cylinder(st.rt * 1.45, st.rt * 1.05, 0.68, 32, 3)} material={material} castShadow />
        <mesh position={[0, st.h + 0.66, 0]} geometry={torus(st.rt * 1.42, 0.1, 8, 40)} material={trim} />
      </group>,
    )
    cy += st.h + 0.8
  }

  const last = storeys[Math.min(shown, storeys.length) - 1]
  return (
    <>
      {parts}
      <InstancedSet geometry={UNIT_BOX} material={material} items={flutes} receiveShadow={false} />
      {shown >= storeys.length && last && (
        <group position={[cx, cy - 0.5, cz]}>
          <mesh geometry={cylinder(last.rt * 1.1, last.rt * 1.25, 0.8, 20, 2)} material={material} castShadow />
          <mesh position={[0, last.rt * 0.8, 0]} geometry={sphere(last.rt * 1.0, 18, 12, Math.PI * 2, Math.PI / 2)} material={material} castShadow />
          <Kalasha r={last.rt * 0.4} y={last.rt * 1.3} material={material} trim={trim} />
        </group>
      )}
    </>
  )
}
