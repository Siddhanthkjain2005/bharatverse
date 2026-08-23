'use client'

/**
 * Openings: recessed arches, pierced screens and door surrounds.
 *
 * The arch profiles are typological — a pointed ogee for Indo-Islamic work, a
 * corbelled head for temple work — and are placed on wall faces the solver has
 * already cut, so what looks like an opening is one.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX } from '@/lib/twin/geometry'
import { InstancedSet, type Inst } from './instanced'

export type ArchStyle = 'OGEE' | 'POINTED' | 'HORSESHOE' | 'CORBEL' | 'FLAT'

function archShape(w: number, h: number, style: ArchStyle): THREE.Shape {
  const s = new THREE.Shape()
  const hw = w / 2
  s.moveTo(-hw, 0)
  if (style === 'FLAT') {
    s.lineTo(-hw, h)
    s.lineTo(hw, h)
    s.lineTo(hw, 0)
    s.closePath()
    return s
  }
  if (style === 'CORBEL') {
    const spring = h * 0.62
    s.lineTo(-hw, spring)
    s.lineTo(-hw * 0.62, h * 0.82)
    s.lineTo(-hw * 0.24, h)
    s.lineTo(hw * 0.24, h)
    s.lineTo(hw * 0.62, h * 0.82)
    s.lineTo(hw, spring)
    s.lineTo(hw, 0)
    s.closePath()
    return s
  }
  if (style === 'HORSESHOE') {
    const spring = h * 0.36
    s.lineTo(-hw, spring)
    s.absarc(0, spring, hw, Math.PI, 0, true)
    s.lineTo(hw, 0)
    s.closePath()
    return s
  }
  const spring = h * (style === 'OGEE' ? 0.52 : 0.6)
  s.lineTo(-hw, spring)
  if (style === 'OGEE') {
    s.bezierCurveTo(-hw, h * 0.86, -hw * 0.2, h, 0, h)
    s.bezierCurveTo(hw * 0.2, h, hw, h * 0.86, hw, spring)
  } else {
    s.quadraticCurveTo(-hw * 0.9, h * 0.95, 0, h)
    s.quadraticCurveTo(hw * 0.9, h * 0.95, hw, spring)
  }
  s.lineTo(hw, 0)
  s.closePath()
  return s
}

const SHAPE_CACHE = new Map<string, THREE.ExtrudeGeometry>()

function extruded(key: string, depth: number, make: () => THREE.Shape) {
  const k = `${key}:${depth.toFixed(2)}`
  const hit = SHAPE_CACHE.get(k)
  if (hit) return hit
  const geo = new THREE.ExtrudeGeometry(make(), { depth, bevelEnabled: false })
  SHAPE_CACHE.set(k, geo)
  return geo
}

function archGeometry(w: number, h: number, depth: number, style: ArchStyle) {
  return extruded(`arch:${w.toFixed(2)}:${h.toFixed(2)}:${style}`, depth, () => archShape(w, h, style))
}

/** A plate with the arch cut through it: the frame of a recess, not a panel. */
function frameShape(w: number, h: number, style: ArchStyle, openW: number, openH: number, sill: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(-w / 2, h)
  s.lineTo(w / 2, h)
  s.lineTo(w / 2, 0)
  s.closePath()
  const pts = archShape(openW, openH, style)
    .getPoints(22)
    .map((p) => new THREE.Vector2(p.x, p.y + sill))
  s.holes.push(new THREE.Path(pts))
  return s
}

/** Rectangular border, centred on a plate `h` tall standing on y = 0. */
function ringShape(h: number, ow: number, oh: number, iw: number, ih: number) {
  const y0 = (h - oh) / 2
  const s = new THREE.Shape()
  s.moveTo(-ow / 2, y0)
  s.lineTo(-ow / 2, y0 + oh)
  s.lineTo(ow / 2, y0 + oh)
  s.lineTo(ow / 2, y0)
  s.closePath()
  const iy = y0 + (oh - ih) / 2
  const p = new THREE.Path()
  p.moveTo(-iw / 2, iy)
  p.lineTo(-iw / 2, iy + ih)
  p.lineTo(iw / 2, iy + ih)
  p.lineTo(iw / 2, iy)
  p.closePath()
  s.holes.push(p)
  return s
}

