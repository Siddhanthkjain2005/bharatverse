'use client'

/**
 * Real-imagery atlas.
 *
 * Unlike the stylised outline map, every coordinate here is the monument's
 * recorded WGS84 position rendered over Google's own imagery — so what the
 * visitor sees is survey imagery, not our drawing. The key is injected from the
 * server (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) rather than hard-coded. This is
 * intentionally a browser-restricted key, never a Routes/Places server key.
 */

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const INDIA_CENTER = { lat: 22.0, lng: 79.5 }

type View = 'hybrid' | 'satellite' | 'terrain'

const VIEWS: { value: View; label: string }[] = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
]

/** Flies the camera when the focused monument changes. */
function CameraDirector({
  site,
  tilted,
}: {
  site: HeritageSite | null
  tilted: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    if (!site) {
      map.moveCamera({ center: INDIA_CENTER, zoom: 4.2, tilt: 0, heading: 0 })
      return
    }
    map.moveCamera({
      center: { lat: site.lat, lng: site.lon },
      zoom: 17.4,
      tilt: tilted ? 60 : 0,
      heading: tilted ? 32 : 0,
    })
  }, [map, site, tilted])

  return null
}

export function SatelliteMap({
  apiKey,
  sites,
  activeSlug,
  onFocus,
}: {
  apiKey: string
  sites: HeritageSite[]
  activeSlug?: string | null
  onFocus?: (slug: string | null) => void
}) {
  const [view, setView] = useState<View>('hybrid')
  const [tilted, setTilted] = useState(true)
  const [focusSlug, setFocusSlug] = useState<string | null>(null)

  // A hover in the results list previews; an explicit marker click locks focus.
  const focused = useMemo(
    () => sites.find((s) => s.slug === (focusSlug ?? activeSlug)) ?? null,
    [sites, focusSlug, activeSlug],
  )

  // Never keep a lock on a monument the filters just removed.
  useEffect(() => {
    if (focusSlug && !sites.some((s) => s.slug === focusSlug)) setFocusSlug(null)
  }, [focusSlug, sites])

  return (
    <div className="relative w-full overflow-hidden border border-border/70 bg-card">
      <APIProvider apiKey={apiKey}>
        <div className="h-[26rem] w-full sm:h-[32rem]">
          <Map
            // A vector map ID is required for advanced markers and 45° tilt.
            mapId="DEMO_MAP_ID"
            defaultCenter={INDIA_CENTER}
            defaultZoom={4.2}
            mapTypeId={view}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            keyboardShortcuts={false}
            reuseMaps
            colorScheme="DARK"
          >
            {sites.map((site, i) => {
              const isFocused = site.slug === focused?.slug
              return (
                <AdvancedMarker
                  key={site.id}
                  position={{ lat: site.lat, lng: site.lon }}
                  title={`${site.name} — ${site.city}, ${site.state}`}
                  zIndex={isFocused ? 40 : 10}
                  onClick={() => {
                    const next = isFocused ? null : site.slug
                    setFocusSlug(next)
                    onFocus?.(next)
                  }}
                >
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-1.5 py-1 font-sans text-[0.625rem] uppercase tracking-[0.1em] backdrop-blur-md transition-all duration-300',
                      isFocused
                        ? 'border-accent bg-accent text-accent-foreground shadow-[0_0_26px_-6px_var(--accent)]'
                        : 'border-accent/50 bg-background/80 text-foreground hover:border-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded-full font-mono text-[0.5625rem] tabular-nums',
                        isFocused
                          ? 'bg-accent-foreground/20'
                          : 'bg-accent/20 text-accent',
                      )}
                    >
                      {i + 1}
                    </span>
                    {isFocused && (
                      <span className="max-w-[14ch] truncate pr-1">
                        {site.name}
                      </span>
                    )}
                  </span>
                </AdvancedMarker>
              )
            })}
            <CameraDirector site={focused} tilted={tilted} />
          </Map>
        </div>
      </APIProvider>

      {/* ---- controls ---- */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1 border border-border/80 bg-background/85 p-1 backdrop-blur-md">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              onClick={() => setView(v.value)}
              className={cn(
                'px-2 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.12em] transition-colors',
                view === v.value
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex items-center gap-1 border border-border/80 bg-background/85 p-1 backdrop-blur-md">
          <button
            type="button"
            aria-pressed={tilted}
            onClick={() => setTilted((t) => !t)}
            className={cn(
              'px-2 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.12em] transition-colors',
              tilted
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            45° view
          </button>
          {focused && (
            <button
              type="button"
              onClick={() => {
                setFocusSlug(null)
                onFocus?.(null)
              }}
              className="px-2 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.12em] text-primary transition-colors hover:text-foreground"
            >
              All India
            </button>
          )}
        </div>
      </div>

      {/* ---- focused readout ---- */}
      {focused && (
        <div className="absolute bottom-3 left-3 max-w-xs border border-border/80 bg-background/90 p-4 backdrop-blur-md">
          <p className="label-meta">
            {focused.city} · {focused.state}
          </p>
          <p className="mt-1 font-serif text-xl font-light leading-tight text-foreground">
            {focused.name}
          </p>
          <p className="mt-1 font-mono text-[0.625rem] tabular-nums text-muted-foreground">
            {focused.lat.toFixed(4)}°N {focused.lon.toFixed(4)}°E
          </p>
          <Link
            href={`/site/${focused.slug}`}
            className="mt-3 inline-block font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent"
          >
            Enter the twin →
          </Link>
        </div>
      )}

      <p className="border-t border-border/70 bg-background/60 px-3 py-2 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        Imagery © Google · Monument coordinates from the Bharatverse index
      </p>
    </div>
  )
}
