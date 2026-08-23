'use client'

/**
 * Monument-specific focal objects.
 *
 * The room graph gives us the right place; the catalogue tells us which object
 * belongs there. These are still reference reconstructions rather than scans,
 * but they replace the old one-size-fits-all glowing sanctum marker with forms
 * that are specific to the monument: Ajanta's monolithic stupa, the great linga
 * at Brihadisvara, the Iron Pillar at Qutb, and the signature detached shrines at
 * Hampi and Mahabalipuram. Repeated pieces are instanced so the extra silhouette
 * detail does not multiply draw calls.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { anchorFor } from '@/lib/twin/anchors'
import {
  UNIT_BOX,
  UNIT_CYL,
  UNIT_SPHERE_HI,
  box,
  cone,
  cylinder,
  sphere,
  torus,
} from '@/lib/twin/geometry'
import type { WorldModel, WorldSpace } from '@/lib/twin/model'
import { spiralStairFor } from '@/lib/twin/spiral-stair'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

type MaterialPack = {
  stone: THREE.Material
  dark: THREE.Material
  trim: THREE.Material
  polished: THREE.Material
  iron: THREE.Material
  glow: THREE.Material
}

function floorOf(anchor: NonNullable<ReturnType<typeof anchorFor>>) {
  return anchor.position[1] - 1.5
}

function faceCore(world: WorldModel, x: number, z: number) {
  if (!world.core) return 0
  return Math.atan2(world.core.rect.cx - x, world.core.rect.cz - z)
}

function LampRing({ radius, y, mats }: { radius: number; y: number; mats: MaterialPack }) {
  const stems = useMemo<Inst[]>(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return { p: [Math.cos(a) * radius, y, Math.sin(a) * radius], s: [0.09, 0.54, 0.09] }
      }),
    [radius, y],
  )
  const bowls = useMemo<Inst[]>(
    () => stems.map((s) => ({ p: [s.p[0], y + 0.34, s.p[2]], s: [0.32, 0.12, 0.32] })),
    [stems, y],
  )
  const flames = useMemo<Inst[]>(
    () => stems.map((s) => ({ p: [s.p[0], y + 0.58, s.p[2]], s: [0.11, 0.28, 0.11] })),
    [stems, y],
  )

  return (
    <group>
      <InstancedSet geometry={UNIT_CYL} material={mats.trim} items={stems} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.trim} items={bowls} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.glow} items={flames} castShadow={false} receiveShadow={false} />
    </group>
  )
}

function ShivaLinga({ space, mats, monumental = false }: { space: WorldSpace; mats: MaterialPack; monumental?: boolean }) {
  const span = Math.min(space.rect.w, space.rect.d)
  const scale = Math.min(monumental ? 1.55 : 1.1, span / 8)
  const r = 0.78 * scale
  const y = space.floorY

  return (
    <group position={[space.rect.cx, y, space.rect.cz]}>
      <mesh position={[0, 0.24, 0]} geometry={box(4.6 * scale, 0.48, 3.7 * scale, 1.4)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 0.52, 0]} geometry={box(3.9 * scale, 0.18, 3.1 * scale, 1.2)} material={mats.dark} castShadow />
      <mesh position={[0, 0.68, 2.08 * scale]} geometry={box(0.82 * scale, 0.22, 1.35 * scale, 1)} material={mats.dark} castShadow />
      <mesh position={[0, 1.82 * scale, 0]} geometry={cylinder(r, r * 1.03, 2.65 * scale, 36, 1.4)} material={mats.polished} castShadow receiveShadow />
      <mesh position={[0, 3.14 * scale, 0]} scale={[1, 0.62, 1]} geometry={sphere(r, 36, 24, Math.PI * 2, Math.PI / 2)} material={mats.polished} castShadow />
      <mesh position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={torus(1.45 * scale, 0.12 * scale, 10, 36)} material={mats.trim} castShadow />
      <LampRing radius={2.55 * scale} y={0.38} mats={mats} />
    </group>
  )
}

function AjantaStupa({ space, mats }: { space: WorldSpace; mats: MaterialPack }) {
  // Leave a genuine ambulatory around the stupa in the compact solved apse.
  // The earlier scale filled the visitor's whole view and left no walkable ring.
  const scale = Math.min(0.82, Math.min(space.rect.w, space.rect.d) / 10)
  const y = space.floorY
  return (
    <group position={[space.rect.cx, y, space.rect.cz]}>
      <mesh position={[0, 0.28, 0]} geometry={cylinder(2.65 * scale, 2.9 * scale, 0.56, 40, 2)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 0.78, 0]} geometry={cylinder(2.28 * scale, 2.48 * scale, 0.46, 40, 2)} material={mats.stone} castShadow />
      <mesh position={[0, 1.12, 0]} scale={[1, 0.72, 1]} geometry={sphere(2.1 * scale, 40, 24, Math.PI * 2, Math.PI / 2)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 2.54 * scale, 0]} geometry={box(1.28 * scale, 0.58 * scale, 1.28 * scale, 1)} material={mats.dark} castShadow />
      <mesh position={[0, 3.58 * scale, 0]} geometry={cylinder(0.11, 0.14, 1.8 * scale, 12, 1)} material={mats.trim} castShadow />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, (3.12 + i * 0.55) * scale, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={torus((1.15 - i * 0.2) * scale, 0.09 * scale, 8, 32)}
          material={mats.trim}
          castShadow
        />
      ))}
      <LampRing radius={3.15 * scale} y={0.34} mats={mats} />
    </group>
  )
}

function EmptyImagePlatform({ space, mats, ruined = false }: { space: WorldSpace; mats: MaterialPack; ruined?: boolean }) {
  const r = Math.min(space.rect.w, space.rect.d) * 0.18
  const rubble = useMemo<Inst[]>(
    () =>
      Array.from({ length: ruined ? 13 : 0 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2 + (i % 3) * 0.21
        const d = r * (1.5 + (i % 4) * 0.18)
        return {
          p: [Math.cos(a) * d, 0.18 + (i % 2) * 0.11, Math.sin(a) * d],
          s: [0.5 + (i % 3) * 0.18, 0.34 + (i % 2) * 0.18, 0.72 + (i % 4) * 0.12],
          r: [0.08 * (i % 3), a, 0.06 * (i % 2)],
        }
      }),
    [r, ruined],
  )

  return (
    <group position={[space.rect.cx, space.floorY, space.rect.cz]}>
      <mesh position={[0, 0.28, 0]} geometry={box(r * 3.4, 0.56, r * 3.4, 1.2)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 0.68, 0]} geometry={box(r * 2.7, 0.24, r * 2.7, 1.1)} material={mats.stone} castShadow />
      <mesh position={[0, 1.05, -r * 1.18]} geometry={box(r * 2.45, 0.78, 0.34, 1)} material={mats.stone} castShadow />
      {!ruined && <LampRing radius={r * 2.35} y={0.34} mats={mats} />}
      {ruined && <InstancedSet geometry={UNIT_BOX} material={mats.dark} items={rubble} castShadow receiveShadow />}
    </group>
  )
}

/**
 * Vitthala/Vishnu reference icon for the Hampi sanctum.
 *
 * UNESCO documents the principal shrine as dedicated to Vitthala (Vishnu), but
 * no surviving cult image is being claimed here.  The arms-akimbo stance,
 * crowned head, sacred halo and lotus pedestal make that identity immediately
 * legible while the surrounding evidence copy keeps the form interpretive.
 */