/**
 * A recessed arched opening — pishtaq, iwan, devakoshta niche.
 *
 * The frame is a plate with the arch cut *through* it, standing off the wall
 * face, so the opening is a real recess: its jambs and soffit take the sun from
 * one side and the shadow inside them is what gives an Indo-Islamic or Dravidian
 * facade its relief. A panel closes the back, except where `open` is set — a
 * pishtaq over a real doorway has to keep the interior visible from the approach.
 *
 * `position` is the centre of the wall's outer face, and the whole assembly
 * projects forward from it by `depth`; nothing is buried in the wall, which is
 * what an applied frame does in the first place.
 */
export function ArchNiche({
  w, h, depth = 0.7, style = 'OGEE', position, rotation = [0, 0, 0], material, frame, inner, open = false,
}: {
  w: number
  h: number
  depth?: number
  style?: ArchStyle
  position: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
  frame?: THREE.Material
  inner?: THREE.Material
  /** Leave the recess unbacked, so a real opening behind it stays visible. */
  open?: boolean
}) {
  const openW = w * 0.78
  const openH = h * 0.86
  const sill = h * 0.04
  const key = `${w.toFixed(2)}:${h.toFixed(2)}:${style}`
  const plate = useMemo(
    () => extruded(`plate:${key}`, depth, () => frameShape(w, h, style, openW, openH, sill)),
    [key, depth, w, h, style, openW, openH, sill],
  )
  const lipD = Math.min(0.3, depth * 0.42)
  const lip = useMemo(
    () => extruded(`lip:${key}`, lipD, () => ringShape(h, w * 1.08, h * 1.04, w * 0.955, h * 0.98)),
    [key, lipD, h, w],
  )
  const back = useMemo(() => archGeometry(openW, openH, 0.14, style), [openW, openH, style])
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={plate} material={material} castShadow receiveShadow />
      <mesh position={[0, 0, depth - lipD * 0.5]} geometry={lip} material={frame ?? material} castShadow receiveShadow />
      {!open && <mesh position={[0, sill, 0.04]} geometry={back} material={inner ?? material} receiveShadow />}
    </group>
  )
}

/** Pierced stone screen. One instanced draw for the whole lattice. */
export function Jali({
  w, h, position, rotation = [0, 0, 0], material, cell = 0.46, bar = 0.12, depth = 0.16,
}: {
  w: number
  h: number
  position: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
  cell?: number
  bar?: number
  depth?: number
}) {
  const items = useMemo<Inst[]>(() => {
    const list: Inst[] = []
    const nx = Math.max(2, Math.round(w / cell))
    const ny = Math.max(2, Math.round(h / cell))
    for (let i = 0; i <= nx; i++) {
      list.push({ p: [-w / 2 + (w * i) / nx, 0, 0], s: [bar, h, depth] })
    }
    for (let j = 0; j <= ny; j++) {
      list.push({ p: [0, -h / 2 + (h * j) / ny, 0], s: [w, bar, depth] })
    }
    // diagonal lacing, alternating, to break the grid into a star pattern
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        if ((i + j) % 2) continue
        list.push({
          p: [-w / 2 + (w * (i + 0.5)) / nx, -h / 2 + (h * (j + 0.5)) / ny, 0],
          s: [cell * 1.28, bar * 0.9, depth * 0.8],
          r: [0, 0, Math.PI / 4],
        })
      }
    }
    return list
  }, [w, h, cell, bar, depth])
  return (
    <group position={position} rotation={rotation}>
      <InstancedSet geometry={UNIT_BOX} material={material} items={items} receiveShadow={false} />
    </group>
  )
}

/** Framed door surround with a shading head and a raised threshold. */
export function Doorframe({
  w, h, position, rotation = [0, 0, 0], material, trim, style = 'OGEE', wallT = 1,
}: {
  w: number
  h: number
  position: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
  trim: THREE.Material
  style?: ArchStyle
  wallT?: number
}) {
  const jamb = 0.42
  return (
    <group position={position} rotation={rotation}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + jamb / 2), h / 2, 0]} material={trim} castShadow>
          <boxGeometry args={[jamb, h + 0.5, wallT + 0.3]} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.28, 0]} material={trim} castShadow>
        <boxGeometry args={[w + jamb * 2 + 0.4, 0.55, wallT + 0.55]} />
      </mesh>
      <ArchNiche
        w={w + jamb * 1.4}
        h={h * 0.34}
        depth={0.28}
        style={style}
        position={[0, h + 0.55, wallT / 2 + 0.02]}
        material={material}
        frame={trim}
        inner={material}
      />
      <mesh position={[0, 0.06, wallT / 2 + 0.35]} material={material} receiveShadow>
        <boxGeometry args={[w + jamb * 2, 0.12, 0.9]} />
      </mesh>
    </group>
  )
}
