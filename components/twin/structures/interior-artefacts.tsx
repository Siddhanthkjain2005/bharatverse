'use client'

/**
 * Dense, monument-specific interior storytelling.
 *
 * These are evidence-labelled reference forms, not scans. The forms are kept in
 * a handful of instanced sets so rows of figures, petals, pillars and vessels
 * add visual richness without turning every carving into its own draw call.
 */

import { useMemo } from 'react'
import type * as THREE from 'three'
import {
  UNIT_BOX,
  UNIT_CYL,
  UNIT_SPHERE_HI,
  box,
  cylinder,
  torus,
} from '@/lib/twin/geometry'
import type { WorldModel, WorldSpace } from '@/lib/twin/model'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

interface Pack {
  stone: THREE.Material
  alt: THREE.Material
  dark: THREE.Material
  trim: THREE.Material
  metal: THREE.Material
}

function room(world: WorldModel, id: string) {
  return world.spaces.find((s) => s.space.id === id) ?? null
}

/** A continuous carved figure register, offset safely from the back wall. */
function ReliefRegister({ space, mats, count = 8 }: { space: WorldSpace; mats: Pack; count?: number }) {
  const made = useMemo(() => {
    const usable = space.rect.w * 0.78
    const actual = Math.max(4, Math.min(count, Math.floor(usable / 1.2)))
    const step = usable / actual
    const z = space.rect.cz - space.rect.d / 2 + 0.42
    const panels: Inst[] = []
    const heads: Inst[] = []
    const bodies: Inst[] = []
    const limbs: Inst[] = []
    const slots = actual + 2
    const leftCount = Math.ceil(actual / 2)
    for (let i = 0; i < actual; i++) {
      const slot = i < leftCount ? i : i + 2
      const x = space.rect.cx - usable / 2 + (usable * (slot + 0.5)) / slots
      const sway = ((i % 3) - 1) * 0.12
      panels.push({ p: [x, space.floorY + 1.55, z], s: [step * 0.88, 2.75, 0.2] })
      heads.push({ p: [x, space.floorY + 2.15 + sway, z + 0.15], s: 0.52 })
      bodies.push({ p: [x, space.floorY + 1.38, z + 0.13], s: [0.4, 1.1, 0.3], r: [0, 0, sway] })
      limbs.push({ p: [x - 0.3, space.floorY + 1.42, z + 0.14], s: [0.13, 1.02, 0.13], r: [0, 0, -0.38 + sway] })
      limbs.push({ p: [x + 0.3, space.floorY + 1.42, z + 0.14], s: [0.13, 1.02, 0.13], r: [0, 0, 0.38 + sway] })
      limbs.push({ p: [x - 0.18, space.floorY + 0.66, z + 0.12], s: [0.14, 0.86, 0.14], r: [0, 0, -0.16] })
      limbs.push({ p: [x + 0.18, space.floorY + 0.66, z + 0.12], s: [0.14, 0.86, 0.14], r: [0, 0, 0.16] })
    }
    return { panels, heads, bodies, limbs }
  }, [space, count])

  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={made.panels} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={made.heads} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_CYL} material={mats.alt} items={made.bodies} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_CYL} material={mats.trim} items={made.limbs} castShadow={false} receiveShadow={false} />
    </group>
  )
}

/** Paired doorway guardians for documented Hindu shrine thresholds. */
function GuardianPair({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz + space.rect.d / 2 - 0.62
  const spread = Math.min(3.2, space.rect.w * 0.27)
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[space.rect.cx + side * spread, space.floorY, z]}>
          <mesh position={[0, 0.22, 0]} geometry={box(1.35, 0.44, 1.05, 1)} material={mats.dark} castShadow receiveShadow />
          <mesh position={[0, 1.28, 0]} scale={[0.68, 1.35, 0.45]} geometry={UNIT_CYL} material={mats.stone} castShadow />
          <mesh position={[0, 2.12, 0]} scale={0.76} geometry={UNIT_SPHERE_HI} material={mats.alt} castShadow />
          <mesh position={[0, 2.74, 0]} geometry={cylinder(0.16, 0.52, 0.78, 12, 1)} material={mats.trim} castShadow />
          <mesh position={[side * -0.72, 1.24, 0]} rotation={[0, 0, side * -0.22]} geometry={cylinder(0.09, 0.12, 2.75, 10, 1)} material={mats.metal} castShadow />
          <mesh position={[side * 0.3, 1.22, 0]} rotation={[0, 0, side * 0.34]} geometry={cylinder(0.13, 0.16, 1.45, 10, 1)} material={mats.alt} castShadow />
        </group>
      ))}
    </group>
  )
}

