'use client'

/**
 * Crowns: the superstructure that gives each tradition its silhouette.
 *
 * Bulbous Mughal dome, curvilinear Nagara shikhara, Kalinga rekha deul, Dravidian
 * tiered vimana, fluted minar. Each is generated from a profile function rather
 * than modelled, so it adapts to whatever footprint the documented plan produced.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX, box, cone, cylinder, sphere, torus } from '@/lib/twin/geometry'
import { InstancedSet, type Inst } from './instanced'

export function Kalasha({
  r, y, material, trim,
}: {
  r: number
  y: number
  material: THREE.Material
  trim: THREE.Material
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={cylinder(r * 1.15, r * 0.85, r * 0.44, 16, 2)} material={material} castShadow />
      <mesh position={[0, r * 0.5, 0]} geometry={sphere(r * 0.52, 16, 12)} material={trim} castShadow />
      <mesh position={[0, r * 1.0, 0]} geometry={cylinder(r * 0.16, r * 0.26, r * 0.72, 12, 2)} material={trim} />
      <mesh position={[0, r * 1.6, 0]} geometry={cone(r * 0.2, r * 0.9, 10)} material={trim} />
    </group>
  )
}

/**
 * Bulbous double-shell dome.
 *
 * The profile springs at the full radius, so the shell meets the drum it stands
 * on rather than growing out of the middle of its lid; it swells a few per cent
 * above the springing, which is what makes the silhouette Mughal rather than
 * Roman; and it closes into a constricted neck under the finial. `petals` is the
 * band of stylised lotus leaves that wraps the springing — sized from the
 * circumference so they sit against the shell whatever the footprint produced.
 *
 * The shell, its petal band and its mouldings are all masonry: only the finial is
 * metal. `trim` is therefore a *stone* — passing the interpretive metal here is
 * what turns a marble dome into a copper kettle.
 */
export function OnionDome({
  radius, y, material, trim, metal, petals = 26,
}: {
  radius: number
  y: number
  material: THREE.Material
  /** Moulding stone: the petal band, the springing ring and the neck. */
  trim: THREE.Material
  /** Gilded finial, if the tradition has one. Defaults to the moulding stone. */
  metal?: THREE.Material
  petals?: number
}) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector2[] = []
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      // Stop just short of the pole; the neck and finial close the shell.
      const u = (i / steps) * 0.955
      const a = u * (Math.PI / 2)
      const swell = 1 + 0.075 * Math.sin(Math.PI * Math.pow(u, 0.7))
      const r = Math.pow(Math.cos(a), 0.6) * swell
      const h = 1.58 * Math.pow(Math.sin(a), 0.84)
      pts.push(new THREE.Vector2(Math.max(r, 0.02) * radius, h * radius))
    }
    return new THREE.LatheGeometry(pts, 60)
  }, [radius])

  const petalItems = useMemo<Inst[]>(() => {
    const out: Inst[] = []
    const chord = (Math.PI * 2 * radius) / petals
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2
      out.push({
        p: [Math.cos(a) * radius * 0.99, radius * 0.16, Math.sin(a) * radius * 0.99],
        s: [radius * 0.055, radius * 0.34, chord * 0.72],
        r: [0, -a, 0],
      })
    }
    return out
  }, [radius, petals])

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_BOX} material={trim} items={petalItems} receiveShadow={false} />
      <mesh geometry={torus(radius * 1.005, radius * 0.035, 8, 44)} position={[0, radius * 0.03, 0]} material={trim} />
      <mesh
        position={[0, radius * 1.62, 0]}
        geometry={cylinder(radius * 0.18, radius * 0.23, radius * 0.16, 16, 2)}
        material={material}
        castShadow
      />
      <Kalasha r={radius * 0.23} y={radius * 1.7} material={material} trim={metal ?? trim} />
    </group>
  )
}

/**
 * Corner kiosk. The cap is the same bulbous profile as the main dome at a
 * fraction of its radius, on its own drum — a hemisphere on bare stalks reads as
 * a mushroom, which is not what a chhatri looks like from any angle.
 */
