'use client'

/**
 * First-person input.
 *
 * Keyboard and pointer-lock look on desktop, drag-look and a thumb stick on
 * touch. Interaction is a counter rather than a callback so the render loop can
 * notice a press without re-subscribing every frame.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface WalkInputState {
  fwd: number
  strafe: number
  sprint: boolean
  jump: boolean
  yaw: number
  pitch: number
  /** Increments on every interact press (E, tap, or the on-screen button). */
  interact: number
}

const LOOK_SENS = 0.0023
const TOUCH_SENS = 0.0038
const PITCH_LIMIT = 1.2

const MOVE_KEYS = [
  'w', 'a', 's', 'd',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'shift', ' ',
]

export function useWalkInput(
  active: boolean,
  container: React.RefObject<HTMLElement | null>,
  initialYaw = 0,
) {
  const input = useRef<WalkInputState>({
    fwd: 0,
    strafe: 0,
    sprint: false,
    jump: false,
    yaw: initialYaw,
    pitch: -0.05,
    interact: 0,
  })
  const [locked, setLocked] = useState(false)
  const [touched, setTouched] = useState(false)
  const [moved, setMoved] = useState(false)

  const requestLock = useCallback(() => {
    const el = container.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      void el.requestPointerLock?.()
    }
  }, [container])

  const releaseLock = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  const interact = useCallback(() => {
    input.current.interact += 1
  }, [])

  /** Called when the scene teleports the walker, so look direction follows. */
  const setYaw = useCallback((yaw: number) => {
    input.current.yaw = yaw
    input.current.pitch = -0.05
  }, [])

  useEffect(() => {
    if (!active) {
      input.current.fwd = 0
      input.current.strafe = 0
      input.current.sprint = false
      input.current.jump = false
      if (document.pointerLockElement) document.exitPointerLock()
      return
    }

    const keys = new Set<string>()
    const apply = () => {
      const i = input.current
      i.fwd =
        (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
      i.strafe =
        (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
      i.sprint = keys.has('shift')
      i.jump = keys.has(' ')
      if (i.fwd !== 0 || i.strafe !== 0) setMoved(true)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'e' && !e.repeat) {
        input.current.interact += 1
        e.preventDefault()
        return
      }
      if (!MOVE_KEYS.includes(k)) return
      if (k.startsWith('arrow') || k === ' ') e.preventDefault()
      keys.add(k)
      apply()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase())
      apply()
    }
    const onBlur = () => {
      keys.clear()
      apply()
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      keys.clear()
    }
  }, [active])

  useEffect(() => {
    const el = container.current
    if (!active || !el) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const look = (dx: number, dy: number, sens: number) => {
      const i = input.current
      i.yaw -= dx * sens
      i.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, i.pitch - dy * sens))
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setTouched(true)
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === el) {
        look(e.movementX, e.movementY, LOOK_SENS)
        return
      }
      if (!dragging) return
      look(e.clientX - lastX, e.clientY - lastY, e.pointerType === 'touch' ? TOUCH_SENS : LOOK_SENS)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      el.releasePointerCapture?.(e.pointerId)
    }
    const onLockChange = () => setLocked(document.pointerLockElement === el)

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('pointerlockchange', onLockChange)
      setLocked(false)
    }
  }, [active, container])

  return { input, locked, touched, moved, requestLock, releaseLock, interact, setYaw }
}
