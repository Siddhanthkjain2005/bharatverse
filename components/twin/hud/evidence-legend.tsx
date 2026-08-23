'use client'

/**
 * Evidence Lens legend.
 *
 * The lens shifts surfaces by how well attested they are. Without a key that is
 * just a colour grade, so the key ships with it — and it names the four honest
 * categories the platform actually distinguishes.
 */

import type { TwinAsset } from '@/lib/heritage/types'
import { PROVENANCE_LABEL } from '@/lib/heritage/query'
import { cn } from '@/lib/utils'

const CLASSES: { label: string; note: string; swatch: string }[] = [
  {
    label: 'Documented',
    note: 'Space or feature attested by a cited institutional source.',
    swatch: 'bg-emerald-300/70',
  },
  {
    label: 'Reconstructed',
    note: 'Massing inferred from published plans and typology.',
    swatch: 'bg-sky-300/60',
  },
  {
    label: 'Interpretive',
    note: 'Ornament, fittings and carving programme standing in for the real thing.',
    swatch: 'bg-indigo-300/55',
  },
  {
    label: 'Contextual',
    note: 'Landscape, planting and debris — visualisation, not evidence.',
    swatch: 'bg-slate-300/45',
  },
]

export function EvidenceLegend({
  twin,
  className,
}: {
  twin: TwinAsset
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-[min(20rem,86vw)] border border-border/70 bg-background/88 p-4 backdrop-blur-xl',
        className,
      )}
    >
      <span className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-accent">
        Evidence lens
      </span>
      <p className="mt-1.5 font-sans text-[0.6875rem] leading-relaxed text-muted-foreground">
        Surfaces are shifted by how well the record supports them. Nothing is hidden —
        the point is that visual quality never implies certainty.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {CLASSES.map((c) => (
          <li key={c.label} className="flex gap-2.5">
            <span aria-hidden className={cn('mt-1 size-2.5 shrink-0 rounded-full', c.swatch)} />
            <span className="flex flex-col">
              <span className="font-sans text-xs text-foreground">{c.label}</span>
              <span className="font-sans text-[0.625rem] leading-relaxed text-muted-foreground">
                {c.note}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border/60 pt-2.5 font-sans text-[0.625rem] leading-relaxed text-muted-foreground/80">
        This twin as a whole is graded{' '}
        <span className="text-primary">{PROVENANCE_LABEL[twin.provenance]}</span>.
      </p>
    </div>
  )
}