export function Chattri({
  radius, height, position, material, trim, metal, pillars = 4,
}: {
  radius: number
  height: number
  position: [number, number, number]
  material: THREE.Material
  trim: THREE.Material
  metal?: THREE.Material
  pillars?: number
}) {
  const capR = radius * 0.58
  const slabY = height + 0.12
  const drumH = radius * 0.2
  return (
    <group position={position}>
      {Array.from({ length: pillars }).map((_, i) => {
        const a = (i / pillars) * Math.PI * 2 + Math.PI / pillars
        const px = Math.cos(a) * radius * 0.78
        const pz = Math.sin(a) * radius * 0.78
        return (
          <group key={i} position={[px, 0, pz]} rotation={[0, -a, 0]}>
            <mesh position={[0, 0.16, 0]} geometry={box(radius * 0.4, 0.32, radius * 0.4, 1)} material={material} castShadow />
            <mesh position={[0, height / 2, 0]} geometry={cylinder(radius * 0.13, radius * 0.15, height, 8, 2)} material={material} castShadow />
            <mesh position={[0, height - 0.26, 0]} geometry={box(radius * 0.42, 0.36, radius * 0.42, 1)} material={trim} castShadow />
          </group>
        )
      })}
      <mesh position={[0, slabY, 0]} geometry={cylinder(radius * 1.24, radius * 1.3, 0.28, 16, 3)} material={trim} castShadow receiveShadow />
      <mesh
        position={[0, slabY + 0.14 + drumH / 2, 0]}
        geometry={cylinder(capR, capR * 1.06, drumH, 20, 2)}
        material={material}
        castShadow
      />
      <OnionDome radius={capR} y={slabY + 0.14 + drumH} material={material} trim={trim} metal={metal} petals={12} />
    </group>
  )
}

/**
 * Stacked diminishing storeys. `shrine` adds the miniature-shrine cornice of a
 * Dravidian vimana; without it the stack reads as a phamsana pyramidal roof.
 */
export function TieredRoof({
  cx, cz, w, d, y, tiers, tierH, taper, material, dark, visible, shrine = false,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  tiers: number
  tierH: number
  taper: number
  material: THREE.Material
  dark: THREE.Material
  visible?: number
  shrine?: boolean
}) {
  const { slabs, bands, shrines, top } = useMemo(() => {
    const shown = visible ?? tiers
    const slabs: Inst[] = []
    const bands: Inst[] = []
    const shrines: Inst[] = []
    let tw = w
    let td = d
    let cy = y
    for (let i = 0; i < tiers; i++) {
      if (i < shown) {
        slabs.push({ p: [cx, cy + tierH / 2, cz], s: [tw, tierH, td] })
        bands.push({ p: [cx, cy + tierH * 0.92, cz], s: [tw * 1.04, tierH * 0.16, td * 1.04] })
        if (shrine) {
          const n = Math.max(2, Math.round(tw / 3.4))
          for (let j = 0; j <= n; j++) {
            const x = cx - tw / 2 + (tw * j) / n
            shrines.push({ p: [x, cy + tierH * 0.62, cz - td / 2 - 0.14], s: [0.9, tierH * 0.6, 0.5] })
            shrines.push({ p: [x, cy + tierH * 0.62, cz + td / 2 + 0.14], s: [0.9, tierH * 0.6, 0.5] })
          }
          const m = Math.max(2, Math.round(td / 3.4))
          for (let j = 1; j < m; j++) {
            const z = cz - td / 2 + (td * j) / m
            shrines.push({ p: [cx - tw / 2 - 0.14, cy + tierH * 0.62, z], s: [0.5, tierH * 0.6, 0.9] })
            shrines.push({ p: [cx + tw / 2 + 0.14, cy + tierH * 0.62, z], s: [0.5, tierH * 0.6, 0.9] })
          }
        }
      }
      cy += tierH
      tw *= taper
      td *= taper
    }
    return { slabs, bands, shrines, top: { y: cy, w: tw, d: td, complete: shown >= tiers } }
  }, [cx, cz, w, d, y, tiers, tierH, taper, visible, shrine])

  return (
    <>
      <InstancedSet geometry={UNIT_BOX} material={material} items={slabs} />
      <InstancedSet geometry={UNIT_BOX} material={dark} items={bands} />
      {shrine && <InstancedSet geometry={UNIT_BOX} material={dark} items={shrines} />}
      {top.complete && (
        <group position={[cx, top.y, cz]}>
          {/*
            A closed stepped griva and stupi finish the pyramidal roof.  The old
            open hemisphere had no underside, so from a low approach it looked
            like a large shell hovering above the tiers.
          */}
          <mesh
            position={[0, Math.max(top.w, top.d) * 0.1, 0]}
            geometry={box(top.w * 1.06, Math.max(top.w, top.d) * 0.2, top.d * 1.06, 2)}
            material={material}
            castShadow
          />
          <mesh
            position={[0, Math.max(top.w, top.d) * 0.28, 0]}
            geometry={box(top.w * 0.76, Math.max(top.w, top.d) * 0.16, top.d * 0.76, 2)}
            material={dark}
            castShadow
          />
          <Kalasha r={Math.max(top.w, top.d) * 0.19} y={Math.max(top.w, top.d) * 0.4} material={material} trim={dark} />
        </group>
      )}
    </>
  )
}
