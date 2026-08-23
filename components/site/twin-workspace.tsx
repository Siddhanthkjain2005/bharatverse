'use client'

/**
 * The twin workspace.
 *
 * Owns every piece of viewer state — light, mode, phase, lens, photo mode, the
 * walker's spawn point and the demonstration run — and keeps the 3D scene and the
 * inspector panels reading from the same world model, so selecting a room in the
 * plan and walking into it are the same act.
 */

import { Aperture, Compass, Eye, EyeOff, Film, Footprints, Orbit, Presentation, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EvidenceBadge, ProvenanceChip, SourceList } from '@/components/provenance'
import type { WalkReport } from '@/components/twin/controls/walk-camera'
import { ArrivalCard, useArrival } from '@/components/twin/hud/arrival-card'
import { ControlsCard, useControlsCard } from '@/components/twin/hud/controls-card'
import { EvidenceLegend } from '@/components/twin/hud/evidence-legend'
import { MiniMap } from '@/components/twin/hud/minimap'
import { PhotoModePanel } from '@/components/twin/hud/photo-mode'
import { ContextPrompt, Orientation } from '@/components/twin/hud/walk-hud'
import {
  EMPTY_PROXIMITY,
  TwinScene,
  type Proximity,
  type TimeOfDay,
  type ViewMode,
  type WalkTarget,
} from '@/components/twin/twin-scene'
import type { HeritageSite } from '@/lib/heritage/types'
import { architectureFor } from '@/lib/twin/architecture'
import { shotsFor, tourFor } from '@/lib/twin/cinematic'
import { LIGHT_RIG, TIME_ORDER } from '@/lib/twin/light'
import type { BuildStateKey } from '@/lib/twin/materials'
import { getWorld } from '@/lib/twin/world'
import { interiorIdentityFor, interiorIdentityYaw } from '@/lib/twin/interior-identity'
import { cn } from '@/lib/utils'
import { DEMO_SCENES, DemoBar } from './demo-mode'
import { TwinPanels, type Panel } from './twin-panels'

const TOOL =
  'flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.12em] transition-colors'