/** Lamps, offering stands and vessels kept to the room edges and clearways. */
function RitualFurnishings({ space, mats, buddhist = false }: { space: WorldSpace; mats: Pack; buddhist?: boolean }) {
  const x = space.rect.cx + space.rect.w * 0.32
  const z = space.rect.cz - space.rect.d * 0.18
  const vessels: Inst[] = Array.from({ length: 7 }, (_, i) => ({
    p: [x - 1.15 + i * 0.38, space.floorY + 0.72 + (i % 2) * 0.07, z],
    s: [0.26 + (i % 3) * 0.05, 0.42 + (i % 2) * 0.12, 0.26 + (i % 3) * 0.05],
  }))
  return (
    <group>
      <mesh position={[x, space.floorY + 0.28, z]} geometry={box(3.6, 0.56, 1.28, 1)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[x, space.floorY + 0.61, z]} geometry={box(3.9, 0.12, 1.5, 1)} material={mats.trim} castShadow />
      <InstancedSet geometry={UNIT_CYL} material={buddhist ? mats.stone : mats.metal} items={vessels} castShadow={false} receiveShadow={false} />
      {!buddhist && [-1, 1].map((side) => (
        <group key={side} position={[space.rect.cx + side * space.rect.w * 0.36, space.floorY, space.rect.cz - space.rect.d * 0.08]}>
          <mesh position={[0, 1.25, 0]} geometry={cylinder(0.09, 0.18, 2.5, 10, 1)} material={mats.metal} castShadow />
          {[0.65, 1.28, 1.92].map((y, i) => (
            <mesh key={y} position={[0, y, 0]} geometry={torus(0.36 - i * 0.055, 0.07, 8, 24)} rotation={[Math.PI / 2, 0, 0]} material={mats.trim} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** Floral pietra-dura-like wall fields behind the Taj cenotaph enclosure. */
function TajInlayPanels({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const made = useMemo(() => {
    const z = space.rect.cz - space.rect.d / 2 + 0.32
    const panels: Inst[] = []
    const petals: Inst[] = []
    const stems: Inst[] = []
    for (let i = 0; i < 7; i++) {
      const x = space.rect.cx + (i - 3) * Math.min(1.65, space.rect.w / 8)
      panels.push({ p: [x, space.floorY + 2.05, z], s: [1.28, 3.25, 0.16] })
      stems.push({ p: [x, space.floorY + 1.75, z + 0.11], s: [0.07, 1.6, 0.07] })
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2
        petals.push({
          p: [x + Math.cos(a) * 0.32, space.floorY + 2.5 + Math.sin(a) * 0.32, z + 0.13],
          s: [0.22, 0.42, 0.09],
          r: [0, 0, -a],
        })
      }
    }
    return { panels, petals, stems }
  }, [space])
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.stone} items={made.panels} castShadow={false} receiveShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.trim} items={made.petals} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_CYL} material={mats.metal} items={made.stems} castShadow={false} receiveShadow={false} />
    </group>
  )
}

/** Slender secondary shafts around granite cores in Hampi's mandapa. */
function MusicalPillarClusters({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const made = useMemo(() => {
    const bases: Inst[] = []
    const shafts: Inst[] = []
    const capitals: Inst[] = []
    const rows = 3
    for (let row = 0; row < rows; row++) {
      for (const side of [-1, 1]) {
        const x = space.rect.cx + side * space.rect.w * 0.34
        const z = space.rect.cz - space.rect.d * 0.28 + row * space.rect.d * 0.28
        bases.push({ p: [x, space.floorY + 0.22, z], s: [1.35, 0.44, 1.35] })
        capitals.push({ p: [x, space.floorY + 3.62, z], s: [1.45, 0.34, 1.45] })
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          shafts.push({ p: [x + Math.cos(a) * 0.38, space.floorY + 1.92, z + Math.sin(a) * 0.38], s: [0.17, 3.2, 0.17] })
        }
      }
    }
    return { bases, shafts, capitals }
  }, [space])
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={made.bases} />
      <InstancedSet geometry={UNIT_CYL} material={mats.stone} items={made.shafts} />
      <InstancedSet geometry={UNIT_BOX} material={mats.trim} items={made.capitals} />
    </group>
  )
}

/**
 * A wall-bound Vaishnava identity for Hampi's Vitthala sanctum.  The smaller
 * chakra-and-conch reliefs flank the central reference icon instead of competing
 * with it, and remain keyed into a deep architectural backing.
 */
function VaishnavaIdentity({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz - space.rect.d / 2 + 0.48
  const radius = Math.min(0.72, space.rect.w * 0.075)
  const left = -space.rect.w * 0.28
  const right = space.rect.w * 0.28
  return (
    <group position={[space.rect.cx, space.floorY, z]}>
      <mesh position={[0, 2.35, -0.08]} geometry={box(space.rect.w * 0.78, 4.7, 0.42, 1)} material={mats.dark} receiveShadow />
      <mesh position={[0, 2.35, 0.17]} geometry={box(space.rect.w * 0.72, 4.2, 0.18, 1)} material={mats.stone} castShadow receiveShadow />
      {[-1, 1].map((side) => (
        <mesh key={`pilaster-${side}`} position={[side * space.rect.w * 0.34, 2.35, 0.34]} geometry={box(0.34, 4.25, 0.32, 1)} material={mats.trim} castShadow />
      ))}
      <mesh position={[left, 2.62, 0.35]} geometry={torus(radius, 0.1, 10, 42)} material={mats.trim} castShadow />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI
        return (
          <mesh
            key={i}
            position={[left, 2.62, 0.34]}
            rotation={[0, 0, angle]}
            geometry={box(radius * 1.72, 0.1, 0.1, 0.5)}
            material={mats.alt}
            castShadow
          />
        )
      })}
      <mesh position={[left, 2.62, 0.42]} scale={0.22} geometry={UNIT_SPHERE_HI} material={mats.metal} castShadow />
      <group position={[right, 2.54, 0.34]} rotation={[0, 0, -0.2]}>
        <mesh scale={[0.58, 0.82, 0.36]} geometry={UNIT_SPHERE_HI} material={mats.alt} castShadow />
        <mesh position={[0.16, 0.47, 0]} rotation={[0, 0, -0.5]} geometry={cylinder(0.1, 0.22, 0.56, 16, 1)} material={mats.trim} castShadow />
        <mesh position={[-0.22, -0.14, 0]} geometry={torus(0.27, 0.075, 10, 26)} material={mats.metal} castShadow />
      </group>
      <mesh position={[0, 0.3, 0.2]} geometry={box(space.rect.w * 0.74, 0.6, 1.18, 1)} material={mats.dark} castShadow receiveShadow />
    </group>
  )
}

/** A gallery of calm seated Buddhist reference figures for the Ajanta type. */
function BuddhaGallery({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const made = useMemo(() => {
    const count = Math.max(5, Math.min(9, Math.floor(space.rect.w / 1.5)))
    const span = space.rect.w * 0.8
    const z = space.rect.cz - space.rect.d / 2 + 0.48
    const bases: Inst[] = []
    const heads: Inst[] = []
    const torsos: Inst[] = []
    const knees: Inst[] = []
    const slots = count + 2
    const leftCount = Math.ceil(count / 2)
    for (let i = 0; i < count; i++) {
      const slot = i < leftCount ? i : i + 2
      const x = space.rect.cx - span / 2 + (span * (slot + 0.5)) / slots
      bases.push({ p: [x, space.floorY + 0.22, z], s: [span / count * 0.8, 0.44, 0.82] })
      knees.push({ p: [x, space.floorY + 0.72, z + 0.05], s: [0.9, 0.42, 0.5] })
      torsos.push({ p: [x, space.floorY + 1.28, z], s: [0.45, 0.92, 0.35] })
      heads.push({ p: [x, space.floorY + 1.94, z], s: 0.56 })
    }
    return { bases, heads, torsos, knees }
  }, [space])
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={made.bases} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={made.knees} />
      <InstancedSet geometry={UNIT_CYL} material={mats.alt} items={made.torsos} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={made.heads} />
    </group>
  )
}

/** Monumental wall image with radiating halo; used for Konark's Surya context. */
function StandingSolarImage({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz - space.rect.d * 0.24
  const x = space.rect.cx - space.rect.w * 0.18
  return (
    <group position={[x, space.floorY, z]} scale={1.22}>
      <mesh position={[0, 0.3, 0]} geometry={box(4.8, 0.6, 1.8, 1)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 1.65, 0]} scale={[1.0, 2.25, 0.62]} geometry={UNIT_CYL} material={mats.stone} castShadow />
      <mesh position={[0, 3.05, 0]} scale={0.88} geometry={UNIT_SPHERE_HI} material={mats.alt} castShadow />
      <mesh position={[0, 3.05, -0.08]} geometry={torus(1.36, 0.16, 12, 48)} material={mats.trim} castShadow />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.72, 1.72, 0]} rotation={[0, 0, side * 0.35]} geometry={cylinder(0.16, 0.2, 1.65, 12, 1)} material={mats.alt} castShadow />
          <mesh position={[side * 0.38, 0.76, 0]} geometry={cylinder(0.22, 0.28, 1.18, 12, 1)} material={mats.stone} castShadow />
        </group>
      ))}
      <mesh position={[0, 3.82, 0]} geometry={cylinder(0.12, 0.58, 0.82, 14, 1)} material={mats.trim} castShadow />
    </group>
  )
}

