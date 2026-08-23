'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { haversineKm, outlinePath, projectNormalized } from '@/lib/geo/india'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const SIZE = 1000

export function HeritageMap({
  sites,
  activeSlug,
  onHover,
  compact = false,
}: {
  sites: HeritageSite[]
  activeSlug?: string | null
  onHover?: (slug: string | null) => void
  compact?: boolean
}) {
  const path = useMemo(() => outlinePath(SIZE), [])
  const [hovered, setHovered] = useState<string | null>(null)
  const active = activeSlug ?? hovered

  const points = useMemo(
    () =>
      sites.map((s) => {
        const n = projectNormalized(s.lon, s.lat)
        return { site: s, x: n.x * SIZE, y: n.y * SIZE }
      }),
    [sites],
  )

  const activePoint = points.find((p) => p.site.slug === active)

  /** Lines from the focused monument to its three nearest neighbours. */
  const links = useMemo(() => {
    if (!activePoint) return []
    return points
      .filter((p) => p.site.slug !== activePoint.site.slug)
      .map((p) => ({
        p,
        km: haversineKm(
          { lat: activePoint.site.lat, lon: activePoint.site.lon },
          { lat: p.site.lat, lon: p.site.lon },
        ),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3)
  }, [activePoint, points])

  return (
    <div className="relative w-full">
      <svg
        viewBox={`-40 -40 ${SIZE + 80} ${SIZE + 80}`}
        className="h-auto w-full"
        role="img"
        aria-label="Map of indexed heritage sites across India"
      >
        <defs>
          <radialGradient id="bv-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
          <pattern id="bv-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M50 0H0V50"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        <rect x="-40" y="-40" width={SIZE + 80} height={SIZE + 80} fill="url(#bv-grid)" opacity="0.5" />
        <ellipse cx={SIZE / 2} cy={SIZE * 0.5} rx={SIZE * 0.52} ry={SIZE * 0.55} fill="url(#bv-glow)" />

        {/* landmass */}
        <path
          d={path}
          fill="var(--color-card)"
          stroke="var(--color-border)"
          strokeWidth="2.2"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.2"
          strokeOpacity="0.55"
          strokeDasharray="7 9"
        />

        {/* proximity web */}
        {activePoint &&
          links.map(({ p, km }) => (
            <g key={p.site.slug}>
              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={p.x}
                y2={p.y}
                stroke="var(--color-accent)"
                strokeWidth="1.4"
                strokeOpacity="0.5"
                strokeDasharray="4 6"
              />
              <text
                x={(activePoint.x + p.x) / 2}
                y={(activePoint.y + p.y) / 2 - 6}
                textAnchor="middle"
                className="font-mono"
                fontSize="15"
                fill="var(--color-accent)"
                fillOpacity="0.85"
              >
                {Math.round(km)} km
              </text>
            </g>
          ))}

        {points.map(({ site, x, y }) => {
          const isActive = site.slug === active
          const dim = Boolean(active) && !isActive
          return (
            <g
              key={site.slug}
              onMouseEnter={() => {
                setHovered(site.slug)
                onHover?.(site.slug)
              }}
              onMouseLeave={() => {
                setHovered(null)
                onHover?.(null)
              }}
              opacity={dim ? 0.4 : 1}
              className="transition-opacity duration-300"
            >
              <Link href={`/site/${site.slug}`} aria-label={`Open ${site.name}`}>
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r="26"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1.4"
                    strokeOpacity="0.6"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 9 : 6.5}
                  fill={isActive ? 'var(--color-accent)' : 'var(--color-primary)'}
                  className="transition-all duration-300"
                />
                {site.unescoRef && (
                  <circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="1.2"
                    strokeOpacity="0.55"
                  />
                )}
                {!compact && (
                  <text
                    x={x + 20}
                    y={y + 5}
                    fontSize={isActive ? 21 : 18}
                    className="font-sans"
                    fill={isActive ? 'var(--color-accent)' : 'var(--color-foreground)'}
                    fillOpacity={isActive ? 1 : 0.75}
                  >
                    {site.name}
                  </text>
                )}
                <circle cx={x} cy={y} r="30" fill="transparent" />
              </Link>
            </g>
          )
        })}
      </svg>

      {activePoint && !compact && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs border border-border bg-background/90 p-3 backdrop-blur-md">
          <p className="label-meta">{activePoint.site.state}</p>
          <p className="mt-1 font-serif text-xl font-light">{activePoint.site.name}</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
            {activePoint.site.heroLine}
          </p>
        </div>
      )}

      <p
        className={cn(
          'mt-3 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/70',
          compact && 'mt-2',
        )}
      >
        Stylised outline for navigation only · Not a survey or authoritative
        boundary representation
      </p>
    </div>
  )
}
