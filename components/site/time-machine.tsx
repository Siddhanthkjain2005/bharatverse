'use client'

import { EvidenceBadge, SourceList } from '@/components/provenance'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const STATE_LABEL: Record<string, string> = {
  FOUNDATION: 'Foundation laid',
  CONSTRUCTION: 'Under construction',
  COMPLETE: 'Complete',
  DAMAGED: 'Damaged',
  RESTORED: 'Restored',
}

export function TimeMachine({
  site,
  index,
  onChange,
}: {
  site: HeritageSite
  index: number
  onChange: (index: number) => void
}) {
  const phase = site.timeline[index]
  const last = site.timeline.length - 1

  return (
    <div className="flex flex-col gap-6 border border-border/70 bg-card/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-meta">Time machine</span>
          <p className="max-w-[52ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Scrub the century. The twin rebuilds itself to match the phase — the
            geometry changes, not just the caption.
          </p>
        </div>
        {phase.twinState && (
          <span className="border border-primary/40 bg-primary/8 px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.16em] text-primary">
            Twin state · {STATE_LABEL[phase.twinState]}
          </span>
        )}
      </div>

      {/* scrubber */}
      <div className="flex flex-col gap-3">
        <label htmlFor="time-scrub" className="sr-only">
          Select a phase in the monument&apos;s history
        </label>
        <input
          id="time-scrub"
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
          aria-valuetext={`${phase.year} — ${phase.title}`}
        />
        <ol className="flex justify-between gap-2">
          {site.timeline.map((p, i) => (
            <li key={p.id} className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onChange(i)}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'w-full truncate border-t-2 pt-2 text-left font-mono text-[0.625rem] tabular-nums transition-colors',
                  i === index
                    ? 'border-accent text-accent'
                    : i < index
                      ? 'border-primary/40 text-muted-foreground hover:text-foreground'
                      : 'border-border/70 text-muted-foreground/60 hover:text-foreground',
                )}
                title={`${p.year} — ${p.title}`}
              >
                {p.year}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* active phase */}
      <div className="flex flex-col gap-3 border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-sm tabular-nums text-accent">
            {phase.year}
          </span>
          <h3 className="font-serif text-2xl font-light leading-tight text-foreground">
            {phase.title}
          </h3>
        </div>
        <p className="max-w-[72ch] font-sans text-sm leading-relaxed text-muted-foreground">
          {phase.detail}
        </p>
        <EvidenceBadge level={phase.evidence} className="self-start" />
        <div className="mt-2 border-t border-border/70 pt-4">
          <SourceList ids={phase.sourceIds} compact />
        </div>
      </div>
    </div>
  )
}