/** Deep qibla wall rhythm for the Qutb prayer screen, without sacred idols. */
function QutbPrayerScreen({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz - space.rect.d / 2 + 0.36
  const centres = [-0.32, 0, 0.32].map((n) => space.rect.cx + n * space.rect.w)
  return (
    <group>
      {centres.map((x, i) => (
        <group key={x} position={[x, space.floorY, z]}>
          <mesh position={[0, 2.3, 0]} geometry={box(space.rect.w * 0.24, 4.6, 0.3, 1)} material={mats.dark} receiveShadow />
          <mesh position={[0, 2.72, 0.18]} geometry={torus(space.rect.w * 0.085, 0.15, 10, 38, Math.PI)} material={mats.trim} castShadow />
          <mesh position={[-space.rect.w * 0.085, 1.55, 0.18]} geometry={cylinder(0.12, 0.16, 2.35, 10, 1)} material={mats.stone} castShadow />
          <mesh position={[space.rect.w * 0.085, 1.55, 0.18]} geometry={cylinder(0.12, 0.16, 2.35, 10, 1)} material={mats.stone} castShadow />
          {Array.from({ length: 5 }, (_, band) => (
            <mesh key={band} position={[0, 0.62 + band * 0.58, 0.21]} geometry={box(space.rect.w * 0.17, 0.08, 0.08, 0.4)} material={i === 1 ? mats.metal : mats.alt} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** Small Nandi-like balustrade figures around Mahabalipuram's shrine court. */
function NandiFrieze({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const made = useMemo(() => {
    const bodies: Inst[] = []
    const heads: Inst[] = []
    const bases: Inst[] = []
    const count = 10
    for (let i = 0; i < count; i++) {
      const x = space.rect.cx - space.rect.w * 0.4 + (space.rect.w * 0.8 * i) / (count - 1)
      const z = space.rect.cz - space.rect.d / 2 + 0.68
      bases.push({ p: [x, space.floorY + 0.16, z], s: [1.05, 0.32, 0.78] })
      bodies.push({ p: [x, space.floorY + 0.62, z], s: [0.72, 0.48, 0.82] })
      heads.push({ p: [x, space.floorY + 0.83, z + 0.42], s: 0.44 })
    }
    return { bodies, heads, bases }
  }, [space])
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={made.bases} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={made.bodies} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.alt} items={made.heads} />
    </group>
  )
}

/** Grounded side-aisle figures. Every form has a floor plinth, so the row stays
 * convincing even where a room graph cuts a doorway into the nearby wall. */
function SideSculptureNiches({
  space,
  mats,
  seated = false,
  count = 4,
}: {
  space: WorldSpace
  mats: Pack
  seated?: boolean
  count?: number
}) {
  const made = useMemo(() => {
    const plinths: Inst[] = []
    const heads: Inst[] = []
    const bodies: Inst[] = []
    const usable = space.rect.d * 0.68
    for (const side of [-1, 1]) {
      const x = space.rect.cx + side * (space.rect.w / 2 - 1.15)
      for (let i = 0; i < count; i++) {
        const z = space.rect.cz - usable / 2 + (usable * (i + 0.5)) / count
        plinths.push({ p: [x, space.floorY + 0.27, z], s: [0.95, 0.54, usable / count * 0.58] })
        if (seated) {
          bodies.push({ p: [x, space.floorY + 0.92, z], s: [0.5, 0.6, 0.72] })
          bodies.push({ p: [x, space.floorY + 1.38, z], s: [0.34, 0.82, 0.34] })
          heads.push({ p: [x, space.floorY + 1.95, z], s: 0.48 })
        } else {
          bodies.push({ p: [x, space.floorY + 1.18, z], s: [0.38, 1.25, 0.38] })
          heads.push({ p: [x, space.floorY + 2.02, z], s: 0.52 })
        }
      }
    }
    return { plinths, heads, bodies }
  }, [space, seated, count])

  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.trim} items={made.plinths} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_CYL} material={mats.stone} items={made.bodies} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.alt} items={made.heads} castShadow receiveShadow={false} />
    </group>
  )
}

/** A ceiling rosette/mandala, varied by colour and petal rhythm per monument. */
function CeilingMedallion({
  space,
  mats,
  petals = 16,
  radiusScale = 0.19,
}: {
  space: WorldSpace
  mats: Pack
  petals?: number
  radiusScale?: number
}) {
  const radius = Math.min(space.rect.w, space.rect.d) * radiusScale
  const made = useMemo<Inst[]>(
    () => Array.from({ length: petals }, (_, i) => {
      const a = (i / petals) * Math.PI * 2
      return {
        p: [Math.cos(a) * radius * 0.56, 0, Math.sin(a) * radius * 0.56],
        s: [radius * 0.34, 0.14, radius * 0.82],
        r: [0, -a, 0],
      }
    }),
    [petals, radius],
  )
  return (
    <group position={[space.rect.cx, space.floorY + space.wallH - 0.5, space.rect.cz]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torus(radius, 0.13, 10, 42)} material={mats.dark} castShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.trim} items={made} castShadow={false} receiveShadow={false} />
      <mesh scale={[radius * 0.34, 0.18, radius * 0.34]} geometry={UNIT_SPHERE_HI} material={mats.metal} castShadow />
    </group>
  )
}

/** Black-stone inscription bands and corner rosettes around the Taj chamber. */
function TajCalligraphyCourse({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz - space.rect.d / 2 + 0.24
  const glyphs: Inst[] = Array.from({ length: 22 }, (_, i) => ({
    p: [space.rect.cx - space.rect.w * 0.39 + (space.rect.w * 0.78 * i) / 21, space.floorY + 3.55 + (i % 3) * 0.08, z + 0.12],
    s: [0.12 + (i % 2) * 0.08, 0.5 + (i % 4) * 0.1, 0.09],
    r: [0, 0, ((i % 5) - 2) * 0.12],
  }))
  const cornerRosettes: Inst[] = [-1, 1].flatMap((side) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2
      return {
        p: [space.rect.cx + side * space.rect.w * 0.39 + Math.cos(a) * 0.38, space.floorY + 2.05 + Math.sin(a) * 0.38, z + 0.14],
        s: [0.24, 0.4, 0.09],
        r: [0, 0, -a],
      }
    }),
  )
  return (
    <group>
      <mesh position={[space.rect.cx, space.floorY + 3.62, z]} geometry={box(space.rect.w * 0.86, 1.05, 0.16, 1)} material={mats.stone} receiveShadow />
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={glyphs} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.trim} items={cornerRosettes} castShadow={false} receiveShadow={false} />
    </group>
  )
}

/** Sun-wheel wall reliefs give Konark's hall a recognisable chariot identity. */
function SolarWheelGallery({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const wheels: Inst[] = []
  const hubs: Inst[] = []
  const spokes: Inst[] = []
  const bases: Inst[] = []
  for (const side of [-1, 1]) {
    const x = space.rect.cx + side * space.rect.w * 0.3
    for (const offset of [-0.23, 0.23]) {
      const z = space.rect.cz + offset * space.rect.d
      wheels.push({ p: [x, space.floorY + 1.55, z], s: 1 })
      hubs.push({ p: [x, space.floorY + 1.55, z + 0.08], s: 0.38 })
      bases.push({ p: [x, space.floorY + 0.18, z], s: [2.8, 0.36, 0.82] })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI
        spokes.push({ p: [x, space.floorY + 1.55, z + 0.07], s: [2.3, 0.08, 0.08], r: [0, 0, a] })
      }
    }
  }
  return (
    <group>
      <InstancedSet geometry={torus(1.22, 0.16, 10, 38)} material={mats.trim} items={wheels} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.metal} items={hubs} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_BOX} material={mats.alt} items={spokes} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={bases} castShadow receiveShadow />
    </group>
  )
}

