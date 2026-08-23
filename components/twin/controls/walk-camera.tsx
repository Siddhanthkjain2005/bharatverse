'use client'

/**
 * The walking camera.
 *
 * Acceleration and a short stop ramp, a walk-cycle head bob that scales with
 * speed, restrained breathing while standing, a lean into strafing, and a small
 * FOV push when sprinting. Movement is resolved against the collision world with
 * move-and-slide plus step-up, so corners do not catch and stairs simply work.
 *
 * Every effect is proportional to `motion`, which the scene sets to 0 when the
 * visitor prefers reduced motion.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { WALKER } from '@/lib/twin/collision'
import type { WorldModel } from '@/lib/twin/model'
import type { WalkInputState } from './use-walk-input'

export const EYE_HEIGHT = 1.68
const { radius: PLAYER_R, height: BODY_H, stepUp: STEP_UP } = WALKER
const WALK_SPEED = 4.4
const SPRINT_SPEED = 8.6
const GRAVITY = 22
const JUMP_V = 6.4
const ACCEL = 12
const AIR_ACCEL = 3

export interface WalkReport {
  x: number
  z: number
  yaw: number
  feetY: number
  speed: number
}

export function WalkCamera({
  input,
  active,
  world,
  spawn,
  spawnToken,
  baseFov,
  motion = 1,
  allowJump = true,
  onMove,
}: {
  input: React.RefObject<WalkInputState>
  active: boolean
  world: WorldModel
  spawn: { x: number; z: number; yaw: number }
  spawnToken: string
  baseFov: number
  motion?: number
  allowJump?: boolean
  onMove?: (report: WalkReport) => void
}) {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector2(spawn.x, spawn.z))
  const vel = useRef(new THREE.Vector2())
  const feetY = useRef(0)
  const vy = useRef(0)
  const grounded = useRef(true)
  const cycle = useRef(0)
  const breathe = useRef(0)
  const lean = useRef(0)
  const smoothYaw = useRef(spawn.yaw)
  const smoothPitch = useRef(-0.05)
  const report = useRef(0)

  useEffect(() => {
    if (!active) return
    pos.current.set(spawn.x, spawn.z)
    vel.current.set(0, 0)
    vy.current = 0
    feetY.current = world.collision.groundAt(spawn.x, spawn.z, Infinity, 40)
    grounded.current = true
    smoothYaw.current = spawn.yaw
    smoothPitch.current = -0.05
    camera.rotation.order = 'YXZ'
    camera.position.set(spawn.x, feetY.current + EYE_HEIGHT, spawn.z)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, spawnToken])

  useFrame((_, rawDelta) => {
    if (!active || !input.current) return
    const delta = Math.min(rawDelta, 0.05)
    const i = input.current
    const cam = camera as THREE.PerspectiveCamera

    /* ---- look, with a touch of inertia ---- */
    const kLook = 1 - Math.pow(0.0000012, delta)
    smoothYaw.current += (i.yaw - smoothYaw.current) * (motion > 0 ? kLook : 1)
    smoothPitch.current += (i.pitch - smoothPitch.current) * (motion > 0 ? kLook : 1)

    /* ---- wish direction in world space ---- */
    const speedTarget = i.sprint ? SPRINT_SPEED : WALK_SPEED
    const wish = new THREE.Vector2(i.fwd, i.strafe)
    if (wish.lengthSq() > 1) wish.normalize()
    const sin = Math.sin(smoothYaw.current)
    const cos = Math.cos(smoothYaw.current)
    const target = new THREE.Vector2(
      (wish.x * -sin + wish.y * cos) * speedTarget,
      (wish.x * -cos + wish.y * -sin) * speedTarget,
    )

    const accel = grounded.current ? ACCEL : AIR_ACCEL
    vel.current.lerp(target, 1 - Math.exp(-accel * delta))

    /* ---- horizontal move with collision ---- */
    const step = vel.current.clone().multiplyScalar(delta)
    const solved = world.collision.solve(
      pos.current.x,
      pos.current.y,
      step.x,
      step.y,
      PLAYER_R,
      feetY.current,
      BODY_H,
      grounded.current ? STEP_UP : 0.1,
    )
    if (solved.hit) {
      // Bleed speed into the wall rather than pressing through it.
      vel.current.multiplyScalar(0.72)
    }
    pos.current.set(solved.x, solved.z)

    const unstuck = world.collision.depenetrate(
      pos.current.x,
      pos.current.y,
      PLAYER_R,
      feetY.current,
      BODY_H,
      STEP_UP,
    )
    pos.current.set(unstuck.x, unstuck.z)

    /* ---- keep the visitor on the documented ground ---- */
    const leash = world.ground * 0.97
    const away = Math.hypot(pos.current.x, pos.current.y)
    if (away > leash) {
      pos.current.multiplyScalar(leash / away)
    }

    /* ---- vertical ---- */
    const ground = world.collision.groundAt(pos.current.x, pos.current.y, feetY.current, STEP_UP)
    if (grounded.current && allowJump && i.jump) {
      vy.current = JUMP_V
      grounded.current = false
    }
    if (!grounded.current) {
      vy.current -= GRAVITY * delta
      feetY.current += vy.current * delta
      if (feetY.current <= ground) {
        feetY.current = ground
        vy.current = 0
        grounded.current = true
      }
    } else if (feetY.current > ground + 0.05) {
      // Walked off an edge.
      grounded.current = false
      vy.current = 0
    } else {
      // Ease onto the new surface so steps do not snap the view.
      feetY.current += (ground - feetY.current) * (1 - Math.exp(-16 * delta))
    }

    /* ---- camera feel ---- */
    const speed = vel.current.length()
    const moving = speed > 0.4 && grounded.current
    cycle.current += moving ? delta * (5.4 + speed * 0.42) : 0
    breathe.current += delta

    const bobAmp = motion * Math.min(0.062, 0.012 + speed * 0.0068)
    const bob = moving ? Math.sin(cycle.current * 2) * bobAmp : 0
    const sway = moving ? Math.sin(cycle.current) * bobAmp * 0.55 : 0
    const idle = motion * (grounded.current && !moving ? Math.sin(breathe.current * 1.25) * 0.011 : 0)

    const leanTarget = motion * -i.strafe * 0.026 * (speed / Math.max(1, speedTarget))
    lean.current += (leanTarget - lean.current) * (1 - Math.exp(-6 * delta))

    cam.rotation.set(smoothPitch.current, smoothYaw.current, lean.current)
    cam.position.set(
      pos.current.x + Math.cos(smoothYaw.current) * sway,
      feetY.current + EYE_HEIGHT + bob + idle,
      pos.current.y - Math.sin(smoothYaw.current) * sway,
    )

    const fovTarget = baseFov + (i.sprint && moving ? 5.5 * motion : 0)
    if (Math.abs(cam.fov - fovTarget) > 0.05) {
      cam.fov += (fovTarget - cam.fov) * (1 - Math.exp(-7 * delta))
      cam.updateProjectionMatrix()
    }

    report.current += delta
    if (report.current > 0.12) {
      report.current = 0
      onMove?.({
        x: pos.current.x,
        z: pos.current.y,
        yaw: smoothYaw.current,
        feetY: feetY.current,
        speed,
      })
    }
  })

  return null
}
