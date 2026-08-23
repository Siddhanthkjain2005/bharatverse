'use client'

/**
 * Walk HUD: where you are, what is near you, and what pressing E will do.
 *
 * Everything here comes from the record — the space name, its accessibility note,
 * the evidence grade of the feature in front of you. Nothing is inferred.
 */

import { EvidenceBadge } from '@/components/provenance'
import type { Hotspot } from '@/lib/heritage/types'
import type { Portal, WorldSpace } from '@/lib/twin/model'
import { cn } from '@/lib/utils'

export function Orientation({
  space,
  indoors,
  nearbyCount,
  siteName,
  className,
}: {
  space: WorldSpace | null
  indoors: boolean
  nearbyCount: number
  siteName: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Your position"
      className={cn(
        'w-[min(17rem,60vw)] border border-border/70 bg-background/78 px-3.5 py-3 backdrop-blur-md',
        className,
      )}
    >
      <p className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-accent">
        You are here
      </p>
      <p className="mt-1 font-serif text-base font-light leading-tight text-foreground">
        {space ? space.space.name : indoors ? 'Inside' : 'On the grounds'}
      </p>
      <p className="font-sans text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
        {space ? space.space.kind.replace(/_/g, ' ').toLowerCase() : siteName}
      </p>
      <div className="mt-2.5 flex flex-col gap-1 border-t border-border/60 pt-2.5">
        <p className="font-sans text-[0.6875rem] text-muted-foreground">
          {nearbyCount > 0
            ? `${nearbyCount} ${nearbyCount === 1 ? 'feature' : 'features'} documented nearby`
            : 'No documented feature within reach'}
        </p>
        {space?.space.accessibility && (
          <p className="font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/80">
            {space.space.accessibility}
          </p>
        )}
      </div>
      {space && <EvidenceBadge level={space.space.evidence} className="mt-2.5" />}
    </div>
  )
}

export function ContextPrompt({
  portal,
  direction,
  hotspot,
  touch,
  className,
}: {
  portal: Portal | null
  direction: 'IN' | 'OUT' | null
  hotspot: Hotspot | null
  touch: boolean
  className?: string
}) {
  const key = touch ? 'Tap' : 'E'
  if (portal) {
    const leaving = direction === 'OUT'
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Action in front of you"
        className={cn(
          'w-[min(22rem,90vw)] border bg-background/90 px-3 py-2.5 backdrop-blur-md [animation:bv-reveal_0.28s_ease-out]',
          portal.restricted ? 'border-border/70' : 'border-accent/55',
          className,
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-accent">
            {portal.restricted ? 'Threshold' : leaving ? 'Way out' : 'Way in'}
          </p>
          <EvidenceBadge level={portal.evidence} />
        </div>
        <p className="mt-1 font-serif text-base font-light leading-tight text-foreground">
          {portal.restricted
            ? portal.label
            : leaving
              ? `Leave ${portal.label}`
              : `Enter ${portal.label}`}
        </p>
        <p className="mt-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent/90">
          {portal.restricted ? 'Closed to visitors — look, do not enter' : `Press ${key} to cross`}
        </p>
        {portal.restricted && portal.accessibility && (
          <p className="mt-1 font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/80">{portal.accessibility}</p>
        )}
      </div>
    )
  }

  if (hotspot) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Action in front of you"
        className={cn(
          'w-[min(22rem,90vw)] border border-accent/40 bg-background/88 px-3 py-2.5 backdrop-blur-md [animation:bv-reveal_0.28s_ease-out]',
          className,
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-accent">
            {hotspot.kind.replace(/_/g, ' ')}
          </p>
          <EvidenceBadge level={hotspot.evidence} />
        </div>
        <p className="mt-1 font-serif text-base font-light leading-tight text-foreground">
          {hotspot.name}
        </p>
        <p className="mt-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent/90">
          Press {key} to inspect
        </p>
      </div>
    )
  }

  return null
}
