'use client'

/**
 * Orbit-mode camera rigs: flights to a preset, slow showcase drift, and the
 * cinematic tour that walks a shot list with holds. All of them drive the same
 * OrbitControls instance so the visitor can grab the camera at any moment.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Shot } from '@/lib/twin/cinematic'

type Controls = React.RefObject<{
  target: THREE.Vector3
  update: () => void
  getAzimuthalAngle: () => number
  setAzimuthalAngle: (a: number) => void
} | null>

/** Critically-damped flight to a camera pose. */
export function CameraFlight({
  position,
  target,
  fov,
  controls,
  enabled,
  rate = 0.0016,
}: {
  position: THREE.Vector3
  target: THREE.Vector3
  fov?: number
  controls: Controls
  enabled: boolean
  rate?: number
}) {
  const { camera } = useThree()
  useFrame((_, delta) => {
    if (!enabled) return
    const k = 1 - Math.pow(rate, delta)
    camera.position.lerp(position, k)
    const c = controls.current
    if (c) {
      c.target.lerp(target, k)
      c.update()
    }
    if (fov) {
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - fov) > 0.05) {
        cam.fov += (fov - cam.fov) * k
        cam.updateProjectionMatrix()
      }
    }
  })
  return null
}

export function SlowOrbit({
  enabled,
  controls,
  speed = 0.045,
}: {
  enabled: boolean
  controls: Controls
  speed?: number
}) {
  useFrame((_, delta) => {
    const c = controls.current
    if (!enabled || !c) return
    c.setAzimuthalAngle(c.getAzimuthalAngle() + delta * speed)
    c.update()
  })
  return null
}

export function CameraReset({
  position,
  target,
  fov,
  controls,
  token,
}: {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  controls: Controls
  token: string
}) {
  const { camera } = useThree()
  useEffect(() => {
    camera.rotation.set(0, 0, 0)
    camera.position.set(...position)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = fov
    cam.updateProjectionMatrix()
    const c = controls.current
    if (c) {
      c.target.set(...target)
      c.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
  return null
}

/**
 * Cinematic tour. Each shot is flown into, held for its own duration with a slow
 * drift, then handed on. The presenter can stop on any frame.
 */
export function CinematicPlayer({
  shots,
  index,
  playing,
  controls,
  onAdvance,
}: {
  shots: Shot[]
  index: number
  playing: boolean
  controls: Controls
  onAdvance: () => void
}) {
  const { camera } = useThree()
  const held = useRef(0)
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())
  const shot = shots[index]

  useEffect(() => {
    held.current = 0
  }, [index])

  useFrame((_, delta) => {
    if (!playing || !shot) return
    pos.current.set(...shot.position)
    tgt.current.set(...shot.target)
    const k = 1 - Math.pow(0.06, delta)
    camera.position.lerp(pos.current, k)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov += (shot.fov - cam.fov) * k
    cam.updateProjectionMatrix()
    const c = controls.current
    if (c) {
      c.target.lerp(tgt.current, k)
      if (shot.orbit) c.setAzimuthalAngle(c.getAzimuthalAngle() + delta * shot.orbit)
      c.update()
    }
    held.current += delta
    if (held.current > shot.hold) {
      held.current = 0
      onAdvance()
    }
  })
  return null
}

/** Frames a highlight volume for the architecture inspector. */
export function useFrameBox() {
  const v = useRef(new THREE.Vector3())
  return v
}
