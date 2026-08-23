'use client'

import { useEffect, useState } from 'react'
import { EvidenceBadge, SourceList } from '@/components/provenance'
import type { HeritageSite, InteriorSpace } from '@/lib/heritage/types'
import { INTERIOR_LABEL, spacePath } from '@/lib/heritage/query'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<InteriorSpace['kind'], string> = {
  ENTRANCE: 'Entrance',
  COURTYARD: 'Courtyard',
  HALL: 'Hall',
  SANCTUM: 'Sanctum',
  GALLERY: 'Gallery',
  CHAMBER: 'Chamber',
  TERRACE: 'Terrace',
}

/**
 * Plan labels are centred inside their room, so a name wider than the room
 * spills over the neighbouring walls. Budget by the room's own width: fall back
 * to the space kind, then to nothing rather than clipping across the plan.
 * fontSize 3 in a 100-unit viewBox is ~1.6 units per character.
 */
function fitLabel(name: string, kind: string, width: number): string {
  const budget = Math.floor((width - 3) / 1.6)
  if (name.length <= budget) return name
  if (kind.length <= budget) return kind
  return ''
}

export function InteriorNavigator({
  site,
  onEnterSpace,
  /** Room the walker is currently standing in, mirrored onto the plan. */
  occupiedId = null,
}: {
  site: HeritageSite
  onEnterSpace?: (spaceId: string) => void
  occupiedId?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    site.spaces[0]?.id ?? null,
  )
  // Follow the walker when they enter a room, but keep a deliberate plan click
  // selected long enough for its "Walk into this space" action to be usable.
  useEffect(() => {
    if (occupiedId) setSelectedId(occupiedId)
  }, [occupiedId])
  const activeId = selectedId
  const setActiveId = setSelectedId
  const active = site.spaces.find((s) => s.id === activeId) ?? null
  const path = active ? spacePath(site, active.id) : []

  if (site.spaces.length === 0) {
    return (
      <div className="border border-border/70 bg-card/40 p-6">
        <p className="font-serif text-lg text-foreground">
          The interior of this monument is not represented.
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
          {INTERIOR_LABEL[site.twin.interiorLevel]}. Rather than invent rooms, the
          record stays silent about spaces it cannot document.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-px border border-border/70 bg-border/70 lg:grid lg:grid-cols-[1fr_1fr]">
      {/* ---- floor plan ---- */}
      <div className="flex flex-col gap-4 bg-background p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="label-meta">Floor plan · schematic</span>
          <span className="font-mono text-[0.625rem] text-muted-foreground">
            {INTERIOR_LABEL[site.twin.interiorLevel].split(' — ')[0]}
          </span>
        </div>

        <svg
          viewBox="0 0 100 100"
          className="h-auto w-full border border-border/60 bg-[#141210]"
          role="group"
          aria-label={`Schematic floor plan of ${site.name}`}
        >
          {/* grid */}
          <defs>
            <pattern id="plan-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M10 0H0V10"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.3"
                opacity="0.5"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#plan-grid)" />

          {site.spaces.map((space) => {
            const isActive = space.id === activeId
            const onPath = path.some((p) => p.id === space.id)
            return (
              <g key={space.id}>
                <rect
                  x={space.plan.x * 100}
                  y={space.plan.y * 100}
                  width={space.plan.w * 100}
                  height={space.plan.h * 100}
                  className="cursor-pointer transition-all"
                  fill={
                    isActive
                      ? 'var(--accent)'
                      : onPath
                        ? 'var(--primary)'
                        : 'var(--card)'
                  }
                  fillOpacity={isActive ? 0.3 : onPath ? 0.16 : 0.7}
                  stroke={isActive ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={isActive ? 0.9 : 0.5}
                  onClick={() => setActiveId(space.id)}
                  role="button"
                  aria-label={space.name}
                  aria-pressed={isActive}
                  tabIndex={0}
                />
                <text
                  x={space.plan.x * 100 + (space.plan.w * 100) / 2}
                  y={space.plan.y * 100 + (space.plan.h * 100) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  fill={isActive ? 'var(--accent)' : 'var(--muted-foreground)'}
                  style={{ fontSize: 3, letterSpacing: 0.2 }}
                >
                  {fitLabel(space.name, KIND_LABEL[space.kind], space.plan.w * 100)}
                </text>
                {occupiedId === space.id && (
                  <circle
                    cx={space.plan.x * 100 + (space.plan.w * 100) / 2}
                    cy={space.plan.y * 100 + space.plan.h * 100 - 3}
                    r={1.4}
                    fill="var(--accent)"
                    className="pointer-events-none"
                  >
                    <animate
                      attributeName="r"
                      values="1.2;2.2;1.2"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>

        <p className="font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/70">
          Schematic layout for navigation only. Proportions are indicative and must
          not be used as measured drawings.
        </p>
      </div>

      {/* ---- space detail ---- */}
      <div className="flex flex-col gap-5 bg-background p-6">
        {/* breadcrumb through the room graph */}
        <nav aria-label="Route through the interior" className="flex flex-wrap items-center gap-1.5">
          {path.map((node, i) => (
            <span key={node.id} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="font-mono text-[0.625rem] text-border">
                  ›
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveId(node.id)}
                className={cn(
                  'font-sans text-[0.6875rem] uppercase tracking-[0.12em] transition-colors',
                  i === path.length - 1
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {node.name}
              </button>
            </span>
          ))}
        </nav>

        {active && (
          <>
            <div className="flex flex-col gap-2">
              <span className="label-meta">{KIND_LABEL[active.kind]}</span>
              <h3 className="font-serif text-2xl font-light leading-tight text-foreground">
                {active.name}
              </h3>
            </div>

            {onEnterSpace && (
              <button
                type="button"
                onClick={() => onEnterSpace(active.id)}
                className="flex items-center justify-between gap-3 border border-accent/40 bg-accent/10 px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent/20"
              >
                <span className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent">
                  {occupiedId === active.id ? 'You are standing here' : 'Walk into this space'}
                </span>
                <span aria-hidden className="font-mono text-xs text-accent">
                  →
                </span>
              </button>
            )}

            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              {active.narrative}
            </p>

            <EvidenceBadge level={active.evidence} className="self-start" />

            <div className="flex flex-col gap-1.5 border-t border-border/70 pt-4">
              <span className="label-meta">Accessibility</span>
              <p className="font-sans text-sm text-foreground/90">
                {active.accessibility ?? (
                  <span className="italic text-muted-foreground/80">
                    Information not yet verified.
                  </span>
                )}
              </p>
            </div>

            {/* adjacent spaces */}
            <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
              <span className="label-meta">Connected spaces</span>
              <ul className="flex flex-wrap gap-1.5">
                {site.spaces
                  .filter(
                    (s) =>
                      s.id !== active.id &&
                      (s.parentId === active.id || s.id === active.parentId),
                  )
                  .map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className="border border-border/70 px-2.5 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="border-t border-border/70 pt-4">
              <SourceList ids={active.sourceIds} compact />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
