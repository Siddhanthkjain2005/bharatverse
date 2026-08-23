'use client'

/**
 * Photo mode.
 *
 * Hides the interface, offers the cinematic presets, and writes a PNG. Tourists
 * want a photograph; a jury wants to see that the viewer can produce one.
 */

import { Camera, X } from 'lucide-react'
import type { Shot } from '@/lib/twin/cinematic'
import type { TimeOfDay } from '@/lib/twin/light'
import { LIGHT_RIG, TIME_ORDER } from '@/lib/twin/light'
import { cn } from '@/lib/utils'

export function PhotoModePanel({
  shots,
  activeShot,
  onShot,
  timeOfDay,
  onTime,
  fov,
  onFov,
  showMarkers,
  onShowMarkers,
  onCapture,
  onClose,
  className,
}: {
  shots: Shot[]
  activeShot: string | null
  onShot: (id: string) => void
  timeOfDay: TimeOfDay
  onTime: (t: TimeOfDay) => void
  fov: number
  onFov: (v: number) => void
  showMarkers: boolean
  onShowMarkers: (v: boolean) => void
  onCapture: () => void
  onClose: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-[min(21rem,90vw)] border border-border/70 bg-background/88 p-4 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-accent">
          Photo mode
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Leave photo mode"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <span className="label-meta">Framing</span>
        <div className="grid grid-cols-3 gap-1">
          {shots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onShot(s.id)}
              aria-pressed={activeShot === s.id}
              className={cn(
                'border px-1.5 py-1.5 font-sans text-[0.5625rem] uppercase tracking-[0.1em] transition-colors',
                activeShot === s.id
                  ? 'border-accent bg-accent/12 text-accent'
                  : 'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <span className="label-meta">Light</span>
        <div className="grid grid-cols-4 gap-1">
          {TIME_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTime(t)}
              aria-pressed={timeOfDay === t}
              className={cn(
                'border px-1.5 py-1.5 font-sans text-[0.5625rem] uppercase tracking-[0.1em] transition-colors',
                timeOfDay === t
                  ? 'border-accent bg-accent/12 text-accent'
                  : 'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {LIGHT_RIG[t].label}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="label-meta">
          Field of view · <span className="font-mono tabular-nums text-accent">{fov}°</span>
        </span>
        <input
          type="range"
          min={20}
          max={80}
          step={1}
          value={fov}
          onChange={(e) => onFov(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <label className="mt-3 flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={showMarkers}
          onChange={(e) => onShowMarkers(e.target.checked)}
          className="size-3.5 accent-[var(--accent)]"
        />
        <span className="font-sans text-xs text-muted-foreground">Keep feature markers</span>
      </label>

      <button
        type="button"
        onClick={onCapture}
        className="mt-4 flex w-full items-center justify-center gap-2 border border-accent bg-accent/12 px-3 py-2.5 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/20"
      >
        <Camera className="size-3.5" />
        Capture PNG
      </button>
      <p className="mt-2 font-sans text-[0.625rem] leading-relaxed text-muted-foreground/70">
        Saved images carry the same caveat as the viewer: this is a reference
        reconstruction, not a photograph of the monument.
      </p>
    </div>
  )
}