/** Geometric inscription-like bands for Qutb, intentionally non-figural. */
function QutbGeometricGallery({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz + space.rect.d / 2 - 0.3
  const panels: Inst[] = []
  const diamonds: Inst[] = []
  const count = 9
  for (let i = 0; i < count; i++) {
    if (Math.abs(i - (count - 1) / 2) < 1.5) continue
    const x = space.rect.cx - space.rect.w * 0.4 + (space.rect.w * 0.8 * i) / (count - 1)
    panels.push({ p: [x, space.floorY + 2.05, z], s: [space.rect.w * 0.072, 3.35, 0.18] })
    for (let band = 0; band < 4; band++) {
      diamonds.push({ p: [x, space.floorY + 0.92 + band * 0.72, z - 0.14], s: [0.32, 0.32, 0.1], r: [0, 0, Math.PI / 4] })
    }
  }
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={panels} castShadow={false} receiveShadow />
      <InstancedSet geometry={UNIT_BOX} material={mats.trim} items={diamonds} castShadow={false} receiveShadow={false} />
      {[1.0, 3.2].flatMap((y) => [-1, 1].map((side) => (
        <mesh
          key={`${y}-${side}`}
          position={[space.rect.cx + side * space.rect.w * 0.27, space.floorY + y, z - 0.12]}
          geometry={box(space.rect.w * 0.34, 0.14, 0.1, 0.5)}
          material={mats.metal}
        />
      )))}
    </group>
  )
}

