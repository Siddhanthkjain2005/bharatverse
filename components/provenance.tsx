import Link from 'next/link'
import { getSources } from '@/lib/heritage/sources'
import {
  EVIDENCE_LABEL,
  INTERIOR_LABEL,
  PROVENANCE_LABEL,
} from '@/lib/heritage/query'
import type { DataClass, EvidenceLevel, TwinAsset } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const EVIDENCE_TONE: Record<EvidenceLevel, string> = {
  VERIFIED_FACT: 'border-emerald-400/35 text-emerald-200/90 bg-emerald-400/8',
  INTERPRETATION: 'border-sky-400/35 text-sky-200/90 bg-sky-400/8',
  ORAL_TRADITION: 'border-accent/40 text-accent bg-accent/8',
  FOLKLORE: 'border-fuchsia-400/35 text-fuchsia-200/90 bg-fuchsia-400/8',
  RECONSTRUCTION: 'border-primary/45 text-primary bg-primary/8',
  AI_ASSISTED_SUMMARY: 'border-muted-foreground/35 text-muted-foreground bg-muted/40',
}

export function EvidenceBadge({
  level,
  className,
}: {
  level: EvidenceLevel
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 border px-1.5 py-0.5 font-sans text-[0.625rem] uppercase tracking-[0.14em]',
        EVIDENCE_TONE[level],
        className,
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {EVIDENCE_LABEL[level]}
    </span>
  )
}

export function DataClassBadge({ dataClass }: { dataClass: DataClass }) {
  const map: Record<DataClass, { label: string; tone: string }> = {
    VERIFIED: { label: 'Verified data', tone: 'border-emerald-400/40 text-emerald-200' },
    DEMO_SYNTHETIC: {
      label: 'Demonstration data — not a measurement',
      tone: 'border-destructive/50 text-destructive',
    },
    UNVERIFIED: { label: 'Unverified', tone: 'border-muted-foreground/40 text-muted-foreground' },
  }
  const v = map[dataClass]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.16em]',
        v.tone,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {v.label}
    </span>
  )
}

export function ProvenanceChip({ twin }: { twin: TwinAsset }) {
  return (
    <div className="flex flex-col gap-1 border border-border/80 bg-background/70 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="font-sans text-[0.625rem] uppercase tracking-[0.18em] text-primary">
          {PROVENANCE_LABEL[twin.provenance]}
        </span>
      </div>
      <p className="max-w-[46ch] font-sans text-[0.6875rem] leading-relaxed text-muted-foreground">
        {twin.provenanceNote}
      </p>
      <p className="font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        {INTERIOR_LABEL[twin.interiorLevel]}
      </p>
    </div>
  )
}

export function SourceList({
  ids,
  compact = false,
}: {
  ids: string[]
  compact?: boolean
}) {
  const sources = getSources(ids)
  if (sources.length === 0) {
    return (
      <p className="font-sans text-xs text-muted-foreground">
        Information not yet verified.
      </p>
    )
  }
  return (
    <ul className={cn('flex flex-col', compact ? 'gap-1' : 'gap-2.5')}>
      {sources.map((s) => (
        <li key={s.id}>
          <Link
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex flex-col gap-0.5 border-l border-border/70 pl-3 transition-colors hover:border-primary"
          >
            <span className="font-sans text-xs leading-snug text-foreground/90 group-hover:text-primary">
              {s.title}
            </span>
            <span className="font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
              {s.publisher} · {s.reuse.replace(/_/g, ' ').toLowerCase()} · checked{' '}
              {s.lastChecked}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function NotVerified({ label }: { label?: string }) {
  return (
    <span className="font-sans text-sm text-muted-foreground/80 italic">
      {label ?? 'Information not yet verified.'}
    </span>
  )
}
