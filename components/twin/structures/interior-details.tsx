'use client'

/**
 * Interior scale and atmosphere shared by every monument.
 *
 * The room graph is documentary; these ceiling ribs, paving joints and lamp
 * forms are deliberately typological and therefore use INTERPRETIVE materials.
 * They make the same exterior shell remain convincing after the visitor crosses
 * a real threshold instead of swapping to a separate stage set.
 */

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX, box, cylinder, torus } from '@/lib/twin/geometry'
import type { LightRig } from '@/lib/twin/light'
import type { WorldModel } from '@/lib/twin/model'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

function hasRitualLamp(spaceId: string) {
  // The Qutb stair chamber is circulation, not a shrine; Konark's deul is a
  // collapsed footprint. A generic hanging lamp in either would be both
  // visually obstructive and historically misleading.
  return spaceId !== 'sp-q-minar' && spaceId !== 'sp-k-deul'
}

function ritualLampPosition(space: WorldModel['spaces'][number]): [number, number, number] {
  return [
    space.rect.cx - space.rect.w * 0.33,
    space.floorY + Math.min(3.05, space.wallH * 0.42),
    space.rect.cz + space.rect.d * 0.27,
  ]
}

const FLAME_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vPulse;
  void main() {
    vec3 p = position;
    float pulse = sin(uTime * 2.8 + aSeed * 12.0) * 0.5 + 0.5;
    p.x += sin(uTime * 2.2 + aSeed * 9.0) * 0.016;
    p.y += pulse * 0.018;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (13.0 + pulse * 2.4) * uScale * (160.0 / max(-mv.z, 1.0));
    vPulse = pulse;
  }
`

const FLAME_FRAG = /* glsl */ `
  varying float vPulse;
  void main() {
    vec2 p = gl_PointCoord - vec2(0.5, 0.58);
    p.x *= 1.55;
    float d = length(p);
    if (d > 0.48) discard;
    float core = smoothstep(0.46, 0.05, d);
    vec3 hot = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.92, 0.48), core);
    gl_FragColor = vec4(hot, core * (0.82 + vPulse * 0.08));
  }
`

function FlameField({ world, rig, reducedMotion }: { world: WorldModel; rig: LightRig; reducedMotion: boolean }) {
  const { geometry, material } = useMemo(() => {
    const positions: number[] = []
    const seeds: number[] = []
    const points = [
      ...world.props.lamps.map((l) => [l.x, world.collision.groundAt(l.x, l.z, 40) + 2.9, l.z] as const),
      ...world.spaces
        .filter(
          (s) =>
            s.roofed &&
            hasRitualLamp(s.space.id) &&
            (s.space.kind === 'SANCTUM' || s.space.kind === 'CHAMBER'),
        )
        .map((s) => ritualLampPosition(s)),
    ]
    points.forEach((p, i) => {
      positions.push(...p)
      seeds.push(((i * 0.61803398875) % 1) + 0.01)
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 0.62 + rig.lamp * 0.42 } },
    })
    return { geometry: geo, material: mat }
  }, [world, rig.lamp])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ clock }) => {
    if (!reducedMotion) material.uniforms.uTime.value = clock.getElapsedTime()
  })

  if (rig.lamp < 0.22) return null
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export function InteriorDetails({
  world,
  mats,
  rig,
  reducedMotion,
  detail = 1,
}: {
  world: WorldModel
  mats: TwinMaterials
  rig: LightRig
  reducedMotion: boolean
  detail?: number
}) {
  const { m, pick } = mats
  const dark = pick(m.dark, 'INTERPRETIVE')
  const trim = pick(m.trim, 'INTERPRETIVE')
  const wood = pick(m.wood, 'INTERPRETIVE')

  const built = useMemo(() => {
    const ceiling: Inst[] = []
    const paving: Inst[] = []
    for (const s of world.spaces) {
      if (!s.roofed) continue
      const { cx, cz, w, d } = s.rect
      const top = s.floorY + s.wallH - 0.34
      const ceilingStep = detail > 1 ? 3.2 : 4.8
      const nx = Math.min(10, Math.max(2, Math.round(w / ceilingStep)))
      const nz = Math.min(10, Math.max(2, Math.round(d / ceilingStep)))
      for (let i = 1; i < nx; i++) {
        const x = cx - w / 2 + (w * i) / nx
        ceiling.push({ p: [x, top, cz], s: [0.2, 0.34, d * 0.94] })
      }
      for (let i = 1; i < nz; i++) {
        const z = cz - d / 2 + (d * i) / nz
        ceiling.push({ p: [cx, top - 0.03, z], s: [w * 0.94, 0.28, 0.2] })
      }

      const jointStep = detail > 1 ? 2.2 : 3.6
      const px = Math.min(14, Math.max(2, Math.round(w / jointStep)))
      const pz = Math.min(14, Math.max(2, Math.round(d / jointStep)))
      for (let i = 1; i < px; i++) {
        const x = cx - w / 2 + (w * i) / px
        paving.push({ p: [x, s.floorY + 0.07, cz], s: [0.035, 0.025, d * 0.93] })
      }
      for (let i = 1; i < pz; i++) {
        const z = cz - d / 2 + (d * i) / pz
        paving.push({ p: [cx, s.floorY + 0.071, z], s: [w * 0.93, 0.025, 0.035] })
      }
    }
    return { ceiling, paving }
  }, [world, detail])

  return (
    <group>
      <InstancedSet geometry={UNIT_BOX} material={wood} items={built.ceiling} castShadow receiveShadow={false} />
      <InstancedSet geometry={UNIT_BOX} material={dark} items={built.paving} castShadow={false} receiveShadow={false} />

      {world.spaces
        .filter(
          (s) =>
            s.roofed &&
            hasRitualLamp(s.space.id) &&
            (s.space.kind === 'SANCTUM' || s.space.kind === 'CHAMBER'),
        )
        .map((s) => {
          const [lampX, lampY, lampZ] = ritualLampPosition(s)
          const chain = Math.max(0.5, s.floorY + s.wallH - lampY - 0.35)
          return (
            <group key={`inner-lamp-${s.space.id}`} position={[lampX, lampY, lampZ]}>
              <mesh position={[0, chain / 2 + 0.28, 0]} geometry={cylinder(0.025, 0.025, chain, 8, 1)} material={m.metal} />
              <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torus(0.34, 0.055, 8, 24)} material={trim} castShadow />
              <mesh position={[0, -0.1, 0]} geometry={box(0.52, 0.12, 0.52, 1)} material={dark} castShadow />
            </group>
          )
        })}

      <FlameField world={world} rig={rig} reducedMotion={reducedMotion} />
    </group>
  )
}
