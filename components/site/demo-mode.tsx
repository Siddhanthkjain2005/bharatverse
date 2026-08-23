'use client'

/**
 * Demonstration mode.
 *
 * A fixed twelve-scene run through the strongest capabilities, driven by one
 * key. It exists because a live demonstration is two minutes long and nobody
 * should spend those two minutes hunting for a toggle.
 */

import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DemoPanel = 'FEATURES' | 'ARCHITECTURE' | 'INTERIOR' | 'TIME' | 'COMPARE' | 'CONSERVATION' | 'GUIDE' | 'SOURCES'

export interface DemoScene {
  id: string
  label: string
  caption: string
  hold: number
  apply: {
    mode?: 'ORBIT' | 'WALK'
    timeOfDay?: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT'
    autoOrbit?: boolean
    tour?: boolean
    photoMode?: boolean
    lens?: boolean
    panel?: DemoPanel
    phase?: 'FIRST' | 'LAST' | 'MID'
    spawn?: 'APPROACH' | 'THRESHOLD' | 'CORE'
    hotspot?: 'FIRST' | null
    architecture?: 'CROWN' | null
    guide?: string
  }
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'hero',
    label: 'Hero exterior',
    caption: 'A monument in its landscape — terrain, planting, boundary and light, all generated from the record.',
    hold: 9,
    apply: { mode: 'ORBIT', timeOfDay: 'DUSK', autoOrbit: true, photoMode: false, lens: false, hotspot: null, architecture: null },
  },
  {
    id: 'approach',
    label: 'Walk the approach',
    caption: 'WASD to walk, mouse to look. The visitor starts on the documented approach axis.',
    hold: 12,
    apply: { mode: 'WALK', spawn: 'APPROACH', timeOfDay: 'DUSK' },
  },
  {
    id: 'threshold',
    label: 'Find the entrance',
    caption: 'Walk up to a doorway and the threshold offers itself. Press E to cross it.',
    hold: 10,
    apply: { mode: 'WALK', spawn: 'THRESHOLD' },
  },
  {
    id: 'interior',
    label: 'Inside the monument',
    caption: 'The same world, not a second scene: turn around and the garden you crossed is still there.',
    hold: 12,
    apply: { mode: 'WALK', spawn: 'CORE' },
  },
  {
    id: 'discover',
    label: 'Discover a feature',
    caption: 'Documented features are discoveries in the world, each carrying its evidence grade.',
    hold: 9,
    apply: { mode: 'ORBIT', hotspot: 'FIRST', panel: 'FEATURES', autoOrbit: false },
  },
  {
    id: 'architecture',
    label: 'Architecture inspector',
    caption: 'Every component explained in its own tradition — plinth, cornice, superstructure.',
    hold: 10,
    apply: { mode: 'ORBIT', panel: 'ARCHITECTURE', architecture: 'CROWN', hotspot: null },
  },
  {
    id: 'time-start',
    label: 'Time machine — foundation',
    caption: 'Scrub the century and the geometry rebuilds. Not the caption: the building.',
    hold: 8,
    apply: { mode: 'ORBIT', panel: 'TIME', phase: 'FIRST', architecture: null, autoOrbit: true },
  },
  {
    id: 'time-end',
    label: 'Time machine — complete',
    caption: 'The superstructure rises through the documented phases of construction.',
    hold: 8,
    apply: { mode: 'ORBIT', panel: 'TIME', phase: 'LAST' },
  },
  {
    id: 'lens',
    label: 'Evidence lens',
    caption: 'The differentiator: documented, reconstructed, interpretive and contextual surfaces, told apart.',
    hold: 10,
    apply: { mode: 'ORBIT', lens: true, panel: 'SOURCES', autoOrbit: true },
  },
  {
    id: 'guide',
    label: 'Spatially aware guide',
    caption: 'The guide knows which room the visitor is standing in, and answers only from cited evidence.',
    hold: 14,
    apply: { mode: 'ORBIT', lens: false, panel: 'GUIDE', guide: 'What am I looking at, and how do we know?' },
  },
  {
    id: 'compare',
    label: 'Then and now',
    caption: 'Two phases of the same reconstruction, wiped against each other from one camera.',
    hold: 10,
    apply: { mode: 'ORBIT', panel: 'COMPARE' },
  },
  {
    id: 'photo',
    label: 'Photo mode',
    caption: 'Interface out of the way, cinematic framing, one PNG for the visitor to take home.',
    hold: 12,
    apply: { mode: 'ORBIT', photoMode: true, timeOfDay: 'DUSK', tour: true },
  },
]

export function DemoBar({
  index,
  playing,
  onIndex,
  onPlaying,
  onExit,
  className,
}: {
  index: number
  playing: boolean
  onIndex: (i: number) => void
  onPlaying: (v: boolean) => void
  onExit: () => void
  className?: string
}) {
  const scene = DEMO_SCENES[index]
  return (
    <div
      className={cn(
        'flex w-[min(46rem,94vw)] flex-col gap-2 border border-accent/40 bg-background/90 px-4 py-3 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[0.625rem] tabular-nums text-accent">
            {String(index + 1).padStart(2, '0')}/{DEMO_SCENES.length}
          </span>
          <span className="font-sans text-[0.625rem] uppercase tracking-[0.18em] text-accent">
            {scene.label}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onIndex(Math.max(0, index - 1))}
            aria-label="Previous scene"
            className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onPlaying(!playing)}
            aria-label={playing ? 'Pause the run' : 'Play the run'}
            className="p-1.5 text-accent transition-colors hover:text-foreground"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => onIndex(Math.min(DEMO_SCENES.length - 1, index + 1))}
            aria-label="Next scene"
            className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label="Leave demonstration mode"
            className="ml-1 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </span>
      </div>
      <p className="font-sans text-xs leading-relaxed text-muted-foreground">{scene.caption}</p>
      <div className="flex gap-0.5" aria-hidden>
        {DEMO_SCENES.map((s, i) => (
          <span
            key={s.id}
            className={cn('h-0.5 flex-1', i <= index ? 'bg-accent' : 'bg-border')}
          />
        ))}
      </div>
    </div>
  )
}
