'use client'

/**
 * Atmosphere: airborne dust, low sun shafts and circling birds.
 *
 * All of it is subtle and all of it is cheap — one shader-animated point cloud
 * that follows the camera, a few additive quads, and one instanced flock. Motion
 * stops entirely under `prefers-reduced-motion`.
 */

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { LightRig } from '@/lib/twin/light'
import { sunPosition } from '@/lib/twin/light'
import { Rand } from '@/lib/twin/rng'
import { BIRD_WING, UNIT_PLANE } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { InstancedSet, type Inst } from '../detail/instanced'

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vFade;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.24 + aSeed * 6.28) * 1.8;
    p.y += sin(uTime * 0.17 + aSeed * 3.14) * 1.3;
    p.z += cos(uTime * 0.21 + aSeed * 4.71) * 1.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = max(-mv.z, 0.01);
    gl_PointSize = min(5.0, uSize * (160.0 / max(depth, 3.0)));
    float nearFade = smoothstep(2.5, 7.0, depth);
    vFade = clamp(1.0 - depth / 70.0, 0.0, 1.0) * nearFade;
  }
`

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * uOpacity * vFade;
    gl_FragColor = vec4(uColor, a);
  }
`

export function Dust({
  rig,
  reducedMotion,
  extent,
  quality = 1,
}: {
  rig: LightRig
  reducedMotion: boolean
  extent: number
  quality?: number
}) {
  const group = useRef<THREE.Group>(null)
  const span = Math.min(64, Math.max(28, extent * 0.5))

  const { geometry, material } = useMemo(() => {
    const rand = new Rand('bharatverse:dust')
    const count = Math.round(620 * Math.max(0.55, quality))
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand.range(-span, span)
      pos[i * 3 + 1] = rand.range(0.4, 16)
      pos[i * 3 + 2] = rand.range(-span, span)
      seeds[i] = rand.unit()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 2.6 },
        uColor: { value: new THREE.Color(rig.sunColor) },
        uOpacity: { value: 0.34 * rig.haze },
      },
    })
    return { geometry: geo, material: mat }
  }, [span, rig.sunColor, rig.haze, quality])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ clock, camera }) => {
    if (!reducedMotion) material.uniforms.uTime.value = clock.getElapsedTime()
    if (group.current) {
      group.current.position.set(
        Math.round(camera.position.x / span) * span,
        0,
        Math.round(camera.position.z / span) * span,
      )
    }
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

/** Warm additive planes lying along the low sun — restrained on purpose. */
export function SunShafts({
  rig,
  origin,
  height,
  radius,
}: {
  rig: LightRig
  origin: [number, number, number]
  height: number
  radius: number
}) {
  const dir = useMemo(() => {
    const p = sunPosition(rig, 1)
    return new THREE.Vector3(p[0], p[1], p[2]).normalize()
  }, [rig])

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(rig.sunColor),
        transparent: true,
        opacity: 0.055 * rig.haze,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [rig],
  )

  useEffect(() => () => material.dispose(), [material])

  if (dir.y > 0.55 || rig.haze < 0.5) return null
  const yaw = Math.atan2(dir.x, dir.z)

  return (
    <group position={origin} rotation={[0, yaw, 0]}>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          material={material}
          position={[i * radius * 0.22, height * 0.5, 0]}
          rotation={[0, 0, 0.24 * i]}
          scale={[radius * 0.16, height * 1.3, 1]}
          geometry={UNIT_PLANE}
        />
      ))}
    </group>
  )
}

export function Birds({
  count = 9,
  radius,
  height,
  reducedMotion,
}: {
  count?: number
  radius: number
  height: number
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#1c1b1d'), side: THREE.DoubleSide, fog: true }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  const items = useMemo<Inst[]>(() => {
    const rand = new Rand('bharatverse:birds')
    return Array.from({ length: count }).map(() => {
      const a = rand.range(0, Math.PI * 2)
      const r = rand.range(radius * 0.35, radius * 0.8)
      return {
        p: [Math.cos(a) * r, height + rand.range(-8, 14), Math.sin(a) * r] as [number, number, number],
        s: [rand.range(1.1, 2), 0.3, 0.7] as [number, number, number],
        r: [0, a + Math.PI / 2, 0] as [number, number, number],
      }
    })
  }, [count, radius, height])

  useFrame((_, delta) => {
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.026
  })

  return (
    <group ref={group}>
      <InstancedSet geometry={BIRD_WING} material={material} items={items} castShadow={false} receiveShadow={false} />
    </group>
  )
}

const LIFE_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  varying float vPulse;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.42 + aSeed * 19.0) * 0.8;
    p.y += sin(uTime * 0.75 + aSeed * 13.0) * 0.45;
    p.z += cos(uTime * 0.37 + aSeed * 17.0) * 0.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vPulse = 0.58 + 0.18 * sin(uTime * 1.15 + aSeed * 31.0);
    float depth = max(-mv.z, 0.01);
    gl_PointSize = min(5.5, (2.8 + vPulse * 1.4) * (95.0 / max(depth, 3.0)));
    vPulse *= smoothstep(2.0, 5.0, depth);
  }
`

const LIFE_FRAG = /* glsl */ `
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.02, d);
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.28), glow * vPulse * 0.58);
  }
`

/** Dusk/night fireflies concentrated near contextual planting and water. */
export function Fireflies({
  world,
  rig,
  reducedMotion,
  quality = 1,
}: {
  world: WorldModel
  rig: LightRig
  reducedMotion: boolean
  quality?: number
}) {
  const { geometry, material } = useMemo(() => {
    const rand = new Rand(`${world.seed}:fireflies`)
    const count = Math.round(180 * Math.max(0.5, quality) * world.env.lushness)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = rand.range(0, Math.PI * 2)
      const r = rand.range(world.extent * 0.45, Math.min(world.ground * 0.72, world.extent + 58))
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      positions[i * 3] = x
      positions[i * 3 + 1] = world.collision.terrain(x, z) + rand.range(0.7, 4.8)
      positions[i * 3 + 2] = z
      seeds[i] = rand.unit()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: LIFE_VERT,
      fragmentShader: LIFE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
    })
    return { geometry: geo, material: mat }
  }, [world, quality])

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

  if (rig.lamp < 0.45 || world.env.lushness < 0.42) return null
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

const MIST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float radial = smoothstep(0.5, 0.08, length(p));
    float bands = 0.72 + 0.28 * sin(vUv.x * 18.0 + vUv.y * 11.0);
    gl_FragColor = vec4(uColor, radial * bands * uOpacity);
  }
`

const MIST_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Thin low mist catches dawn and dusk light without obscuring the architecture. */
export function GroundMist({ world, rig, reducedMotion }: { world: WorldModel; rig: LightRig; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uColor: { value: new THREE.Color(rig.skyHorizon) },
      uOpacity: { value: 0.06 + rig.haze * 0.05 },
    },
  }), [rig.skyHorizon, rig.haze])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    const t = clock.getElapsedTime()
    group.current.rotation.y = Math.sin(t * 0.035) * 0.18
    group.current.position.x = Math.sin(t * 0.055) * 2.5
  })

  if (rig.haze < 0.5) return null
  const coreY = world.core?.floorY ?? 0
  return (
    <group ref={group} position={[0, coreY + 0.3, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={UNIT_PLANE}
          material={material}
          rotation={[-Math.PI / 2, 0, i * 0.7]}
          position={[(i - 1) * world.extent * 0.38, i * 0.12, (1 - i) * world.extent * 0.26]}
          scale={[world.extent * 1.25, world.extent * 0.72, 1]}
        />
      ))}
    </group>
  )
}
