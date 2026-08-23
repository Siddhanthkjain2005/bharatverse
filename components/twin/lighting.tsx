'use client'

/**
 * The lighting rig.
 *
 * One shadow-casting sun, a sky/ground hemisphere term, a warm bounce
 * approximating light returned from sunlit stone, and a small pool of point
 * lights that follows the visitor so interiors and lamps are lit without ever
 * exceeding a fixed light budget.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { LightRig } from '@/lib/twin/light'
import { sunPosition } from '@/lib/twin/light'
import type { WorldModel } from '@/lib/twin/model'

const POOL = 6

interface Anchor {
  x: number
  y: number
  z: number
  color: THREE.Color
  intensity: number
  distance: number
}

export const SceneLighting = memo(function SceneLighting({
  rig,
  world,
  quality = 1,
}: {
  rig: LightRig
  world: WorldModel
  quality?: number
}) {
  const sun = useMemo(() => sunPosition(rig, world.ground), [rig, world.ground])
  const shadowSpan = Math.max(60, world.extent * 1.25)
  const mapSize = quality >= 1.25 ? 4096 : quality >= 1 ? 2048 : 1024

  const anchors = useMemo<Anchor[]>(() => {
    const list: Anchor[] = []
    const warm = new THREE.Color(rig.lamp > 0.5 ? '#ffb066' : '#fff0d6')
    const cool = new THREE.Color(rig.ambientSky)
    for (const s of world.spaces) {
      if (s.roofed) {
        const span = Math.max(s.rect.w, s.rect.d)
        list.push({
          x: s.rect.cx,
          y: s.floorY + Math.min(s.wallH * 0.68, 6),
          z: s.rect.cz,
          color: warm,
          intensity: span * 3.4 * (0.72 + rig.lamp * 0.4),
          distance: span * 1.9 + 14,
        })
        if (s.space.kind === 'SANCTUM' || s.space.kind === 'CHAMBER') {
          list.push({
            x: s.rect.cx,
            y: s.floorY + 2.6,
            z: s.rect.cz,
            color: new THREE.Color(world.site.palette.accent),
            intensity: 36,
            distance: span + 16,
          })
        }
      } else {
        // Daylight dropping into an open court.
        list.push({
          x: s.rect.cx,
          y: s.floorY + 9,
          z: s.rect.cz,
          color: cool,
          intensity: Math.max(s.rect.w, s.rect.d) * 1.1,
          distance: Math.max(s.rect.w, s.rect.d) + 22,
        })
      }
    }
    if (rig.lamp > 0.35) {
      for (const l of world.props.lamps) {
        list.push({
          x: l.x,
          y: world.collision.groundAt(l.x, l.z, 40) + 2.9,
          z: l.z,
          color: new THREE.Color('#ffb066'),
          intensity: 26 * rig.lamp,
          distance: 26,
        })
      }
    }
    return list
  }, [world, rig])

  const refs = useRef<(THREE.PointLight | null)[]>([])
  const targets = useRef<(Anchor | null)[]>(Array.from({ length: POOL }, () => null))
  const timer = useRef(0)
  const { camera } = useThree()

  useFrame((_, delta) => {
    timer.current += delta
    if (timer.current >= 0.12) {
      timer.current = 0
      const scored = anchors
        .map((a) => ({ a, d: (a.x - camera.position.x) ** 2 + (a.z - camera.position.z) ** 2 }))
        .sort((p, q) => p.d - q.d)
        .slice(0, POOL)
      for (let i = 0; i < POOL; i++) targets.current[i] = scored[i]?.a ?? null
    }

    // Ease the fixed light pool toward new rooms. Immediate reassignments and
    // synchronised intensity pulses read as whole-scene flicker while walking.
    const response = 1 - Math.exp(-4.2 * delta)
    for (let i = 0; i < POOL; i++) {
      const light = refs.current[i]
      if (!light) continue
      const target = targets.current[i]
      if (!target) {
        light.intensity = THREE.MathUtils.lerp(light.intensity, 0, response)
        continue
      }
      light.position.x = THREE.MathUtils.lerp(light.position.x, target.x, response)
      light.position.y = THREE.MathUtils.lerp(light.position.y, target.y, response)
      light.position.z = THREE.MathUtils.lerp(light.position.z, target.z, response)
      light.color.lerp(target.color, response)
      light.distance = THREE.MathUtils.lerp(light.distance, target.distance, response)
      light.intensity = THREE.MathUtils.lerp(light.intensity, target.intensity, response)
    }
  })

  return (
    <>
      <hemisphereLight
        args={[rig.ambientSky, rig.ambientGround, rig.ambientIntensity]}
      />
      <directionalLight
        position={sun}
        intensity={rig.sunIntensity}
        color={rig.sunColor}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-camera-near={1}
        shadow-camera-far={world.ground * 3.4}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
      />
      {/* bounce: light returned from the sunlit ground, never shadow-casting */}
      <directionalLight
        position={[-sun[0] * 0.6, Math.abs(sun[1]) * 0.22, -sun[2] * 0.6]}
        intensity={rig.sunIntensity * rig.bounceIntensity}
        color={rig.bounce}
      />
      {Array.from({ length: POOL }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          intensity={0}
          decay={2}
          distance={20}
        />
      ))}
    </>
  )
})

SceneLighting.displayName = 'SceneLighting'
