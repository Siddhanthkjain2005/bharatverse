'use client'

/**
 * Inspector panels below the viewer.
 *
 * Everything here is wired to the same world model the viewer draws, so
 * selecting a feature, a component or a room moves the camera in the scene above.
 */

import { EvidenceBadge, SourceList } from '@/components/provenance'
import { GuidePanel, type GuideContext } from '@/components/guide/guide-panel'
import type { ArchComponent } from '@/lib/twin/architecture'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'
import { ArchitectureInspector } from './architecture-inspector'
import { ConservationLens } from './conservation-lens'
import { InteriorNavigator } from './interior-navigator'
import { ThenNow } from './then-now'
import { TimeMachine } from './time-machine'

export type Panel =
  | 'FEATURES'
  | 'ARCHITECTURE'
  | 'INTERIOR'
  | 'TIME'
  | 'COMPARE'
  | 'CONSERVATION'
  | 'GUIDE'
  | 'SOURCES'

export const PANELS: { value: Panel; label: string }[] = [
  { value: 'FEATURES', label: 'Features' },
  { value: 'ARCHITECTURE', label: 'Architecture' },
  { value: 'INTERIOR', label: 'Spaces' },
  { value: 'TIME', label: 'Time machine' },
  { value: 'COMPARE', label: 'Then / now' },
  { value: 'CONSERVATION', label: 'Conservation' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'SOURCES', label: 'Sources' },
]

export function TwinPanels({
  site,
  panel,
  onPanel,
  activeHotspotId,
  onSelectHotspot,
  components,
  activeComponentId,
  onSelectComponent,
  phaseIndex,
  onPhase,
  onEnterSpace,
  occupiedSpaceId,
  analytical,
  onAnalytical,
  guideContext,
  guideSeed,
}: {
  site: HeritageSite
  panel: Panel
  onPanel: (p: Panel) => void
  activeHotspotId: string | null
  onSelectHotspot: (id: string | null) => void
  components: ArchComponent[]
  activeComponentId: string | null
  onSelectComponent: (id: string | null) => void
  phaseIndex: number
  onPhase: (i: number) => void
  onEnterSpace: (id: string) => void
  occupiedSpaceId: string | null
  analytical: boolean
  onAnalytical: (v: boolean) => void
  guideContext: GuideContext
  guideSeed: string | null
}) {
  const activeHotspot = site.hotspots.find((h) => h.id === activeHotspotId) ?? null

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_26rem]">
      <div className="flex flex-col gap-6">
        <nav
          aria-label="Twin inspector"
          className="scrollbar-thin flex gap-px overflow-x-auto border border-border/70 bg-border/70"
        >
          {PANELS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-current={panel === p.value ? 'true' : undefined}
              onClick={() => onPanel(p.value)}
              className={cn(
                'shrink-0 grow bg-background px-4 py-3 font-sans text-[0.6875rem] uppercase tracking-[0.16em] whitespace-nowrap transition-colors',
                panel === p.value ? 'bg-card text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </nav>

        {panel === 'FEATURES' && (
          <ul className="grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2">
            {site.hotspots.map((h, i) => (
              <li key={h.id} className="bg-background">
                <button
                  type="button"
                  onClick={() => onSelectHotspot(h.id === activeHotspotId ? null : h.id)}
                  aria-pressed={h.id === activeHotspotId}
                  className={cn(
                    'flex h-full w-full flex-col gap-2.5 p-5 text-left transition-colors',
                    h.id === activeHotspotId ? 'bg-card' : 'hover:bg-card/60',
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[0.625rem] tabular-nums text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-serif text-lg font-light leading-tight text-foreground">
                      {h.name}
                    </span>
                  </div>
                  <p className="font-sans text-sm leading-relaxed text-muted-foreground">{h.summary}</p>
                  <EvidenceBadge level={h.evidence} className="mt-auto self-start" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {panel === 'ARCHITECTURE' && (
          <ArchitectureInspector
            components={components}
            activeId={activeComponentId}
            onSelect={onSelectComponent}
          />
        )}

        {panel === 'INTERIOR' && (
          <InteriorNavigator
            site={site}
            onEnterSpace={site.spaces.length > 0 ? onEnterSpace : undefined}
            occupiedId={occupiedSpaceId}
          />
        )}

        {panel === 'TIME' && <TimeMachine site={site} index={phaseIndex} onChange={onPhase} />}

        {panel === 'COMPARE' && <ThenNow site={site} />}

        {panel === 'CONSERVATION' && (
          <ConservationLens site={site} analytical={analytical} onAnalytical={onAnalytical} />
        )}

        {panel === 'GUIDE' && (
          <div className="border border-border/70 bg-card/40 p-6">
            <GuidePanel
              siteSlug={site.slug}
              siteName={site.name}
              context={guideContext}
              seedQuestion={guideSeed}
              suggestions={[
                'What am I looking at, and how do we know?',
                'Why does this space matter?',
                'Was this always here?',
                'What is uncertain about this monument?',
              ]}
            />
          </div>
        )}

        {panel === 'SOURCES' && (
          <div className="flex flex-col gap-5 border border-border/70 bg-card/40 p-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-xl font-light text-foreground">
                Where this record comes from
              </h2>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                Every claim on this page traces to one of these references. The geometry
                is a {site.twin.provenanceNote.toLowerCase()}
              </p>
            </div>
            <SourceList ids={site.sourceIds} />
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-6">
        {activeHotspot ? (
          <div className="flex flex-col gap-4 border border-accent/30 bg-card/60 p-6">
            <span className="label-meta text-accent">Selected feature</span>
            <h2 className="font-serif text-2xl font-light leading-tight text-foreground">
              {activeHotspot.name}
            </h2>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              {activeHotspot.summary}
            </p>
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
              {activeHotspot.kind.replace(/_/g, ' ').toLowerCase()}
            </p>
            <EvidenceBadge level={activeHotspot.evidence} className="self-start" />
            <div className="rule" />
            <SourceList ids={activeHotspot.sourceIds} compact />
          </div>
        ) : (
          <div className="flex flex-col gap-4 border border-border/70 bg-card/40 p-6">
            <span className="label-meta">Reading the twin</span>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Walk the grounds, cross a threshold, and inspect what you find. Select a
              numbered marker — or a feature in the list — to fly the camera to it and
              read its evidence grade and sources.
            </p>
            <div className="rule" />
            <dl className="flex flex-col gap-3">
              {site.facts.slice(0, 5).map((f) => (
                <div key={f.id} className="flex flex-col gap-1">
                  <dt className="label-meta">{f.label}</dt>
                  <dd className="font-sans text-sm text-foreground/90">
                    {f.value ?? (
                      <span className="italic text-muted-foreground/80">
                        Information not yet verified.
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </aside>
    </div>
  )
}