/** Bronze processional icons and bells along the Chola mandapa walls. */
function ProcessionalBronzes({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const heads: Inst[] = []
  const bodies: Inst[] = []
  const bases: Inst[] = []
  const bells: Inst[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = space.rect.cz - space.rect.d * 0.27 + i * space.rect.d * 0.18
      const x = space.rect.cx + side * space.rect.w * 0.39
      bases.push({ p: [x, space.floorY + 0.24, z], s: [0.92, 0.48, 0.92] })
      bodies.push({ p: [x, space.floorY + 1.15, z], s: [0.42, 1.3, 0.42] })
      heads.push({ p: [x, space.floorY + 2.0, z], s: 0.5 })
      bells.push({ p: [x, space.floorY + Math.min(3.8, space.wallH - 0.9), z], s: [0.28, 0.42, 0.28] })
    }
  }
  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={bases} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_CYL} material={mats.metal} items={bodies} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.trim} items={heads} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.metal} items={bells} castShadow={false} receiveShadow={false} />
    </group>
  )
}

/** Wall-bound Pallava family relief with lion pilasters for the coastal shrine. */
function SomaskandaRelief({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const z = space.rect.cz - space.rect.d / 2 + 0.42
  return (
    <group position={[space.rect.cx, space.floorY, z]}>
      <mesh position={[0, 1.8, 0]} geometry={box(Math.min(6.8, space.rect.w * 0.7), 3.35, 0.3, 1)} material={mats.dark} receiveShadow />
      {[-1.45, 0, 1.45].map((x, i) => (
        <group key={x} position={[x, 0, 0.22]}>
          <mesh position={[0, 1.34, 0]} scale={[i === 1 ? 0.38 : 0.48, i === 1 ? 0.92 : 1.28, 0.34]} geometry={UNIT_CYL} material={mats.stone} castShadow />
          <mesh position={[0, i === 1 ? 1.98 : 2.2, 0]} scale={i === 1 ? 0.44 : 0.54} geometry={UNIT_SPHERE_HI} material={mats.alt} castShadow />
          <mesh position={[0, 0.52, 0]} geometry={box(i === 1 ? 0.9 : 1.15, 0.3, 0.72, 1)} material={mats.trim} castShadow />
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * Math.min(3.05, space.rect.w * 0.3), 0, 0.18]}>
          <mesh position={[0, 1.55, 0]} geometry={cylinder(0.2, 0.3, 2.75, 12, 1)} material={mats.trim} castShadow />
          <mesh position={[0, 0.55, 0.18]} scale={[0.58, 0.48, 0.72]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow />
        </group>
      ))}
    </group>
  )
}

