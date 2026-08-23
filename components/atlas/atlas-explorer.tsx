'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { HeritageMap } from './heritage-map'
import { SatelliteMap } from './satellite-map'
import { EvidenceBadge } from '@/components/provenance'
import type { HeritageSite } from '@/lib/heritage/types'
import { filterSites, INTERIOR_LABEL, PROVENANCE_LABEL } from '@/lib/heritage/query'
import { cn } from '@/lib/utils'

type Facet = { key: string; label: string; values: string[] }

/** Tradition names are scholarly and long; the chip shows a scannable stem. */
function shortTradition(value: string): string {
  return value
    .replace(/ architecture and painting$/i, ' rock-cut')
    .replace(/ temple architecture of the /i, ' · ')
    .replace(/ funerary architecture$/i, ' funerary')
    .replace(/ rock-cut and structural temple architecture$/i, ' rock-cut')
    .replace(/ temple architecture$/i, '')
    .replace(/ architecture$/i, '')
}

export function AtlasExplorer({
  sites,
  facets,
  mapsKey = null,
}: {
  sites: HeritageSite[]
  facets: { states: string[]; traditions: string[]; eras: string[] }
  mapsKey?: string | null
}) {
  const [surface, setSurface] = useState<'IMAGERY' | 'SCHEMATIC'>(
    mapsKey ? 'IMAGERY' : 'SCHEMATIC',
  )
  const [q, setQ] = useState('')
  const [state, setState] = useState<string | null>(null)
  const [tradition, setTradition] = useState<string | null>(null)
  const [era, setEra] = useState<string | null>(null)
  const [unescoOnly, setUnescoOnly] = useState(false)
  const [maxInteriorLevel, setMaxInteriorLevel] = useState<number | undefined>(undefined)
  const [active, setActive] = useState<string | null>(null)

  const results = useMemo(
    () => filterSites({ q, state, tradition, era, unescoOnly, maxInteriorLevel }),
    [q, state, tradition, era, unescoOnly, maxInteriorLevel],
  )

  const facetList: Facet[] = [
    { key: 'state', label: 'State', values: facets.states },
    { key: 'tradition', label: 'Tradition', values: facets.traditions },
    { key: 'era', label: 'Era', values: facets.eras },
  ]

  const selected: Record<string, string | null> = { state, tradition, era }
  const setters: Record<string, (v: string | null) => void> = {
    state: setState,
    tradition: setTradition,
    era: setEra,
  }

  const reset = () => {
    setQ('')
    setState(null)
    setTradition(null)
    setEra(null)
    setUnescoOnly(false)
    setMaxInteriorLevel(undefined)
  }

  const anyFilter =
    q !== '' || state || tradition || era || unescoOnly || maxInteriorLevel !== undefined

  return (
    <div className="mx-auto grid max-w-[110rem] gap-8 px-5 pb-24 pt-28 md:px-8 lg:grid-cols-[22rem_1fr]">
      {/* ---------- filter rail ---------- */}
      <aside className="flex flex-col gap-7 lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)] lg:overflow-y-auto lg:pr-2 scrollbar-thin">
        <div className="flex flex-col gap-3">
          <h1 className="display text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.95]">
            The Atlas
          </h1>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            Every monument in the index, with its provenance and interior
            availability stated up front.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="atlas-search" className="label-meta">
            Search the index
          </label>
          <input
            id="atlas-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Temple, granite, Chola, stepwell…"
            className="w-full border border-border bg-card px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent"
          />
        </div>

        {facetList.map((facet) => (
          <fieldset key={facet.key} className="flex flex-col gap-2.5">
            <legend className="label-meta mb-1">{facet.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {facet.values.map((value) => {
                const isOn = selected[facet.key] === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => setters[facet.key](isOn ? null : value)}
                    title={value}
                    className={cn(
                      'max-w-full truncate border px-2.5 py-1.5 text-left font-sans text-[0.6875rem] uppercase tracking-[0.12em] transition-colors',
                      isOn
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    )}
                  >
                    {facet.key === 'tradition' ? shortTradition(value) : value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}

        <fieldset className="flex flex-col gap-2.5">
          <legend className="label-meta mb-1">Record quality</legend>
          <label className="flex cursor-pointer items-center gap-2.5 font-sans text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={unescoOnly}
              onChange={(e) => setUnescoOnly(e.target.checked)}
              className="size-3.5 accent-[var(--accent)]"
            />
            UNESCO-inscribed only
          </label>
          <label htmlFor="interior-level" className="mt-2 flex flex-col gap-1.5">
            <span className="font-sans text-sm text-muted-foreground">
              Interior evidence threshold
            </span>
            <select
              id="interior-level"
              value={maxInteriorLevel ?? ''}
              onChange={(e) =>
                setMaxInteriorLevel(e.target.value ? Number(e.target.value) : undefined)
              }
              className="border border-border bg-card px-2.5 py-2 font-sans text-xs text-foreground outline-none focus:border-accent"
            >
              <option value="">Any level</option>
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  {INTERIOR_LABEL[l]} or better
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <div className="flex items-center justify-between border-t border-border/70 pt-4">
          <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
            {String(results.length).padStart(2, '0')} of{' '}
            {String(sites.length).padStart(2, '0')} monuments
          </span>
          {anyFilter && (
            <button
              type="button"
              onClick={reset}
              className="font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
      </aside>

      {/* ---------- map + results ---------- */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          {mapsKey && (
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <span className="label-meta">
                {surface === 'IMAGERY'
                  ? 'Satellite imagery · real coordinates'
                  : 'Stylised outline · navigation only'}
              </span>
              <div className="flex items-center gap-px border border-border/70 bg-border/70">
                {(['IMAGERY', 'SCHEMATIC'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={surface === s}
                    onClick={() => setSurface(s)}
                    className={cn(
                      'bg-background px-3 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.14em] transition-colors',
                      surface === s
                        ? 'bg-card text-accent'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s === 'IMAGERY' ? 'Imagery' : 'Schematic'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mapsKey && surface === 'IMAGERY' ? (
            <SatelliteMap
              apiKey={mapsKey}
              sites={results}
              activeSlug={active}
              onFocus={setActive}
            />
          ) : (
            <div className="mx-auto w-full max-w-3xl">
              <HeritageMap sites={results} activeSlug={active} onHover={setActive} />
            </div>
          )}
        </div>

        {results.length === 0 ? (
          <div className="border border-border/70 bg-card/40 px-6 py-16 text-center">
            <p className="font-serif text-xl text-foreground">
              No monument in the index matches those filters.
            </p>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              The index is deliberately small and fully sourced rather than broad
              and unverified.
            </p>
          </div>
        ) : (
          <ul className="grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((site) => (
              <li key={site.id} className="bg-background">
                <Link
                  href={`/site/${site.slug}`}
                  onMouseEnter={() => setActive(site.slug)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(site.slug)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    'group flex h-full flex-col gap-4 p-6 transition-colors',
                    active === site.slug ? 'bg-card' : 'hover:bg-card/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="font-serif text-xl font-light leading-tight text-foreground">
                        {site.name}
                      </h2>
                      <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {site.city} · {site.state}
                      </p>
                    </div>
                    {site.unescoRef && (
                      <span className="shrink-0 border border-accent/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-accent">
                        UNESCO
                      </span>
                    )}
                  </div>

                  <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                    {site.heroLine}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/8 px-1.5 py-0.5 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary">
                      {PROVENANCE_LABEL[site.twin.provenance]}
                    </span>
                    <span className="inline-flex items-center border border-border/80 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
                      {INTERIOR_LABEL[site.twin.interiorLevel].split(' — ')[0]}
                    </span>
                    <EvidenceBadge level={site.stories[0]?.evidence ?? 'VERIFIED_FACT'} />
                  </div>

                  <span className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Enter the twin →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
