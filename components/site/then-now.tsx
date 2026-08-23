'use client'

/**
 * Then / Now.
 *
 * Two renders of the same world at two documented phases, wiped against each
 * other. The geometry differs because the phase differs — this is a comparison of
 * reconstructions, not of captions, and the panel says which phase each side is.
 */

import { useMemo, useState } from 'react'
import { EvidenceBadge, SourceList } from '@/components/provenance'
import { TwinStill } from '@/components/twin/showcase'
import type { BuildStateKey } from '@/lib/twin/materials'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

function progressFor(site: HeritageSite, index: number) {
  return site.timeline.length > 1 ? (index + 1) / site.timeline.length : 1
}

export function ThenNow({ site }: { site: HeritageSite }) {
  const last = site.timeline.length - 1
  const [thenIndex, setThenIndex] = useState(0)
  const [nowIndex, setNowIndex] = useState(last)
  const [wipe, setWipe] = useState(50)
  const [shot, setShot] = useState('hero')

  const then = site.timeline[thenIndex]
  const now = site.timeline[nowIndex]
  const thenState = (then.twinState ?? 'CONSTRUCTION') as BuildStateKey
  const nowState = (now.twinState ?? 'COMPLETE') as BuildStateKey
  const thenProgress = useMemo(() => progressFor(site, thenIndex), [site, thenIndex])
  const nowProgress = useMemo(() => progressFor(site, nowIndex), [site, nowIndex])

  const SHOTS = [
    { id: 'hero', label: 'Hero' },
    { id: 'approach', label: 'Approach' },
    { id: 'crown', label: 'Superstructure' },
    { id: 'aerial', label: 'Aerial' },
  ]

  return (
    <div className="flex flex-col gap-5 border border-border/70 bg-card/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-meta">Then ↔ Now</span>
          <p className="max-w-[56ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Drag the wipe. Both halves are the same reconstruction rebuilt at a
            different documented phase, framed from the same camera.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {SHOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShot(s.id)}
              aria-pressed={shot === s.id}
              className={cn(
                'border px-2.5 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.14em] transition-colors',
                shot === s.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden border border-border/70 bg-[#0f0d0b]">
        <TwinStill
          key={`then:${site.id}:${thenIndex}:${shot}`}
          site={site}
          progress={thenProgress}
          state={thenState}
          shotId={shot}
          timeOfDay="NOON"
          className="absolute inset-0 h-full w-full"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${wipe}%)` }}
        >
          <TwinStill
            key={`now:${site.id}:${nowIndex}:${shot}`}
            site={site}
            progress={nowProgress}
            state={nowState}
            shotId={shot}
            timeOfDay="NOON"
            className="h-full w-full"
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-accent/80 shadow-[0_0_18px_var(--accent)]"
          style={{ left: `${wipe}%` }}
        />
        <span className="pointer-events-none absolute left-3 top-3 border border-border/70 bg-background/80 px-2 py-1 font-mono text-[0.625rem] tabular-nums text-accent backdrop-blur-md">
          {then.year}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 border border-border/70 bg-background/80 px-2 py-1 font-mono text-[0.625rem] tabular-nums text-accent backdrop-blur-md">
          {now.year}
        </span>

        <label className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-background/85 to-transparent px-4 pb-3 pt-8">
          <span className="sr-only">Comparison wipe position</span>
          <input
            type="range"
            min={2}
            max={98}
            value={wipe}
            onChange={(e) => setWipe(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label="Comparison wipe position"
          />
        </label>
      </div>

      <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2">
        {[
          { label: 'Then', phase: then, index: thenIndex, set: setThenIndex },
          { label: 'Now', phase: now, index: nowIndex, set: setNowIndex },
        ].map((side) => (
          <div key={side.label} className="flex flex-col gap-3 bg-background p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="label-meta">{side.label}</span>
              <EvidenceBadge level={side.phase.evidence} />
            </div>
            <select
              value={side.index}
              onChange={(e) => side.set(Number(e.target.value))}
              aria-label={`${side.label} phase`}
              className="border border-border/70 bg-card/60 px-2.5 py-2 font-sans text-xs text-foreground"
            >
              {site.timeline.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.year} — {p.title}
                </option>
              ))}
            </select>
            <p className="font-sans text-xs leading-relaxed text-muted-foreground">
              {side.phase.detail}
            </p>
            <SourceList ids={side.phase.sourceIds} compact />
          </div>
        ))}
      </div>
    </div>
  )
}
