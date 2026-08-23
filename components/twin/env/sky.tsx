'use client'

/**
 * Sky.
 *
 * A gradient dome with a horizon band, a sun (or moon) disc with atmospheric
 * glow, and a star field that fades in at night. It costs one sphere and one
 * point cloud, and it is what stops the scene reading as a viewport with a
 * background colour.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { LightRig } from '@/lib/twin/light'
import { sunPosition } from '@/lib/twin/light'
import { Rand } from '@/lib/twin/rng'

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const FRAG = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSun;
  uniform vec3 uSunColor;
  uniform vec3 uFog;
  uniform float uHaze;
  uniform float uGlow;
  void main() {
    vec3 dir = normalize(vWorld);
    float h = dir.y;
    vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.62));
    col = mix(col, uGround, pow(clamp(-h * 2.2, 0.0, 1.0), 0.7));
    // Aerial perspective. Everything seen along the horizon is seen through the
    // same haze as the far ground, so it takes the fog colour — which is also
    // what closes the seam where the fogged land meets the dome behind it.
    col = mix(col, uFog, exp(-abs(h) * 11.0) * uHaze);
    float d = max(dot(dir, normalize(uSun)), 0.0);
    col += uSunColor * pow(d, 22.0) * 1.35 * uGlow;
    col += uSunColor * pow(d, 4.0) * 0.16 * uGlow;
    // band of warmth pressed onto the horizon
    col += uSunColor * pow(d, 2.2) * exp(-abs(h) * 8.0) * 0.28 * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function Sky({ rig, radius }: { rig: LightRig; radius: number }) {
  const material = useMemo(() => {
    const sun = sunPosition(rig, 1)
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(rig.skyTop) },
        uHorizon: { value: new THREE.Color(rig.skyHorizon) },
        uGround: { value: new THREE.Color(rig.skyGround) },
        uSun: { value: new THREE.Vector3(...sun) },
        uSunColor: { value: new THREE.Color(rig.sunColor) },
        uFog: { value: new THREE.Color(rig.fog) },
        uHaze: { value: Math.min(0.6, rig.haze * 0.7) },
        uGlow: { value: rig.sunDisc },
      },
    })
  }, [rig])

  const geometry = useMemo(() => new THREE.SphereGeometry(radius * 2.4, 32, 20), [radius])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <group>
      <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />
      <SunDisc rig={rig} radius={radius} />
      {rig.stars > 0.02 && <Stars radius={radius} intensity={rig.stars} />}
    </group>
  )
}

function SunDisc({ rig, radius }: { rig: LightRig; radius: number }) {
  const pos = useMemo(() => sunPosition(rig, radius * 1.5), [rig, radius])
  const material = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.24, 'rgba(255,246,224,0.9)')
    grad.addColorStop(0.55, 'rgba(255,220,160,0.22)')
    grad.addColorStop(1, 'rgba(255,200,120,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color(rig.sunColor),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    })
  }, [rig.sunColor])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.dispose()
    },
    [material],
  )

  const size = radius * 0.34 * rig.sunDisc
  return <sprite position={pos} material={material} scale={[size, size, 1]} renderOrder={-1} />
}

function Stars({ radius, intensity }: { radius: number; intensity: number }) {
  const { geometry, material } = useMemo(() => {
    const rand = new Rand('bharatverse:stars')
    const count = 900
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const u = rand.range(-1, 1)
      const a = rand.range(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - u * u))
      const y = Math.abs(u) * 0.92 + 0.06
      pos[i * 3] = Math.cos(a) * r * radius * 2.1
      pos[i * 3 + 1] = y * radius * 2.1
      pos[i * 3 + 2] = Math.sin(a) * r * radius * 2.1
      sizes[i] = rand.range(0.4, 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color('#e8ecff'),
      size: radius * 0.006,
      sizeAttenuation: true,
      transparent: true,
      opacity: intensity,
      depthWrite: false,
      fog: false,
    })
    return { geometry: geo, material: mat }
  }, [radius, intensity])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
}