/** Open-air Buddhist focal group for Sanchi's documented main complex. */
function SanchiStupaCourt({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const scale = Math.min(1.35, Math.max(0.78, Math.min(space.rect.w, space.rect.d) / 24))
  return (
    <group position={[space.rect.cx, space.floorY, space.rect.cz]} scale={scale}>
      <mesh position={[0, 0.22, 0]} geometry={box(11.2, 0.44, 11.2, 1.6)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 0.55, 0]} geometry={cylinder(4.75, 5.15, 0.66, 48, 1)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 2.35, 0]} scale={[4.65, 2.15, 4.65]} geometry={UNIT_SPHERE_HI} material={mats.alt} castShadow receiveShadow />
      <mesh position={[0, 4.16, 0]} geometry={box(1.65, 0.62, 1.65, 0.8)} material={mats.dark} castShadow />
      <mesh position={[0, 5.42, 0]} geometry={cylinder(0.1, 0.13, 2.45, 12, 1)} material={mats.metal} castShadow />
      {[4.75, 5.35, 5.92].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} geometry={cylinder(0.72 - index * 0.14, 0.9 - index * 0.14, 0.12, 28, 1)} material={mats.trim} castShadow />
      ))}
      <group position={[0, 0, 6.35]}>
        {[-1.75, 1.75].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 2.25, 0]} geometry={cylinder(0.32, 0.4, 4.5, 16, 1)} material={mats.stone} castShadow />
            <mesh position={[0, 0.25, 0]} geometry={box(0.95, 0.5, 0.95, 0.8)} material={mats.dark} castShadow receiveShadow />
          </group>
        ))}
        {[2.25, 3.2, 4.15].map((y) => (
          <mesh key={y} position={[0, y, 0]} geometry={box(4.65, 0.42, 0.72, 0.9)} material={mats.trim} castShadow />
        ))}
      </group>
    </group>
  )
}