function VitthalaIcon({ space, mats }: { space: WorldSpace; mats: MaterialPack }) {
  const span = Math.min(space.rect.w, space.rect.d)
  const scale = Math.min(0.9, span / 10)
  const lotus = useMemo<Inst[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return {
          p: [Math.cos(a) * 1.28, 0.72, Math.sin(a) * 0.72],
          s: [0.54, 0.2, 0.3],
          r: [0, -a, 0],
        }
      }),
    [],
  )

  return (
    <group position={[space.rect.cx, space.floorY, space.rect.cz - space.rect.d * 0.04]} scale={scale}>
      <pointLight position={[0, 3.1, 3.1]} color="#ffd6a1" intensity={13} distance={8.5} decay={2} castShadow={false} />
      {/* grounded, stepped shrine pedestal */}
      <mesh position={[0, 0.2, 0]} geometry={box(4.8, 0.4, 3.65, 1.2)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 0.5, 0]} geometry={box(4.15, 0.22, 3.05, 1.1)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 0.67, 0]} geometry={cylinder(1.55, 1.72, 0.28, 32, 1)} material={mats.dark} castShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={lotus} castShadow={false} receiveShadow={false} />

      {/* prabhavali: a stone aureole clearly behind, never floating in front */}
      <mesh position={[0, 2.92, -0.46]} geometry={torus(1.68, 0.14, 12, 56)} material={mats.stone} castShadow />
      <mesh position={[0, 2.92, -0.52]} geometry={torus(1.91, 0.065, 8, 56)} material={mats.trim} castShadow={false} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI * (0.1 + (i / 10) * 0.8)
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.92, 2.92 + Math.sin(a) * 1.92, -0.5]}
            rotation={[0, 0, -a + Math.PI / 2]}
            geometry={cone(0.1, 0.42, 10)}
            material={mats.stone}
            castShadow={false}
          />
        )
      })}

      {/* granite icon: feet, dhoti, torso and the characteristic arms-akimbo pose */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`}>
          <mesh position={[side * 0.34, 1.32, 0.02]} geometry={cylinder(0.22, 0.28, 1.28, 16, 1)} material={mats.polished} castShadow />
          <mesh position={[side * 0.36, 0.84, 0.22]} geometry={box(0.62, 0.24, 0.92, 0.8)} material={mats.polished} castShadow />
        </group>
      ))}
      <mesh position={[0, 1.86, 0]} geometry={cylinder(0.48, 0.68, 1.18, 24, 1)} material={mats.polished} castShadow receiveShadow />
      <mesh position={[0, 2.6, 0]} geometry={cylinder(0.68, 0.48, 1.04, 24, 1)} material={mats.polished} castShadow receiveShadow />
      <mesh position={[0, 2.78, 0]} scale={[0.82, 0.66, 0.5]} geometry={UNIT_SPHERE_HI} material={mats.polished} castShadow />
      {[-1, 1].map((side) => (
        <mesh key={`shoulder-${side}`} position={[side * 0.58, 2.82, 0]} scale={[0.34, 0.28, 0.34]} geometry={UNIT_SPHERE_HI} material={mats.polished} castShadow />
      ))}
      <mesh position={[0, 2.04, 0.36]} geometry={box(1.42, 0.15, 0.16, 0.6)} material={mats.trim} castShadow={false} />
      <mesh position={[0, 2.08, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={torus(0.58, 0.065, 8, 30)} material={mats.stone} castShadow={false} />
      <mesh position={[0, 2.79, 0.4]} geometry={torus(0.52, 0.07, 8, 30)} material={mats.stone} castShadow={false} />
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={`pleat-${x}`} position={[x, 1.72, 0.55]} geometry={box(0.08, 0.82, 0.08, 0.25)} material={mats.stone} castShadow={false} />
      ))}
      {[-1, 1].map((side) => (
        <group key={`arm-${side}`}>
          <mesh position={[side * 0.78, 2.58, 0]} rotation={[0, 0, side * 0.76]} geometry={cylinder(0.16, 0.2, 1.15, 14, 1)} material={mats.polished} castShadow />
          <mesh position={[side * 1.08, 2.06, 0.04]} rotation={[0, 0, side * -0.5]} geometry={cylinder(0.14, 0.18, 1.02, 14, 1)} material={mats.polished} castShadow />
          <mesh position={[side * 0.88, 1.72, 0.08]} scale={[0.34, 0.26, 0.28]} geometry={UNIT_SPHERE_HI} material={mats.polished} castShadow />
          <mesh position={[side * 0.9, 2.93, 0]} geometry={torus(0.2, 0.055, 8, 22)} material={mats.stone} castShadow={false} />
          <mesh position={[side * 1.06, 2.13, 0.02]} geometry={torus(0.18, 0.045, 8, 20)} material={mats.stone} castShadow={false} />
        </group>
      ))}

      {/* face, tall kirita crown, earrings and a restrained vertical tilaka */}
      <mesh position={[0, 3.46, 0]} scale={[0.68, 0.82, 0.62]} geometry={UNIT_SPHERE_HI} material={mats.polished} castShadow />
      <mesh position={[0, 3.44, 0.55]} rotation={[Math.PI / 2, 0, 0]} geometry={cone(0.1, 0.28, 10)} material={mats.polished} castShadow />
      {[-1, 1].map((side) => (
        <mesh key={`eye-${side}`} position={[side * 0.16, 3.57, 0.57]} scale={[0.055, 0.045, 0.035]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow={false} />
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`ear-${side}`} position={[side * 0.42, 3.42, 0.04]} geometry={torus(0.19, 0.055, 8, 20)} material={mats.stone} castShadow={false} />
      ))}
      <mesh position={[0, 4.04, 0]} geometry={cylinder(0.35, 0.52, 0.72, 20, 1)} material={mats.stone} castShadow />
      <mesh position={[0, 4.57, 0]} geometry={cone(0.3, 0.66, 18)} material={mats.stone} castShadow />
      <mesh position={[0, 3.55, 0.59]} geometry={box(0.055, 0.34, 0.05, 0.2)} material={mats.stone} castShadow={false} />
    </group>
  )
}

function Nandi({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const a = anchorFor(world.anchors, 'hs-t-nandi')
  if (!a) return null
  const yaw = faceCore(world, a.position[0], a.position[2])
  return (
    <group position={[a.position[0], floorOf(a), a.position[2]]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.25, 0]} geometry={box(4.8, 0.5, 6.2, 1.8)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 1.55, -0.35]} scale={[1.8, 1.2, 2.45]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 2.42, -0.55]} scale={[1.3, 1.05, 1.35]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow />
      <mesh position={[0, 2.05, 1.55]} scale={[1.1, 0.95, 1.15]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow />
      <mesh position={[0, 2.12, 2.42]} scale={[0.82, 0.56, 0.75]} geometry={UNIT_SPHERE_HI} material={mats.dark} castShadow />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.62, 2.95, 1.8]} rotation={[0.24, 0, side * -0.44]} geometry={cone(0.22, 0.92, 14)} material={mats.trim} castShadow />
          <mesh position={[side * 0.94, 2.52, 1.72]} rotation={[0, 0, side * 0.54]} scale={[0.7, 0.26, 0.48]} geometry={UNIT_SPHERE_HI} material={mats.stone} castShadow />
        </group>
      ))}
      <InstancedSet
        geometry={UNIT_CYL}
        material={mats.stone}
        items={[-0.82, 0.82].flatMap((x) => [-1.45, 0.92].map((z) => ({ p: [x, 0.86, z] as [number, number, number], s: [0.48, 1.25, 0.48] as [number, number, number] })))}
      />
      <mesh position={[0, 2.1, -2.45]} rotation={[Math.PI / 2, 0, 0]} geometry={torus(0.72, 0.13, 10, 30, Math.PI * 1.35)} material={mats.trim} castShadow />
      <mesh position={[0, 2.15, 0.38]} rotation={[Math.PI / 2, 0, 0]} geometry={torus(1.28, 0.12, 10, 36)} material={mats.trim} castShadow />
    </group>
  )
}

function StoneChariot({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const a = anchorFor(world.anchors, 'hs-chariot')
  if (!a) return null
  const yaw = faceCore(world, a.position[0], a.position[2])
  const tiers: Inst[] = Array.from({ length: 5 }, (_, i) => ({
    p: [0, 4.1 + i * 0.52, 0],
    s: [3.8 - i * 0.48, 0.46, 4.3 - i * 0.5],
  }))
  const columns: Inst[] = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ p: [x * 1.45, 2.55, z * 1.7] as [number, number, number], s: [0.28, 2.8, 0.28] as [number, number, number] })))
  const wheels: Inst[] = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ p: [x * 1.65, 0.95, z * 2.75] as [number, number, number], s: 1, r: [0, 0, 0] as [number, number, number] })))
  return (
    <group position={[a.position[0], floorOf(a), a.position[2]]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.32, 0]} geometry={box(5.2, 0.64, 6.4, 1.8)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 1.72, 0]} geometry={box(3.9, 2.75, 4.8, 1.8)} material={mats.stone} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_CYL} material={mats.trim} items={columns} />
      <InstancedSet geometry={UNIT_BOX} material={mats.stone} items={tiers} />
      <InstancedSet geometry={torus(0.92, 0.15, 10, 32)} material={mats.dark} items={wheels} />
      <mesh position={[0, 6.88, 0]} geometry={sphere(0.42, 22, 16)} material={mats.trim} castShadow />
    </group>
  )
}

function IronPillar({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const a = anchorFor(world.anchors, 'hs-q-iron')
  if (!a) return null
  return (
    <group position={[a.position[0], floorOf(a), a.position[2]]}>
      <mesh position={[0, 0.22, 0]} geometry={box(2.8, 0.44, 2.8, 1.2)} material={mats.stone} castShadow receiveShadow />
      <mesh position={[0, 0.54, 0]} geometry={cylinder(0.68, 0.8, 0.38, 24, 1)} material={mats.iron} castShadow />
      <mesh position={[0, 3.85, 0]} geometry={cylinder(0.28, 0.43, 6.3, 28, 1)} material={mats.iron} castShadow receiveShadow />
      <mesh position={[0, 6.92, 0]} geometry={cylinder(0.56, 0.34, 0.32, 28, 1)} material={mats.iron} castShadow />
      <mesh position={[0, 7.2, 0]} geometry={cylinder(0.36, 0.5, 0.26, 28, 1)} material={mats.trim} castShadow />
    </group>
  )
}

function MonolithicRatha({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const a = anchorFor(world.anchors, 'hs-m-ratha')
  if (!a) return null
  const yaw = faceCore(world, a.position[0], a.position[2])
  const tiers: Inst[] = Array.from({ length: 5 }, (_, i) => ({
    p: [0, 3.5 + i * 0.58, 0],
    s: [4.7 - i * 0.55, 0.5, 5.5 - i * 0.58],
  }))
  return (
    <group position={[a.position[0], floorOf(a), a.position[2]]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.3, 0]} geometry={box(5.9, 0.6, 6.8, 1.8)} material={mats.dark} castShadow receiveShadow />
      <mesh position={[0, 1.95, 0]} geometry={box(4.8, 2.9, 5.7, 1.8)} material={mats.stone} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_BOX} material={mats.stone} items={tiers} />
      <mesh position={[0, 6.55, 0]} geometry={sphere(0.48, 22, 16)} material={mats.trim} castShadow />
      <InstancedSet
        geometry={UNIT_CYL}
        material={mats.trim}
        items={[-1, 1].map((x) => ({ p: [x * 1.45, 2.05, 2.98] as [number, number, number], s: [0.34, 2.65, 0.34] as [number, number, number] }))}
      />
    </group>
  )
}

function KhajurahoRegister({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const a = anchorFor(world.anchors, 'hs-kh-registers')
  if (!a) return null
  const yaw = faceCore(world, a.position[0], a.position[2]) + Math.PI
  const heads: Inst[] = []
  const bodies: Inst[] = []
  const limbs: Inst[] = []
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.62
    const sway = (i % 3 - 1) * 0.1
    heads.push({ p: [x, 1.75 + sway, 0.12], s: 0.34 })
    bodies.push({ p: [x, 0.98, 0], s: [0.34, 1.05, 0.25], r: [0, 0, sway] })
    limbs.push({ p: [x - 0.22, 0.98, 0.02], s: [0.1, 0.95, 0.1], r: [0, 0, -0.28 + sway] })
    limbs.push({ p: [x + 0.22, 0.98, 0.02], s: [0.1, 0.95, 0.1], r: [0, 0, 0.28 + sway] })
  }
  return (
    <group position={a.position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.85, -0.18]} geometry={box(6.2, 2.75, 0.34, 1)} material={mats.dark} receiveShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={heads} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_CYL} material={mats.stone} items={bodies} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_CYL} material={mats.trim} items={limbs} castShadow={false} receiveShadow={false} />
      <mesh position={[0, 2.38, 0]} geometry={box(6.5, 0.24, 0.48, 1)} material={mats.trim} castShadow />
    </group>
  )
}

function KhajurahoLotusCeiling({ space, mats }: { space: WorldSpace; mats: MaterialPack }) {
  const radius = Math.min(space.rect.w, space.rect.d) * 0.22
  const petals = useMemo<Inst[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        return {
          p: [Math.cos(a) * radius, 0, Math.sin(a) * radius],
          s: [radius * 0.28, 0.16, radius * 0.72],
          r: [0, -a, 0],
        }
      }),
    [radius],
  )
  return (
    <group position={[space.rect.cx, space.floorY + space.wallH - 0.48, space.rect.cz]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torus(radius * 1.12, 0.14, 10, 42)} material={mats.dark} castShadow />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={mats.stone} items={petals} castShadow receiveShadow={false} />
      <mesh scale={[radius * 0.62, 0.24, radius * 0.62]} geometry={UNIT_SPHERE_HI} material={mats.trim} castShadow />
    </group>
  )
}

function QutbSpiralStair({ world, mats }: { world: WorldModel; mats: MaterialPack }) {
  const room = world.spaces.find((s) => s.space.id === 'sp-q-minar')
  if (!room) return null
  const spiral = spiralStairFor(room)
  const steps: Inst[] = spiral.treads.map((tread) => ({
    p: [tread.x, tread.y, tread.z],
    s: [spiral.treadWidth, spiral.treadThickness, spiral.treadDepth],
    r: [0, -tread.angle, 0],
  }))
  const posts: Inst[] = spiral.treads.filter((_, i) => i % 2 === 0).map((tread) => {
    const scale = (spiral.radius * 1.12) / spiral.pathRadius
    return {
      p: [tread.x * scale, tread.top + 0.62, tread.z * scale],
      s: [0.09, 1.3, 0.09],
    }
  })
  return (
    <group position={[room.rect.cx, room.floorY, room.rect.cz]}>
      <mesh position={[0, room.wallH * 0.42, 0]} geometry={cylinder(0.34, 0.42, room.wallH * 0.84, 28, 1.5)} material={mats.iron} castShadow receiveShadow />
      <InstancedSet geometry={UNIT_BOX} material={mats.stone} items={steps} />
      <InstancedSet geometry={UNIT_CYL} material={mats.iron} items={posts} castShadow={false} receiveShadow={false} />
      <mesh position={[0, 0.08, 0]} geometry={cylinder(spiral.radius * 1.25, spiral.radius * 1.4, 0.16, 32, 2)} material={mats.dark} receiveShadow />
    </group>
  )
}

export function SiteArtefacts({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const polishedBase = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#181715',
        roughness: 0.18,
        metalness: 0.12,
        clearcoat: 0.82,
        clearcoatRoughness: 0.16,
      }),
    [],
  )
  const ironBase = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a342d', roughness: 0.38, metalness: 0.82 }),
    [],
  )

  useEffect(
    () => () => {
      polishedBase.dispose()
      ironBase.dispose()
    },
    [polishedBase, ironBase],
  )

  const pack: MaterialPack = {
    stone: mats.pick(mats.m.stoneAlt, 'RECONSTRUCTED'),
    dark: mats.pick(mats.m.dark, 'RECONSTRUCTED'),
    trim: mats.pick(mats.m.trim, 'INTERPRETIVE'),
    polished: mats.pick(polishedBase, 'RECONSTRUCTED'),
    iron: mats.pick(ironBase, 'RECONSTRUCTED'),
    glow: mats.m.glow,
  }
  const sanctum = world.spaces.find((s) => s.space.kind === 'SANCTUM') ?? null

  return (
    <group>
      {sanctum && world.site.slug === 'ajanta-caves' && <AjantaStupa space={sanctum} mats={pack} />}
      {sanctum && world.site.slug === 'brihadisvara-thanjavur' && <ShivaLinga space={sanctum} mats={pack} monumental />}
      {sanctum && world.site.slug === 'mahabalipuram' && <ShivaLinga space={sanctum} mats={pack} />}
      {sanctum && world.site.slug === 'hampi' && <VitthalaIcon space={sanctum} mats={pack} />}
      {sanctum && world.site.slug === 'konark-sun-temple' && <EmptyImagePlatform space={sanctum} mats={pack} ruined />}
      {sanctum && world.site.slug === 'khajuraho' && <ShivaLinga space={sanctum} mats={pack} />}
      {sanctum && world.site.slug === 'khajuraho' && <KhajurahoLotusCeiling space={sanctum} mats={pack} />}

      {world.site.slug === 'brihadisvara-thanjavur' && <Nandi world={world} mats={pack} />}
      {world.site.slug === 'hampi' && <StoneChariot world={world} mats={pack} />}
      {world.site.slug === 'qutb-minar' && <IronPillar world={world} mats={pack} />}
      {world.site.slug === 'qutb-minar' && <QutbSpiralStair world={world} mats={pack} />}
      {world.site.slug === 'mahabalipuram' && <MonolithicRatha world={world} mats={pack} />}
      {world.site.slug === 'khajuraho' && <KhajurahoRegister world={world} mats={pack} />}
    </group>
  )
}
