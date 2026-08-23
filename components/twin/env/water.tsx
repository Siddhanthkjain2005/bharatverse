'use client'

/**
 * Water.
 *
 * Channels, tanks, a river or the sea, depending on what the site actually has.
 * The surface is displaced and its normals rotated analytically in the vertex
 * shader, so the specular highlight travels across it without a texture, a
 * reflection pass or a dependency.
 */

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WorldModel } from '@/lib/twin/model'
import type { TwinMaterials } from '../use-twin-materials'

const WAVE = /* glsl */ `
  float wH(vec2 p, float t) {
    return sin(p.x * 0.55 + t * 1.05) * 0.055
         + sin(p.y * 0.71 - t * 0.9) * 0.045
         + sin((p.x + p.y) * 0.33 + t * 1.6) * 0.028;
  }
`

function useWaterMaterial(base: THREE.MeshStandardMaterial) {
  const ref = useRef<{ uniforms?: { uTime: { value: number } } } | null>(null)
  const material = useMemo(() => {
    const mat = base.clone()
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec2 vWaterCoord;\n${WAVE}`)
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           float dx = 0.55 * cos(position.x * 0.55 + uTime * 1.05) * 0.055
                    + 0.33 * cos((position.x + position.z) * 0.33 + uTime * 1.6) * 0.028;
           float dz = 0.71 * cos(position.z * 0.71 - uTime * 0.9) * 0.045
                    + 0.33 * cos((position.x + position.z) * 0.33 + uTime * 1.6) * 0.028;
           objectNormal = normalize(vec3(-dx, 1.0, -dz));`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           transformed.y += wH(vec2(position.x, position.z), uTime);`,
        )
        .replace('#include <project_vertex>', `vWaterCoord = position.xz;\n#include <project_vertex>`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vWaterCoord;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float rippleA = sin(vWaterCoord.x * 1.7 + uTime * 1.15) * sin(vWaterCoord.y * 1.35 - uTime * 0.82);
           float rippleB = sin((vWaterCoord.x + vWaterCoord.y) * 2.4 + uTime * 1.6);
           float glint = pow(max(0.0, rippleA * 0.55 + rippleB * 0.45), 5.0);
           diffuseColor.rgb += vec3(0.12, 0.2, 0.22) * glint;`,
        )
      ref.current = shader as unknown as { uniforms: { uTime: { value: number } } }
    }
    mat.needsUpdate = true
    return mat
  }, [base])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    const u = ref.current?.uniforms
    if (u) u.uTime.value = clock.getElapsedTime()
  })

  return material
}

export function WaterFeatures({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const { m, pick } = mats
  const base = pick(m.water, 'CONTEXTUAL') as THREE.MeshStandardMaterial
  const material = useWaterMaterial(base)

  const geometries = useMemo(
    () =>
      world.water.map((w) => {
        const seg = w.kind === 'RIVER' ? 48 : 24
        const geo = new THREE.PlaneGeometry(w.w, w.d, seg, seg)
        geo.rotateX(-Math.PI / 2)
        return geo
      }),
    [world.water],
  )

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

  return (
    <group>
      {world.water.map((w, i) => (
        <mesh key={`wf${i}`} position={[w.x, w.y, w.z]} geometry={geometries[i]} material={material} receiveShadow />
      ))}
      {/* channel kerbs so the water reads as built, not spilled */}
      {world.water
        .filter((w) => w.kind === 'CHANNEL' || w.kind === 'TANK')
        .map((w, i) => (
          <mesh key={`wk${i}`} position={[w.x, w.y - 0.22, w.z]} receiveShadow>
            <boxGeometry args={[w.w + 1.1, 0.44, w.d + 1.1]} />
            <primitive object={pick(m.floor, 'CONTEXTUAL')} attach="material" />
          </mesh>
        ))}
    </group>
  )
}