/** Marble pavilion focal wall and water channel for the Red Fort palace zone. */
function RedFortPalaceIdentity({ space, mats }: { space: WorldSpace; mats: Pack }) {
  const rearZ = space.rect.cz - space.rect.d / 2 + 0.5
  return (
    <group>
      <mesh position={[space.rect.cx, space.floorY + 2.8, rearZ]} geometry={box(Math.min(10.5, space.rect.w * 0.7), 5.6, 0.55, 1.2)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[space.rect.cx, space.floorY + 2.9, rearZ + 0.34]} geometry={torus(1.9, 0.24, 14, 56)} material={mats.trim} castShadow />
      <mesh position={[space.rect.cx, space.floorY + 0.32, rearZ + 2.1]} geometry={box(5.8, 0.64, 3.2, 1.1)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[space.rect.cx, space.floorY + 0.74, rearZ + 1.9]} geometry={box(4.7, 0.22, 2.45, 0.9)} material={mats.stone} castShadow />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[space.rect.cx + side * 3.85, space.floorY + 2.55, rearZ + 0.38]} geometry={cylinder(0.25, 0.34, 4.8, 18, 1)} material={mats.alt} castShadow />
      ))}
      <mesh position={[space.rect.cx, space.floorY + 0.09, space.rect.cz + space.rect.d * 0.1]} geometry={box(1.15, 0.18, space.rect.d * 0.72, 0.75)} material={mats.stone} receiveShadow />
      <mesh position={[space.rect.cx, space.floorY + 0.2, space.rect.cz + space.rect.d * 0.1]} geometry={box(0.62, 0.08, space.rect.d * 0.68, 0.65)} material={mats.metal} receiveShadow />
    </group>
  )
}

