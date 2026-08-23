'use client'

/**
 * Arrival.
 *
 * The first thing a visitor meets at a monument: a composed hero view of the
 * twin with one invitation laid over it, and the two keys they need in order to
 * accept it. It is deliberately not a tutorial — it names the place, offers the
 * walk, and leaves at the first sign the visitor would rather look for
 * themselves, whether that is the button, a key, or a drag on the view.
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Keys that mean "I would like to walk" — pressing one is accepting the offer. */
const WALK_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'enter'])

/**
 * Shows once per arrival at a site, after a beat that lets the hero view land.
 * `token` identifies the arrival; a new one (a different monument) invites again.
 */
export function useArrival(token: string, delay = 600) {
  const [show, setShow] = useState(false)
  const done = useRef<string | null>(null)

  useEffect(() => {
    if (done.current === token) return
    const id = window.setTimeout(() => setShow(true), delay)
    return () => window.clearTimeout(id)
  }, [token, delay])

  const dismiss = () => {
    done.current = token
    setShow(false)
  }
  return { show, dismiss }
}

export function ArrivalCard({
  name,
  place,
  era,
  heroLine,
  touch,
  onExplore,
  onDismiss,
  className,
}: {
  name: string
  place: string
  era: string
  heroLine: string
  touch: boolean
  onExplore: () => void
  onDismiss: () => void
  className?: string
}) {
  // Accepting by key rather than by button: the offer teaches W A S D by being
  // answerable with it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (WALK_KEYS.has(k)) {
        e.preventDefault()
        onExplore()
      } else if (k === 'escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExplore, onDismiss])

  return (
    <section
      aria-label={`Arrive at ${name}`}
      className={cn(
        'pointer-events-none w-[min(34rem,92vw)] [animation:bv-reveal_0.7s_cubic-bezier(0.16,1,0.3,1)] motion-reduce:[animation:none]',
        className,
      )}
    >
      <p className="label-meta text-accent/90">
        {place} · {era}
      </p>
      <p className="mt-2 display text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.05] text-foreground drop-shadow-[0_2px_18px_rgba(0,0,0,0.75)]">
        {heroLine}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={onExplore}
          className="pointer-events-auto group flex items-center gap-3 border border-accent/50 bg-accent/12 px-5 py-3 font-sans text-[0.6875rem] uppercase tracking-[0.2em] text-accent backdrop-blur-md transition-colors hover:bg-accent/20 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Explore the twin
          <span aria-hidden className="text-sm transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="pointer-events-auto font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-foreground"
        >
          Just look around
        </button>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 font-sans text-[0.6875rem] text-muted-foreground/90">
        {touch ? (
          <>
            <Cap>Stick</Cap> to walk
            <span aria-hidden className="text-border">
              ·
            </span>
            <Cap>Drag</Cap> to look
            <span aria-hidden className="text-border">
              ·
            </span>
            <Cap>Enter</Cap> at a doorway
          </>
        ) : (
          <>
            <Cap>W</Cap>
            <Cap>A</Cap>
            <Cap>S</Cap>
            <Cap>D</Cap> to walk
            <span aria-hidden className="text-border">
              ·
            </span>
            <Cap>E</Cap> to enter and inspect
          </>
        )}
      </p>
    </section>
  )
}

function Cap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-foreground/90 backdrop-blur-sm">
      {children}
    </kbd>
  )
}
