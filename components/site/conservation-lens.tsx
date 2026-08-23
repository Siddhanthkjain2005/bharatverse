'use client'

/**
 * Conservation panel.
 *
 * The honest version of a "damage lens": the platform shows the indicators and
 * candidate findings it holds, states their data class in the loudest way the UI
 * can, and refuses to paint them onto the monument — because no spatial location
 * is recorded for them. A convincing red overlay would be a fabrication.
 */

import { DataClassBadge, SourceList } from '@/components/provenance'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const TREND: Record<string, string> = {
  IMPROVING: '↑ improving',
  STABLE: '→ stable',
  DECLINING: '↓ declining',
  UNKNOWN: '· unknown',
}

const SEVERITY: Record<string, string> = {
  LOW: 'border-emerald-400/40 text-emerald-200/90',
  MEDIUM: 'border-accent/50 text-accent',
  HIGH: 'border-destructive/60 text-destructive',
}

export function ConservationLens({
  site,
  analytical,
  onAnalytical,
}: {
  site: HeritageSite
  analytical: boolean
  onAnalytical: (v: boolean) => void
}) {
  const c = site.conservation

  return (
    <div className="flex flex-col gap-6 border border-border/70 bg-card/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-meta">Conservation</span>
          <p className="max-w-[58ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Indicators and candidate findings held against this monument. Machine
            proposals are never presented as findings until a human has reviewed them.
          </p>
        </div>
        <DataClassBadge dataClass={c.dataClass} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-accent/30 bg-accent/5 px-4 py-3">
        <button
          type="button"
          onClick={() => onAnalytical(!analytical)}
          aria-pressed={analytical}
          className={cn(
            'border px-3 py-2 font-sans text-[0.625rem] uppercase tracking-[0.16em] transition-colors',
            analytical
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-border/70 text-muted-foreground hover:text-foreground',
          )}
        >
          Analytical view
        </button>
        <p className="max-w-[52ch] font-sans text-[0.6875rem] leading-relaxed text-muted-foreground">
          Renders the twin in flat analytical shading with the Evidence Lens engaged.
          It does <em>not</em> mark damage on the model: no coordinates are recorded
          for these findings, so they are listed rather than mapped.
        </p>
      </div>

      {c.healthIndex !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-meta">Composite index</span>
            <span className="font-mono text-sm tabular-nums text-accent">{c.healthIndex}/100</span>
          </div>
          <div className="h-1.5 w-full bg-border">
            <div className="h-full bg-accent/70" style={{ width: `${c.healthIndex}%` }} />
          </div>
        </div>
      )}

      <ul className="grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2">
        {c.indicators.map((i) => (
          <li key={i.id} className="flex flex-col gap-2 bg-background p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-sm text-foreground">{i.label}</span>
              <span className="font-mono text-xs tabular-nums text-accent">{i.score}</span>
            </div>
            <div className="h-1 w-full bg-border">
              <div
                className={cn(
                  'h-full',
                  i.score > 75 ? 'bg-emerald-400/70' : i.score > 55 ? 'bg-accent/70' : 'bg-destructive/70',
                )}
                style={{ width: `${i.score}%` }}
              />
            </div>
            <span className="font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
              {TREND[i.trend]} · {i.note}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <span className="label-meta">Inspection queue</span>
        <ul className="flex flex-col gap-px border border-border/70 bg-border/70">
          {c.inspections.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 bg-background p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="font-serif text-base font-light text-foreground">{r.zone}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 font-sans text-[0.5625rem] uppercase tracking-[0.14em]',
                      SEVERITY[r.severity],
                    )}
                  >
                    {r.severity}
                  </span>
                  <span className="font-sans text-[0.5625rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </span>
              </div>
              <p className="font-sans text-xs leading-relaxed text-muted-foreground">{r.finding}</p>
              <p className="font-mono text-[0.625rem] text-muted-foreground/70">
                {r.date} · {r.inspector}
                {r.cvConfidence !== null && ` · model confidence ${(r.cvConfidence * 100).toFixed(0)}%`}
                {r.reviewedBy ? ` · reviewed by ${r.reviewedBy}` : ' · awaiting human review'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {c.comparison && (
        <div className="flex flex-col gap-1.5 border-t border-border/70 pt-4">
          <span className="label-meta">{c.comparison.label}</span>
          <p className="font-sans text-xs text-muted-foreground">
            {c.comparison.beforeLabel} ↔ {c.comparison.afterLabel} — {c.comparison.note}
          </p>
        </div>
      )}

      <div className="border-t border-border/70 pt-4">
        <SourceList ids={site.sourceIds} compact />
      </div>
    </div>
  )
}