export function InteriorArtefacts({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const pack: Pack = {
    stone: mats.pick(mats.m.stoneAlt, 'INTERPRETIVE'),
    alt: mats.pick(mats.m.stone, 'RECONSTRUCTED'),
    dark: mats.pick(mats.m.dark, 'INTERPRETIVE'),
    trim: mats.pick(mats.m.trim, 'INTERPRETIVE'),
    metal: mats.pick(mats.m.metal, 'INTERPRETIVE'),
  }

  const taj = room(world, 'sp-cenotaph')
  const hampiHall = room(world, 'sp-h-mandapa')
  const hampiSanctum = room(world, 'sp-h-sanctum')
  const konarkHall = room(world, 'sp-k-jagamohana')
  const konarkDance = room(world, 'sp-k-natmandir')
  const ajantaNave = room(world, 'sp-a-nave')
  const ajantaApse = room(world, 'sp-a-apse')
  const khajHall = room(world, 'sp-kh-maha')
  const khajSanctum = room(world, 'sp-kh-garbha')
  const qutbScreen = room(world, 'sp-q-screen')
  const qutbMinar = room(world, 'sp-q-minar')
  const brihadHall = room(world, 'sp-t-mandapa')
  const brihadSanctum = room(world, 'sp-t-sanctum')
  const mahaShrine = room(world, 'sp-m-shrine')
  const mahaHall = room(world, 'sp-m-mandapa')
  const redFortPalace = room(world, 'sp-rf-palace')
  const sanchiCourt = room(world, 'sanchi-main-complex')

  return (
    <group>
      {taj && <TajInlayPanels space={taj} mats={pack} />}
      {taj && <TajCalligraphyCourse space={taj} mats={pack} />}
      {taj && <CeilingMedallion space={taj} mats={pack} petals={20} radiusScale={0.17} />}

      {hampiHall && <MusicalPillarClusters space={hampiHall} mats={pack} />}
      {hampiHall && <SideSculptureNiches space={hampiHall} mats={pack} count={4} />}
      {hampiHall && <CeilingMedallion space={hampiHall} mats={pack} petals={12} radiusScale={0.14} />}
      {hampiSanctum && <GuardianPair space={hampiSanctum} mats={pack} />}
      {hampiSanctum && <VaishnavaIdentity space={hampiSanctum} mats={pack} />}
      {hampiSanctum && <RitualFurnishings space={hampiSanctum} mats={pack} />}

      {konarkHall && <StandingSolarImage space={konarkHall} mats={pack} />}
      {konarkHall && <ReliefRegister space={konarkHall} mats={pack} count={9} />}
      {konarkHall && <SolarWheelGallery space={konarkHall} mats={pack} />}
      {konarkHall && <CeilingMedallion space={konarkHall} mats={pack} petals={24} radiusScale={0.16} />}
      {konarkDance && <ReliefRegister space={konarkDance} mats={pack} count={10} />}

      {ajantaNave && <BuddhaGallery space={ajantaNave} mats={pack} />}
      {ajantaNave && <SideSculptureNiches space={ajantaNave} mats={pack} seated count={5} />}
      {ajantaNave && <CeilingMedallion space={ajantaNave} mats={pack} petals={16} radiusScale={0.15} />}
      {ajantaApse && <RitualFurnishings space={ajantaApse} mats={pack} buddhist />}
      {ajantaApse && <SideSculptureNiches space={ajantaApse} mats={pack} seated count={2} />}

      {khajHall && <ReliefRegister space={khajHall} mats={pack} count={12} />}
      {khajHall && <SideSculptureNiches space={khajHall} mats={pack} count={5} />}
      {khajHall && <CeilingMedallion space={khajHall} mats={pack} petals={18} radiusScale={0.15} />}
      {khajSanctum && <GuardianPair space={khajSanctum} mats={pack} />}
      {khajSanctum && <RitualFurnishings space={khajSanctum} mats={pack} />}

      {qutbScreen && <QutbPrayerScreen space={qutbScreen} mats={pack} />}
      {qutbScreen && <QutbGeometricGallery space={qutbScreen} mats={pack} />}
      {qutbMinar && <QutbGeometricGallery space={qutbMinar} mats={pack} />}

      {brihadHall && <ReliefRegister space={brihadHall} mats={pack} count={10} />}
      {brihadHall && <ProcessionalBronzes space={brihadHall} mats={pack} />}
      {brihadHall && <CeilingMedallion space={brihadHall} mats={pack} petals={16} radiusScale={0.14} />}
      {brihadSanctum && <GuardianPair space={brihadSanctum} mats={pack} />}
      {brihadSanctum && <SideSculptureNiches space={brihadSanctum} mats={pack} count={3} />}
      {brihadSanctum && <RitualFurnishings space={brihadSanctum} mats={pack} />}

      {mahaShrine && <NandiFrieze space={mahaShrine} mats={pack} />}
      {mahaShrine && <SomaskandaRelief space={mahaShrine} mats={pack} />}
      {mahaShrine && <CeilingMedallion space={mahaShrine} mats={pack} petals={12} radiusScale={0.14} />}
      {mahaShrine && <GuardianPair space={mahaShrine} mats={pack} />}
      {mahaShrine && <RitualFurnishings space={mahaShrine} mats={pack} />}
      {mahaHall && <ReliefRegister space={mahaHall} mats={pack} count={8} />}
      {mahaHall && <SideSculptureNiches space={mahaHall} mats={pack} count={4} />}

      {redFortPalace && <RedFortPalaceIdentity space={redFortPalace} mats={pack} />}
      {sanchiCourt && <SanchiStupaCourt space={sanchiCourt} mats={pack} />}
    </group>
  )
}