export function TwinWorkspace({ site }: { site: HeritageSite }) {
  const world = useMemo(() => getWorld(site), [site])
  const components = useMemo(() => architectureFor(world), [world])
  const shots = useMemo(() => shotsFor(world), [world])
  const tourShots = useMemo(() => tourFor(world, components), [world, components])
  const interiorIdentity = useMemo(() => interiorIdentityFor(world), [world])

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('NOON')
  const [mode, setMode] = useState<ViewMode>('ORBIT')
  const [autoOrbit, setAutoOrbit] = useState(true)
  const [lens, setLens] = useState(false)
  const [photoMode, setPhotoMode] = useState(false)
  const [showMarkers, setShowMarkers] = useState(false)
  const [photoFov, setPhotoFov] = useState(38)
  const [photoShot, setPhotoShot] = useState<string | null>(null)
  const [legend, setLegend] = useState(false)

  const [tourPlaying, setTourPlaying] = useState(false)
  const [tourIndex, setTourIndex] = useState(0)

  const [panel, setPanel] = useState<Panel>('FEATURES')
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null)
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null)
  const [inspectEnabled, setInspectEnabled] = useState(false)
  const [inspectVisible, setInspectVisible] = useState(false)

  const [phaseIndex, setPhaseIndex] = useState(site.timeline.length - 1)
  const [analytical, setAnalytical] = useState(false)

  const [walkTarget, setWalkTarget] = useState<WalkTarget>(() => ({
    ...world.spawnOutside,
    token: `${site.id}:init`,
  }))
  const [prox, setProx] = useState<Proximity>(EMPTY_PROXIMITY)
  const [discovered, setDiscovered] = useState<Set<string>>(() => new Set())
  const [fade, setFade] = useState(false)
  const walkRef = useRef<WalkReport | null>(null)
  const shell = useRef<HTMLDivElement>(null)
  const spawnCount = useRef(0)

  const [demo, setDemo] = useState(false)
  const [demoIndex, setDemoIndex] = useState(0)
  const [demoPlaying, setDemoPlaying] = useState(true)
  const [guideSeed, setGuideSeed] = useState<string | null>(null)

  const walking = mode === 'WALK'
  const controlsCard = useControlsCard(walking)
  const arrival = useArrival(site.id)
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  /**
   * The reveal: the viewer opens out of darkness rather than snapping on, so the
   * first thing the visitor sees is a composed view of the monument settling into
   * its light. One beat, once, on arrival.
   */
  const [curtain, setCurtain] = useState(true)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setCurtain(false))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const phase = site.timeline[phaseIndex] ?? site.timeline[site.timeline.length - 1]
  const buildState = (phase?.twinState ?? 'COMPLETE') as BuildStateKey
  const progress = site.timeline.length > 1 ? (phaseIndex + 1) / site.timeline.length : 1

  const currentSpace = useMemo(
    () => world.spaces.find((s) => s.space.id === prox.spaceId) ?? null,
    [world.spaces, prox.spaceId],
  )
  const nearPortal = useMemo(
    () => world.portals.find((p) => p.id === prox.portalId) ?? null,
    [world.portals, prox.portalId],
  )
  const nearHotspot = useMemo(
    () => site.hotspots.find((h) => h.id === prox.hotspotId) ?? null,
    [site.hotspots, prox.hotspotId],
  )
  const activeHotspot = useMemo(
    () => site.hotspots.find((h) => h.id === activeHotspotId) ?? null,
    [site.hotspots, activeHotspotId],
  )
  const activeComponent = components.find((c) => c.id === activeComponentId) ?? null

  /* ---------------- camera focus ---------------- */

  const photoShotObj = photoShot ? shots.find((s) => s.id === photoShot) : undefined
  const focus = useMemo(() => {
    if (photoMode && photoShotObj) {
      return { position: photoShotObj.position, target: photoShotObj.target, fov: photoFov }
    }
    if (activeComponent) {
      return { position: activeComponent.camera.position, target: activeComponent.camera.target }
    }
    return null
  }, [photoMode, photoShotObj, photoFov, activeComponent])

  /* ---------------- movement ---------------- */

  const teleport = useCallback(
    (x: number, z: number, yaw: number, label: string) => {
      spawnCount.current += 1
      setFade(true)
      setWalkTarget({ x, z, yaw, token: `${label}:${spawnCount.current}` })
      window.setTimeout(() => setFade(false), 260)
    },
    [],
  )

  const startWalk = useCallback(
    (where: 'APPROACH' | 'THRESHOLD' | 'CORE') => {
      setMode('WALK')
      setPhotoMode(false)
      setTourPlaying(false)
      setActiveHotspotId(null)
      setActiveComponentId(null)
      setInspectVisible(false)
      const destination = interiorIdentity?.space ?? world.core
      const destinationPortal = destination
        ? world.portals.find((p) => p.spaceId === destination.space.id)
        : undefined
      if (where === 'APPROACH' || !destination) {
        teleport(world.spawnOutside.x, world.spawnOutside.z, world.spawnOutside.yaw, 'approach')
        return
      }
      if (where === 'THRESHOLD' && destinationPortal) {
        teleport(destinationPortal.outside[0], destinationPortal.outside[1], destinationPortal.yawIn, 'threshold')
        return
      }
      // Ajanta's monolithic stupa fills its compact apse by design. Frame it
      // from the nave threshold so "Interior" reveals the cave composition
      // instead of placing the camera against the stupa drum.
      if (where === 'CORE' && site.slug === 'ajanta-caves' && destinationPortal) {
        teleport(destinationPortal.outside[0], destinationPortal.outside[1], destinationPortal.yawIn, 'ajanta-apse-view')
        return
      }
      const s = world.spawns[destination.space.id]
      teleport(
        s.x,
        s.z,
        interiorIdentityYaw(world, destination.space.id, s.x, s.z, s.yaw),
        'core',
      )
    },
    [world, interiorIdentity, teleport, site.slug],
  )

  const enterSpace = useCallback(
    (spaceId: string) => {
      const s = world.spawns[spaceId]
      if (!s) return
      setMode('WALK')
      setPhotoMode(false)
      setActiveHotspotId(null)
      setActiveComponentId(null)
      setInspectVisible(false)
      teleport(s.x, s.z, interiorIdentityYaw(world, spaceId, s.x, s.z, s.yaw), `space-${spaceId}`)
    },
    [world, teleport],
  )

  const handleInteract = useCallback(() => {
    if (!walking) return
    if (nearPortal && !nearPortal.restricted) {
      const leaving = prox.portalDirection === 'OUT'
      const [x, z] = leaving ? nearPortal.outside : nearPortal.inside
      const yaw = leaving ? nearPortal.yawIn + Math.PI : nearPortal.yawIn
      setActiveHotspotId(null)
      setActiveComponentId(null)
      setInspectVisible(false)
      teleport(x, z, yaw, `portal-${nearPortal.id}-${leaving ? 'out' : 'in'}`)
      return
    }
    if (inspectEnabled && nearHotspot) {
      setActiveHotspotId((current) => {
        const next = current === nearHotspot.id ? null : nearHotspot.id
        setInspectVisible(Boolean(next))
        return next
      })
      setPanel('FEATURES')
      setDiscovered((prev) => {
        if (prev.has(nearHotspot.id)) return prev
        const next = new Set(prev)
        next.add(nearHotspot.id)
        return next
      })
    }
  }, [walking, nearPortal, nearHotspot, prox.portalDirection, teleport, inspectEnabled])

  useEffect(() => {
    if (!walking || !activeHotspot) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInspectVisible(false)
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [walking, activeHotspot])

  const handleProximity = useCallback((p: Proximity) => {
    setProx(p)
    if (p.hotspotId) {
      setDiscovered((prev) => {
        if (prev.has(p.hotspotId!)) return prev
        const next = new Set(prev)
        next.add(p.hotspotId!)
        return next
      })
    }
  }, [])

  const handleWalkReport = useCallback((r: WalkReport) => {
    walkRef.current = r
  }, [])

  /* ---------------- photo capture ---------------- */

  const capture = useCallback(() => {
    const canvas = shell.current?.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) return
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `bharatverse-${site.slug}-${photoShot ?? 'view'}.png`
      a.click()
    } catch {
      /* the browser refused to read the buffer — nothing to hand the visitor */
    }
  }, [site.slug, photoShot])

  /* ---------------- progressive construction ---------------- */

  const animRef = useRef(progress)
  const [animProgress, setAnimProgress] = useState(progress)
  useEffect(() => {
    const from = animRef.current
    const to = progress
    if (Math.abs(to - from) < 0.001) return
    let step = 0
    const steps = 10
    const id = window.setInterval(() => {
      step += 1
      const t = step / steps
      const eased = t * t * (3 - 2 * t)
      const v = from + (to - from) * eased
      animRef.current = v
      setAnimProgress(v)
      if (step >= steps) window.clearInterval(id)
    }, 55)
    return () => window.clearInterval(id)
  }, [progress])

  /* ---------------- demonstration run ---------------- */

  useEffect(() => {
    if (!demo) return
    const scene = DEMO_SCENES[demoIndex]
    if (!scene) return
    const a = scene.apply
    if (a.timeOfDay) setTimeOfDay(a.timeOfDay)
    if (a.autoOrbit !== undefined) setAutoOrbit(a.autoOrbit)
    if (a.lens !== undefined) setLens(a.lens)
    if (a.panel) setPanel(a.panel)
    if (a.architecture === 'CROWN') setActiveComponentId('ac-crown')
    else if (a.architecture === null) setActiveComponentId(null)
    if (a.hotspot === 'FIRST') setActiveHotspotId(site.hotspots[0]?.id ?? null)
    else if (a.hotspot === null) setActiveHotspotId(null)
    if (a.phase)
      setPhaseIndex(
        a.phase === 'FIRST' ? 0 : a.phase === 'LAST' ? site.timeline.length - 1 : Math.floor(site.timeline.length / 2),
      )
    if (a.guide) setGuideSeed(a.guide)
    if (a.mode === 'WALK') {
      startWalk(a.spawn ?? 'APPROACH')
    } else if (a.mode === 'ORBIT') {
      setMode('ORBIT')
    }
    if (a.photoMode !== undefined) {
      setPhotoMode(a.photoMode)
      setPhotoShot(a.photoMode ? 'hero' : null)
    }
    if (a.tour !== undefined) {
      setTourIndex(0)
      setTourPlaying(a.tour)
    }
  }, [demo, demoIndex, site, startWalk])

  useEffect(() => {
    if (!demo || !demoPlaying) return
    const scene = DEMO_SCENES[demoIndex]
    const id = window.setTimeout(() => {
      if (demoIndex + 1 < DEMO_SCENES.length) setDemoIndex(demoIndex + 1)
      else setDemoPlaying(false)
    }, scene.hold * 1000)
    return () => window.clearTimeout(id)
  }, [demo, demoPlaying, demoIndex])

  const guideContext = useMemo(
    () => ({
      spaceId: prox.spaceId,
      hotspotId: activeHotspotId ?? prox.hotspotId,
      phaseId: phase?.id ?? null,
      indoors: prox.indoors,
      label: currentSpace
        ? currentSpace.space.name
        : walking
          ? `${site.name} — grounds`
          : `${site.name} — ${phase?.year ?? ''}`.trim(),
    }),
    [prox, activeHotspotId, phase, currentSpace, walking, site.name],
  )

  const nearbyCount = useMemo(() => {
    const r = walkRef.current
    if (!r) return 0
    return world.anchors.filter(
      (a) => Math.hypot(a.position[0] - r.x, a.position[2] - r.z) < 26,
    ).length
  }, [world.anchors, prox])

  const showArrival =
    arrival.show &&
    mode === 'ORBIT' &&
    !photoMode &&
    !demo &&
    !tourPlaying &&
    !activeHotspotId &&
    !activeComponentId

  return (
    <div className="flex flex-col">
      <div
        ref={shell}
        onPointerDown={arrival.show ? arrival.dismiss : undefined}
        className={cn(
          'relative w-full border-b border-border/70 bg-[#0f0d0b] transition-[height] duration-500',
          walking ? 'h-[88svh] min-h-[34rem]' : photoMode ? 'h-[84svh] min-h-[32rem]' : 'h-[70svh] min-h-[30rem]',
        )}
      >
        <TwinScene
          site={site}
          world={world}
          timeOfDay={timeOfDay}
          mode={mode}
          buildState={buildState}
          progress={animProgress}
          activeHotspotId={activeHotspotId}
          onSelectHotspot={(id) => {
            setActiveHotspotId(id)
            setActiveComponentId(null)
            if (walking && id) setInspectEnabled(true)
            setInspectVisible(Boolean(id))
            if (id) setPanel('FEATURES')
          }}
          autoOrbit={autoOrbit && !photoMode}
          lens={lens || analytical}
          photoMode={photoMode}
          hideMarkers={(walking && !inspectEnabled) || (photoMode && !showMarkers)}
          fovOverride={photoMode ? photoFov : undefined}
          focus={focus}
          highlight={walking ? null : activeComponent?.box ?? null}
          walkTarget={walkTarget}
          tour={{
            playing: tourPlaying,
            index: tourIndex,
            shots: tourShots,
            onAdvance: () => setTourIndex((i) => (i + 1) % tourShots.length),
          }}
          onProximity={handleProximity}
          onInteract={handleInteract}
          onWalkReport={handleWalkReport}
        />

        {/* threshold fade — a beat of darkness rather than a jump cut */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-40 bg-[#0b0908] transition-opacity duration-200',
            fade ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* the reveal — the twin opens out of darkness on arrival */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-50 bg-[#0b0908] transition-opacity duration-[1100ms] ease-out motion-reduce:duration-200',
            curtain ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* arrival — hero view, one invitation, the two keys it takes */}
        {showArrival && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-2/3 bg-gradient-to-t from-[#0b0908]/92 via-[#0b0908]/45 to-transparent"
            />
            <ArrivalCard
              name={site.name}
              place={`${site.city}, ${site.state}`}
              era={site.era}
              heroLine={site.heroLine}
              touch={Boolean(touch)}
              onExplore={() => {
                arrival.dismiss()
                startWalk('APPROACH')
              }}
              onDismiss={arrival.dismiss}
              className="absolute bottom-24 left-4 z-30 md:bottom-28 md:left-6"
            />
          </>
        )}

        {!photoMode && (
          <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-sm md:left-6 md:top-6">
            <div className="pointer-events-auto">
              <ProvenanceChip twin={site.twin} />
            </div>
          </div>
        )}

        {/* right-hand readout */}
        {!photoMode && (
          <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3 md:right-6 md:top-6">
            {walking ? (
              <Orientation
                space={currentSpace}
                indoors={prox.indoors}
                nearbyCount={nearbyCount}
                siteName={site.name}
              />
            ) : (
              <div className="border border-border/80 bg-background/80 px-3 py-2 text-right backdrop-blur-md">
                <p className="font-mono text-[0.6875rem] tabular-nums text-accent">{phase?.year}</p>
                <p className="font-serif text-sm text-foreground">{phase?.title}</p>
              </div>
            )}
            {legend && <EvidenceLegend twin={site.twin} />}
          </div>
        )}

        {/* demonstration run */}
        {demo && (
          <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 md:top-6">
            <DemoBar
              index={demoIndex}
              playing={demoPlaying}
              onIndex={(i) => {
                setDemoIndex(i)
                setDemoPlaying(false)
              }}
              onPlaying={setDemoPlaying}
              onExit={() => {
                setDemo(false)
                setDemoPlaying(false)
                setPhotoMode(false)
                setTourPlaying(false)
                setLens(false)
                setMode('ORBIT')
              }}
            />
          </div>
        )}

        {/* contextual prompt on foot */}
        {walking && !photoMode && (
          <div className="pointer-events-none absolute bottom-24 left-4 z-30 max-w-[min(22rem,calc(100%-2rem))] md:bottom-28 md:left-6">
            <ContextPrompt
              portal={nearPortal}
              direction={prox.portalDirection}
              hotspot={nearPortal || !inspectEnabled ? null : nearHotspot}
              touch={Boolean(touch)}
            />
          </div>
        )}

        {/* Inspect stays inside the twin instead of silently updating a panel below it. */}
        {walking && !photoMode && inspectVisible && activeHotspot && (
          <section
            aria-label={`Inspecting ${activeHotspot.name}`}
            className="absolute right-3 top-36 z-30 max-h-[38vh] w-[min(17rem,calc(100%-1.5rem))] overflow-y-auto border border-accent/45 bg-background/88 p-3.5 shadow-2xl backdrop-blur-xl md:right-6 md:top-40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-sans text-[0.5625rem] uppercase tracking-[0.2em] text-accent">
                  Inspect · {activeHotspot.kind.replace(/_/g, ' ')}
                </span>
                <h2 className="font-serif text-lg font-light leading-tight text-foreground">
                  {activeHotspot.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectVisible(false)}
                aria-label="Hide inspection"
                className="grid size-8 shrink-0 place-items-center border border-border/80 text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2.5 font-sans text-xs leading-relaxed text-muted-foreground">
              {activeHotspot.summary}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <EvidenceBadge level={activeHotspot.evidence} />
              <span className="font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                Esc to hide
              </span>
            </div>
            <div className="mt-3 border-t border-border/70 pt-3">
              <SourceList ids={activeHotspot.sourceIds} compact />
            </div>
          </section>
        )}

        {/* controls card, first time only */}
        {walking && !photoMode && (
          <div className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
            <ControlsCard
              open={controlsCard.open}
              onDismiss={controlsCard.dismiss}
              touch={Boolean(touch)}
            />
          </div>
        )}

        {/* navigation map */}
        {walking && !photoMode && (
          <div className="absolute bottom-24 right-4 z-20 hidden md:bottom-28 md:right-6 md:block">
            <MiniMap
              world={world}
              walkRef={walkRef}
              currentSpaceId={prox.spaceId}
              discovered={discovered}
            />
          </div>
        )}

        {/* photo panel */}
        {photoMode && (
          <div className="absolute right-4 top-4 z-30 md:right-6 md:top-6">
            <PhotoModePanel
              shots={shots}
              activeShot={photoShot}
              onShot={setPhotoShot}
              timeOfDay={timeOfDay}
              onTime={setTimeOfDay}
              fov={photoFov}
              onFov={setPhotoFov}
              showMarkers={showMarkers}
              onShowMarkers={setShowMarkers}
              onCapture={capture}
              onClose={() => {
                setPhotoMode(false)
                setPhotoShot(null)
              }}
            />
          </div>
        )}
        {/* ---------------- viewer controls ---------------- */}
        {!photoMode && (
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 md:bottom-6 md:left-6 md:right-6">
            <div className="flex flex-wrap items-center gap-1.5 border border-border/80 bg-background/80 p-1.5 backdrop-blur-md">
              <span className="px-2 font-sans text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                Light
              </span>
              {TIME_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={timeOfDay === t}
                  onClick={() => setTimeOfDay(t)}
                  className={cn(
                    TOOL,
                    timeOfDay === t ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {LIGHT_RIG[t].label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border border-border/80 bg-background/80 p-1.5 backdrop-blur-md">
              <button
                type="button"
                aria-pressed={mode === 'ORBIT'}
                onClick={() => {
                  setMode('ORBIT')
                  setTourPlaying(false)
                }}
                className={cn(TOOL, mode === 'ORBIT' ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                <Orbit className="size-3.5" />
                Orbit
              </button>
              <button
                type="button"
                aria-pressed={walking}
                onClick={() => startWalk('APPROACH')}
                className={cn(TOOL, walking ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                <Footprints className="size-3.5" />
                Walk
              </button>
              {interiorIdentity && (
                <button
                  type="button"
                  onClick={() => startWalk('CORE')}
                  className={cn(TOOL, 'text-muted-foreground hover:text-foreground')}
                  title={`Walk to ${interiorIdentity.label}`}
                >
                  <Compass className="size-3.5" />
                  Interior
                </button>
              )}
              <span className="mx-0.5 h-5 w-px bg-border/80" aria-hidden />
              <button
                type="button"
                aria-pressed={tourPlaying}
                onClick={() => {
                  setMode('ORBIT')
                  setTourIndex(0)
                  setTourPlaying((v) => !v)
                }}
                className={cn(TOOL, tourPlaying ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                <Film className="size-3.5" />
                Tour
              </button>
              <button
                type="button"
                aria-pressed={lens}
                onClick={() => {
                  setLens((v) => !v)
                  setLegend((v) => !v)
                }}
                className={cn(TOOL, lens ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                <Eye className="size-3.5" />
                Evidence
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoMode(true)
                  setPhotoShot('hero')
                  setMode('ORBIT')
                  setTourPlaying(false)
                }}
                className={cn(TOOL, 'text-muted-foreground hover:text-foreground')}
              >
                <Aperture className="size-3.5" />
                Photo
              </button>
              <button
                type="button"
                aria-pressed={demo}
                onClick={() => {
                  setDemo(true)
                  setDemoIndex(0)
                  setDemoPlaying(true)
                }}
                className={cn(TOOL, demo ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                <Presentation className="size-3.5" />
                Demo
              </button>
              {walking && (
                <button
                  type="button"
                  aria-pressed={inspectEnabled}
                  onClick={() => {
                    setInspectEnabled((enabled) => {
                      const next = !enabled
                      if (!next) {
                        setInspectVisible(false)
                        setActiveHotspotId(null)
                      }
                      return next
                    })
                  }}
                  title={inspectEnabled ? 'Hide feature markers and inspection prompts' : 'Show feature markers and inspection prompts'}
                  className={cn(
                    TOOL,
                    inspectEnabled
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {inspectEnabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  Inspect {inspectEnabled ? 'on' : 'off'}
                </button>
              )}
              {walking && (
                <button
                  type="button"
                  onClick={() => controlsCard.setOpen(true)}
                  className={cn(TOOL, 'text-muted-foreground hover:text-foreground')}
                >
                  Controls
                </button>
              )}
              {!walking && (
                <button
                  type="button"
                  aria-pressed={autoOrbit}
                  onClick={() => setAutoOrbit((v) => !v)}
                  className={cn(TOOL, autoOrbit ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground')}
                >
                  Spin
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <TwinPanels
        site={site}
        panel={panel}
        onPanel={setPanel}
        activeHotspotId={activeHotspotId}
        onSelectHotspot={(id) => {
          setActiveHotspotId(id)
          setActiveComponentId(null)
          if (walking && id) {
            setInspectEnabled(true)
            setInspectVisible(true)
          }
          // Keep an on-foot visitor in the scene: the selected feature opens the
          // same in-view Inspect card as E / a nearby marker. Orbit selections
          // already trigger TwinScene's camera flight without changing mode.
        }}
        components={components}
        activeComponentId={activeComponentId}
        onSelectComponent={(id) => {
          setActiveComponentId(id)
          setActiveHotspotId(null)
          setInspectVisible(false)
          if (id) {
            setMode('ORBIT')
            setAutoOrbit(false)
            setTourPlaying(false)
          }
        }}
        phaseIndex={phaseIndex}
        onPhase={setPhaseIndex}
        onEnterSpace={enterSpace}
        occupiedSpaceId={walking ? prox.spaceId : null}
        analytical={analytical}
        onAnalytical={(v) => {
          setAnalytical(v)
          if (v) setTimeOfDay('NOON')
        }}
        guideContext={guideContext}
        guideSeed={guideSeed}
      />
    </div>
  )
}
