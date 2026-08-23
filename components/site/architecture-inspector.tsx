'use client'

/**
 * Architecture Inspector.
 *
 * Select a component and the camera frames the geometry that represents it while
 * the panel explains what the element does in its tradition. The distinction that
 * matters is stated at the top: these are typological readings of the type, not
 * measurements of this building.
 */

import { EvidenceBadge, SourceList } from '@/components/provenance'
import type { ArchComponent } from '@/lib/twin/architecture'
import { cn } from '@/lib/utils'

export function ArchitectureInspector({
  components,
  activeId,
  onSelect,
}: {
  components: ArchComponent[]
  activeId: string | null
  onSelect: (id: string | null) => void
}) {
  const active = components.find((c) => c.id === activeId) ?? null

  if (components.length === 0) {
    return (
      <div className="border border-border/70 bg-card/40 p-6">
        <p className="font-serif text-lg text-foreground">
          No component breakdown is available for this monument.
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
          The inspector needs a documented core space to anchor its components, and
          this record does not describe one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-px border border-border/70 bg-border/70 lg:grid lg:grid-cols-[15rem_1fr]">
      <ul className="flex flex-col gap-px bg-border/70">
        {components.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id === activeId ? null : c.id)}
              aria-pressed={c.id === activeId}
              className={cn(
                'flex w-full flex-col gap-0.5 bg-background px-4 py-3 text-left transition-colors',
                c.id === activeId ? 'bg-card text-accent' : 'text-foreground hover:bg-card/60',
              )}
            >
              <span className="font-serif text-base font-light leading-tight">{c.name}</span>
              {c.term && (
                <span className="font-sans text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.term}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 bg-background p-6">
        {active ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="label-meta">Component</span>
                <h3 className="font-serif text-2xl font-light leading-tight text-foreground">
                  {active.name}
                  {active.term && (
                    <span className="ml-2 font-sans text-sm italic text-muted-foreground">
                      {active.term}
                    </span>
                  )}
                </h3>
              </div>
              <EvidenceBadge level={active.evidence} />
            </div>
            <p className="max-w-[62ch] font-sans text-sm leading-relaxed text-muted-foreground">
              {active.purpose}
            </p>
            <p className="font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/70">
              The camera is framed on the reconstructed geometry that stands in for this
              element. Dimensions are indicative and must not be measured against.
            </p>
            <div className="rule" />
            <SourceList ids={active.sourceIds} compact />
          </>
        ) : (
          <>
            <span className="label-meta">Architecture</span>
            <p className="max-w-[62ch] font-sans text-sm leading-relaxed text-muted-foreground">
              Pick a component to fly the camera to it and read what it does. Each entry
              is a typological reading of this tradition — a plinth sheds water, a cornice
              throws shade, a spire marks the sanctum — graded as interpretation rather
              than measurement.
            </p>
            <div className="rule" />
            <ul className="grid grid-cols-2 gap-2">
              {components.map((c) => (
                <li key={c.id} className="font-sans text-xs text-muted-foreground">
                  {c.name}
                  {c.term ? ` · ${c.term}` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
