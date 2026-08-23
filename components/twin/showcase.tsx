'use client'

/**
 * Showcase canvas.
 *
 * The same world model the twin viewer walks, rendered as a slowly orbiting
 * establishing shot. Used on the landing page so the first thing a visitor sees
 * is the actual product, not a stylised placeholder.
 */

import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import type { HeritageSite } from '@/lib/heritage/types'
import { shotsFor } from '@/lib/twin/cinematic'
import { LIGHT_RIG, type TimeOfDay } from '@/lib/twin/light'
import type { BuildStateKey } from '@/lib/twin/materials'
import { ARCH_SPEC } from '@/lib/twin/specs'
import { getWorld } from '@/lib/twin/world'
import { Sky } from './env/sky'
import { HeritageWorld } from './heritage-world'
import { SceneLighting } from './lighting'
import { useLowPower, useReducedMotion } from './use-reduced-motion'
import { useTwinMaterials } from './use-twin-materials'

function OrbitRig({
  radius,
  height,
  target,
  speed,
}: {
  radius: number
  height: number
  target: [number, number, number]
  speed: number
}) {
  const look = useMemo(() => new THREE.Vector3(...target), [target])
  useFrame(({ camera, clock }) => {
    const a = clock.getElapsedTime() * speed + 0.7
    camera.position.set(
      look.x + Math.sin(a) * radius,
      height,
      look.z + Math.cos(a) * radius,
    )
    camera.lookAt(look)
  })
  return null
}

export function TwinShowcase({
  site,
  timeOfDay = 'DUSK',
  className,
}: {
  site: HeritageSite
  timeOfDay?: TimeOfDay
  className?: string
}) {
  const world = useMemo(() => getWorld(site), [site])
  const spec = ARCH_SPEC[site.twin.archetype]
  const rig = LIGHT_RIG[timeOfDay]
  const mats = useTwinMaterials(site, 'COMPLETE', false)
  const reduced = useReducedMotion()
  const lowPower = useLowPower()
  const hero = useMemo(() => shotsFor(world)[0], [world])

  const radius = Math.hypot(hero.position[0] - hero.target[0], hero.position[2] - hero.target[2])

  return (
    <div className={className}>
      <Canvas
        shadows={lowPower ? false : 'percentage'}
        dpr={[1, lowPower ? 1.2 : 1.7]}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        camera={{ position: hero.position, fov: 40, near: 0.5, far: world.ground * 6 }}
      >
        <color attach="background" args={[rig.fog]} />
        <fogExp2 attach="fog" args={[rig.fog, rig.fogDensity * 0.9]} />
        <Sky rig={rig} radius={world.ground} />
        <SceneLighting rig={rig} world={world} quality={lowPower ? 0.5 : 1} />
        <Suspense fallback={null}>
          <HeritageWorld
            world={world}
            spec={spec}
            mats={mats}
            rig={rig}
            progress={1}
            state="COMPLETE"
            reducedMotion={reduced}
            quality={lowPower ? 0.4 : 0.75}
            showAtmosphere={!lowPower}
          />
        </Suspense>
        <OrbitRig
          radius={radius}
          height={hero.position[1]}
          target={hero.target}
          speed={reduced ? 0 : 0.028}
        />
      </Canvas>
    </div>
  )
}

/**
 * A still of the same world at a given phase and light. Two of these, overlaid
 * with a wipe, are what the Then / Now comparison is built from — so the
 * comparison is of real geometry, not two captions.
 */
export function TwinStill({
  site,
  timeOfDay = 'NOON',
  progress,
  state,
  shotId = 'hero',
  className,
}: {
  site: HeritageSite
  timeOfDay?: TimeOfDay
  progress: number
  state: BuildStateKey
  shotId?: string
  className?: string
}) {
  const world = useMemo(() => getWorld(site), [site])
  const spec = ARCH_SPEC[site.twin.archetype]
  const rig = LIGHT_RIG[timeOfDay]
  const mats = useTwinMaterials(site, state, false)
  const reduced = useReducedMotion()
  const lowPower = useLowPower()
  const shots = useMemo(() => shotsFor(world), [world])
  const shot = shots.find((s) => s.id === shotId) ?? shots[0]

  return (
    <div className={className}>
      <Canvas
        shadows={lowPower ? false : 'percentage'}
        dpr={[1, lowPower ? 1.1 : 1.5]}
        gl={{ antialias: !lowPower, powerPreference: 'default' }}
        camera={{ position: shot.position, fov: shot.fov, near: 0.5, far: world.ground * 6 }}
        onCreated={({ camera }) => camera.lookAt(...shot.target)}
      >
        <color attach="background" args={[rig.fog]} />
        <fogExp2 attach="fog" args={[rig.fog, rig.fogDensity]} />
        <Sky rig={rig} radius={world.ground} />
        <SceneLighting rig={rig} world={world} quality={0.5} />
        <Suspense fallback={null}>
          <HeritageWorld
            world={world}
            spec={spec}
            mats={mats}
            rig={rig}
            progress={progress}
            state={state}
            reducedMotion={reduced}
            quality={0.35}
            showAtmosphere={false}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
