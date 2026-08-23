'use client'

/**
 * Controls card.
 *
 * Appears the first time a visitor enters walk mode and then stays out of the
 * way, reachable from the Controls button. Keyboard-first, because that is how
 * the premium path is driven.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const KEYS: [string, string][] = [
  ['W A S D', 'Walk'],
  ['Mouse', 'Look'],
  ['Shift', 'Sprint'],
  ['E', 'Enter · inspect'],
  ['Space', 'Step up'],
  ['Esc', 'Release the mouse'],
]

const STORE_KEY = 'bharatverse:controls-seen'

export function useControlsCard(active: boolean) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!active) return
    let seen = false
    try {
      seen = window.localStorage.getItem(STORE_KEY) === '1'
    } catch {
      seen = false
    }
    if (!seen) setOpen(true)
  }, [active])
  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(STORE_KEY, '1')
    } catch {
      /* storage unavailable — the card simply reappears next session */
    }
  }
  return { open, setOpen, dismiss }
}

export function ControlsCard({
  open,
  onDismiss,
  touch,
  className,
}: {
  open: boolean
  onDismiss: () => void
  touch: boolean
  className?: string
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-label="Walk controls"
      className={cn(
        'w-[min(23rem,86vw)] border border-accent/35 bg-background/92 p-5 backdrop-blur-md [animation:bv-reveal_0.4s_ease-out]',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-accent">
          Explore the twin
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="font-sans text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Got it
        </button>
      </div>
      <p className="mt-2 font-serif text-lg font-light leading-tight text-foreground">
        {touch ? 'Drag to look, use the stick to walk.' : 'Click once to take the mouse, then walk.'}
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {(touch
          ? ([
              ['Stick', 'Walk'],
              ['Drag', 'Look'],
              ['Enter', 'Cross a threshold'],
              ['Inspect', 'Read a feature'],
            ] as [string, string][])
          : KEYS
        ).map(([key, label]) => (
          <div key={key} className="col-span-2 grid grid-cols-[6.5rem_1fr] items-center gap-4">
            <dt className="border border-border/70 bg-card/60 px-2 py-1 text-center font-mono text-[0.625rem] uppercase tracking-[0.1em] text-foreground">
              {key}
            </dt>
            <dd className="font-sans text-xs text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/80">
        Walk up to a doorway and the threshold will offer itself. Everything you can
        see, you can reach.
      </p>
    </div>
  )
}
