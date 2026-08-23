'use client'

/**
 * Touch controls: a thumb stick for movement and a small action cluster.
 * Desktop keeps the premium path (pointer lock + WASD); this keeps a phone usable
 * without compromising it.
 */

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { WalkInputState } from './use-walk-input'

export function MoveStick({
  input,
  className,
}: {
  input: React.RefObject<WalkInputState>
  className?: string
}) {
  const pad = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null)

  const set = (e: React.PointerEvent) => {
    const el = pad.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const max = r.width / 2
    let dx = (e.clientX - (r.left + r.width / 2)) / max
    let dy = (e.clientY - (r.top + r.height / 2)) / max
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    setKnob({ x: dx, y: dy })
    if (input.current) {
      input.current.strafe = dx
      input.current.fwd = -dy
      input.current.sprint = len > 0.86
    }
  }

  const release = () => {
    setKnob(null)
    if (input.current) {
      input.current.strafe = 0
      input.current.fwd = 0
      input.current.sprint = false
    }
  }

  return (
    <div
      ref={pad}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      role="application"
      aria-label="Movement stick — drag to walk"
      className={cn(
        'relative size-32 touch-none rounded-full border border-accent/40 bg-background/55 backdrop-blur-md',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-3 rounded-full border border-accent/15" />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-11 rounded-full border border-accent/70 bg-accent/25 shadow-[0_0_20px_-6px_var(--accent)]"
        style={{
          transform: `translate(calc(-50% + ${(knob?.x ?? 0) * 38}px), calc(-50% + ${(knob?.y ?? 0) * 38}px))`,
        }}
      />
    </div>
  )
}

export function TouchActions({
  input,
  onInteract,
  interactLabel,
  className,
}: {
  input: React.RefObject<WalkInputState>
  onInteract: () => void
  interactLabel: string | null
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-end gap-2.5', className)}>
      {interactLabel && (
        <button
          type="button"
          onClick={onInteract}
          className="rounded-full border border-accent bg-accent/90 px-5 py-3 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent-foreground shadow-[0_0_26px_-6px_var(--accent)]"
        >
          {interactLabel}
        </button>
      )}
      <div className="flex gap-2.5">
        <button
          type="button"
          aria-label="Jump"
          onPointerDown={() => {
            if (input.current) input.current.jump = true
          }}
          onPointerUp={() => {
            if (input.current) input.current.jump = false
          }}
          onPointerLeave={() => {
            if (input.current) input.current.jump = false
          }}
          className="size-14 rounded-full border border-border/70 bg-background/60 font-sans text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-md"
        >
          Jump
        </button>
      </div>
    </div>
  )
}
