'use client'

/**
 * Discovery markers.
 *
 * In orbit these are numbered pins that collapse to a numeral so dense clusters
 * stay readable. On foot they behave like discoveries: a quiet beacon at
 * distance, a prompt when the visitor is close enough to inspect.
 */

import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { EvidenceBadge } from '@/components/provenance'
import type { Hotspot } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

export function HotspotMarker({
  hotspot,
  position,
  index,
  active,
  dimmed,
  walking,
  near,
  onSelect,
}: {
  hotspot: Hotspot
  /** Resolved anchor on the geometry the record names; see `lib/twin/anchors`. */
  position: [number, number, number]
  index: number
  active: boolean
  dimmed: boolean
  walking: boolean
  near: boolean
  onSelect: () => void
}) {
  return (
    <group position={position} scale={active || near ? 1.1 : 1}>
      {/* in-world beacon so a discovery is visible before its label is */}
      <mesh>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshBasicMaterial color={active || near ? '#ffffff' : '#f2c98a'} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.86, 24]} />
        <meshBasicMaterial color="#f2c98a" transparent opacity={0.4} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <Html center distanceFactor={walking ? 26 : 44} zIndexRange={[24, 0]} occlude={false}>
        {walking ? (
          near && !active ? (
            <button
              type="button"
              onClick={onSelect}
              aria-label={`Inspect ${hotspot.name}`}
              className="flex max-w-[min(17rem,66vw)] -translate-y-5 items-center gap-2 rounded-full border border-accent/45 bg-background/84 px-2.5 py-1.5 text-left backdrop-blur-md transition-colors hover:border-accent hover:bg-background/95"
            >
              <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-accent">E · Inspect</span>
              <span className="truncate font-serif text-xs font-light text-foreground">
                {hotspot.name}
              </span>
            </button>
          ) : (
            <span className="block size-2 -translate-y-3 rounded-full bg-accent/70 shadow-[0_0_14px_var(--accent)]" />
          )
        ) : (
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Focus feature: ${hotspot.name}`}
            className={cn(
              'group relative flex items-center gap-2 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium backdrop-blur-md transition-all duration-300',
              active
                ? 'z-10 border-accent bg-accent text-accent-foreground shadow-[0_0_28px_-4px_var(--accent)]'
                : 'border-accent/45 bg-background/70 text-foreground hover:z-10 hover:border-accent hover:bg-background/90',
              dimmed && !active && 'opacity-35',
            )}
          >
            <span
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded-full font-mono text-[9px] tabular-nums',
                active ? 'bg-accent-foreground/15' : 'bg-accent/20 text-accent',
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                'overflow-hidden truncate transition-all duration-300',
                active
                  ? 'max-w-[14ch] pr-0.5 opacity-100'
                  : 'max-w-0 opacity-0 group-hover:max-w-[14ch] group-hover:pr-0.5 group-hover:opacity-100',
              )}
            >
              {hotspot.name}
            </span>
          </button>
        )}
      </Html>
    </group>
  )
}

/** In-world threshold prompt at a portal. */
export function PortalMarker({
  position,
  label,
  detail,
  restricted,
  evidence,
  active,
}: {
  position: [number, number, number]
  label: string
  detail: string
  restricted: boolean
  evidence: Parameters<typeof EvidenceBadge>[0]['level']
  active: boolean
}) {
  return (
    <group position={[position[0], position[1] + 2.6, position[2]]}>
      <Html center distanceFactor={24} zIndexRange={[22, 0]}>
        <div
          className={cn(
            'w-[min(21rem,74vw)] border px-3 py-2 text-left backdrop-blur-md transition-opacity duration-300',
            active
              ? 'border-accent/60 bg-background/90 opacity-100'
              : 'border-border/60 bg-background/60 opacity-60',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-sans text-[0.5625rem] uppercase tracking-[0.2em] text-accent">{detail}</p>
            <EvidenceBadge level={evidence} />
          </div>
          <p className="mt-0.5 font-serif text-sm font-light leading-tight text-foreground">{label}</p>
          <p className="mt-1 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-accent/90">
            {restricted ? 'Closed to visitors — threshold only' : active ? 'Press E to enter' : 'Walk closer to enter'}
          </p>
        </div>
      </Html>
    </group>
  )
}
