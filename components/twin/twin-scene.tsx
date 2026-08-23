'use client'

/**
 * The twin viewer.
 *
 * One scene, two ways of being in it: an orbit showcase with cinematic presets,
 * and a first-person walk that starts on the approach and continues, without a
 * scene change, all the way into the sanctum.
 */

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeritageSite } from '@/lib/heritage/types'
import type { ArchBox } from '@/lib/twin/architecture'
import { anchorFor } from '@/lib/twin/anchors'
import { orbitFrame, type Shot } from '@/lib/twin/cinematic'
import { LIGHT_RIG, type TimeOfDay } from '@/lib/twin/light'
import type { BuildStateKey } from '@/lib/twin/materials'
import { spaceAt, type WorldModel } from '@/lib/twin/model'
import { ARCH_SPEC } from '@/lib/twin/specs'
import { cn } from '@/lib/utils'
import { CameraFlight, CameraReset, CinematicPlayer, SlowOrbit } from './controls/camera-rigs'
import { MoveStick, TouchActions } from './controls/move-stick'
import { useWalkInput } from './controls/use-walk-input'
import { EYE_HEIGHT, WalkCamera, type WalkReport } from './controls/walk-camera'
import { Sky } from './env/sky'
import { HeritageWorld } from './heritage-world'
import { HighlightBox } from './highlight'
import { HotspotMarker } from './hotspot-marker'
import { SceneLighting } from './lighting'
import { useLowPower, useReducedMotion } from './use-reduced-motion'
import { useTwinMaterials } from './use-twin-materials'

export type { TimeOfDay }
export type ViewMode = 'ORBIT' | 'WALK'

export interface Proximity {
  portalId: string | null
  portalDirection: 'IN' | 'OUT' | null
  hotspotId: string | null
  spaceId: string | null
  indoors: boolean
}

export const EMPTY_PROXIMITY: Proximity = {
  portalId: null,
  portalDirection: null,
  hotspotId: null,
  spaceId: null,
  indoors: false,
}

export interface WalkTarget {
  x: number
  z: number
  yaw: number
  /** Changing the token re-spawns the walker. */
  token: string
}

export interface TwinSceneProps {
  site: HeritageSite
  world: WorldModel
  timeOfDay: TimeOfDay
  mode: ViewMode
  buildState: BuildStateKey
  progress: number
  activeHotspotId: string | null
  onSelectHotspot: (id: string | null) => void
  autoOrbit: boolean
  lens: boolean
  photoMode: boolean
  hideMarkers: boolean
  fovOverride?: number
  focus: { position: [number, number, number]; target: [number, number, number]; fov?: number } | null
  highlight: ArchBox | null
  walkTarget: WalkTarget
  tour: { playing: boolean; index: number; shots: Shot[]; onAdvance: () => void }
  onProximity: (p: Proximity) => void
  onInteract: () => void
  onWalkReport?: (r: WalkReport) => void
  className?: string
}

function Exposure({ value }: { value: number }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = value
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = true
    gl.shadowMap.autoUpdate = true
  }, [gl, value])
  return null
}

/** Watches the interact counter without re-subscribing every frame. */
function InteractWatch({
  input,
  onInteract,
}: {
  input: React.RefObject<{ interact: number }>
  onInteract: () => void
}) {
  const seen = useRef(0)
  useFrame(() => {
    const n = input.current?.interact ?? 0
    if (n !== seen.current) {
      seen.current = n
      onInteract()
    }
  })
  return null
}

export function TwinScene(props: TwinSceneProps) {
  const {
    site, world, timeOfDay, mode, buildState, progress,
    activeHotspotId, onSelectHotspot, autoOrbit, lens, photoMode, hideMarkers,
    focus, highlight, walkTarget, tour, onProximity, onInteract, onWalkReport,
    fovOverride, className,
  } = props

  const rig = LIGHT_RIG[timeOfDay]
  const spec = ARCH_SPEC[site.twin.archetype]
  const mats = useTwinMaterials(site, buildState, lens)
  const reduced = useReducedMotion()
  const lowPower = useLowPower()
  const shell = useRef<HTMLDivElement>(null)
  const controls = useRef<any>(null)
  const walking = mode === 'WALK'
  const frame = useMemo(() => orbitFrame(world), [world])

  const { input, locked, touched, requestLock, setYaw } = useWalkInput(walking, shell, walkTarget.yaw)

  /**
   * A spawn decides which way the visitor is facing, and the look direction lives
   * in the input state — the camera eases towards it every frame. Without this the
   * camera would face the doorway for one frame and then swing back to whatever
   * the visitor had been looking at before they crossed it.
   */
  useEffect(() => {
    setYaw(walkTarget.yaw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkTarget.token])


  const [near, setNear] = useState<Proximity>(EMPTY_PROXIMITY)
  const nearRef = useRef<Proximity>(EMPTY_PROXIMITY)

  const handleWalk = useCallback(
    (r: WalkReport) => {
      onWalkReport?.(r)
      const space = spaceAt(world, r.x, r.z)
      let portalId: string | null = null
      let dir: Proximity['portalDirection'] = null
      let best = Infinity
      for (const p of world.portals) {
        const d = Math.hypot(p.position[0] - r.x, p.position[2] - r.z)
        if (d > p.radius || d > best) continue
        best = d
        portalId = p.id
        dir = space?.space.id === p.spaceId ? 'OUT' : 'IN'
      }
      let hotspotId: string | null = null
      let hs = 14
      for (const a of world.anchors) {
        // Floor-bound discoveries belong to a particular room. Do not let an
        // exterior object advertise itself through several metres of masonry.
        if (a.onFloor && a.spaceId && a.spaceId !== space?.space.id) continue
        if (space?.roofed && a.onFloor && !a.spaceId) continue
        const d = Math.hypot(a.position[0] - r.x, a.position[2] - r.z)
        if (d < hs) {
          hs = d
          hotspotId = a.id
        }
      }
      const next: Proximity = {
        portalId,
        portalDirection: dir,
        hotspotId,
        spaceId: space?.space.id ?? null,
        indoors: Boolean(space?.roofed),
      }
      const prev = nearRef.current
      if (
        prev.portalId !== next.portalId ||
        prev.portalDirection !== next.portalDirection ||
        prev.hotspotId !== next.hotspotId ||
        prev.spaceId !== next.spaceId ||
        prev.indoors !== next.indoors
      ) {
        nearRef.current = next
        setNear(next)
        onProximity(next)
      }
    },
    [world, onProximity, onWalkReport],
  )

  useEffect(() => {
    if (walking) return
    nearRef.current = EMPTY_PROXIMITY
    setNear(EMPTY_PROXIMITY)
    onProximity(EMPTY_PROXIMITY)
  }, [walking, onProximity])

  const baseFov = fovOverride ?? (walking ? 70 : 40)
  const activeAnchor = anchorFor(world.anchors, activeHotspotId)

  const flightPos = useMemo(
    () => new THREE.Vector3(...(focus?.position ?? activeAnchor?.camera.position ?? frame.camera)),
    [focus, activeAnchor, frame.camera],
  )
  const flightTarget = useMemo(
    () => new THREE.Vector3(...(focus?.target ?? activeAnchor?.camera.target ?? frame.target)),
    [focus, activeAnchor, frame.target],
  )

  const [flying, setFlying] = useState(false)
  useEffect(() => {
    if (walking || tour.playing) {
      setFlying(false)
      return
    }
    setFlying(true)
    const t = setTimeout(() => setFlying(false), focus ? 2600 : 1600)
    return () => clearTimeout(t)
  }, [activeHotspotId, focus, site.id, walking, tour.playing])

  return (
    <div
      ref={shell}
      onPointerDown={() => {
        if (walking && !locked) requestLock()
      }}
      className={cn(
        'relative h-full w-full',
        walking && 'touch-none select-none',
        walking && locked && 'cursor-none',
        className,
      )}
    >
      <Canvas
        // PCF: three deprecates the soft variant, and it is what it falls back to.
        shadows="percentage"
        // Keep the render buffer stable during motion. Repeated pixel-ratio
        // changes were visible as whole-scene blinking on detailed stonework.
        dpr={lowPower ? 1.1 : photoMode ? 1.75 : 1.5}
        gl={{
          antialias: !lowPower,
          powerPreference: 'high-performance',
          precision: lowPower ? 'mediump' : 'highp',
          // Photo mode reads the canvas back as a PNG, which needs the buffer kept.
          preserveDrawingBuffer: photoMode,
        }}
        camera={{ position: frame.camera, fov: baseFov, near: 0.12, far: world.ground * 6 }}
      >
        <Exposure value={rig.exposure} />
        <color attach="background" args={[rig.fog]} />
        <fogExp2 attach="fog" args={[rig.fog, rig.fogDensity]} />
        <Sky rig={rig} radius={world.ground} />
        <SceneLighting rig={rig} world={world} quality={lowPower ? 0.45 : 1} />

        <Suspense fallback={null}>
          <HeritageWorld
            world={world}
            spec={spec}
            mats={mats}
            rig={rig}
            progress={progress}
            state={buildState}
            reducedMotion={reduced}
            quality={lowPower ? 0.65 : 1.08}
            showAtmosphere={!lowPower}
          />

          {highlight && <HighlightBox box={highlight} color={site.palette.accent} />}

          {!hideMarkers &&
            site.hotspots.map((h, i) => {
              const a = anchorFor(world.anchors, h.id)
              if (!a) return null
              return (
                <HotspotMarker
                  key={h.id}
                  hotspot={h}
                  position={a.position}
                  index={i}
                  active={h.id === activeHotspotId}
                  dimmed={Boolean(activeHotspotId)}
                  walking={walking}
                  near={walking && near.hotspotId === h.id}
                  onSelect={() => onSelectHotspot(h.id === activeHotspotId ? null : h.id)}
                />
              )
            })}

        </Suspense>

        <OrbitControls
          ref={controls}
          makeDefault
          enabled={!walking && !tour.playing}
          enableDamping
          dampingFactor={0.07}
          target={frame.target}
          minDistance={frame.minDistance}
          maxDistance={frame.maxDistance}
          maxPolarAngle={Math.PI / 2.04}
        />
        <CameraFlight
          position={flightPos}
          target={flightTarget}
          fov={focus?.fov}
          controls={controls}
          enabled={flying && !walking && !tour.playing}
        />
        <SlowOrbit enabled={autoOrbit && !flying && !walking && !tour.playing} controls={controls} />
        {!walking && !tour.playing && (
          <CameraReset
            position={frame.camera}
            target={frame.target}
            fov={baseFov}
            controls={controls}
            token={`${site.id}:${mode}:${photoMode}`}
          />
        )}
        <CinematicPlayer
          shots={tour.shots}
          index={tour.index}
          playing={tour.playing}
          controls={controls}
          onAdvance={tour.onAdvance}
        />

        <WalkCamera
          input={input}
          active={walking}
          world={world}
          spawn={walkTarget}
          spawnToken={walkTarget.token}
          baseFov={baseFov}
          motion={reduced ? 0 : 1}
          onMove={handleWalk}
        />
        <InteractWatch input={input} onInteract={onInteract} />
      </Canvas>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_46%,rgba(7,5,4,0.24)_100%)] mix-blend-multiply"
      />

      {walking && !photoMode && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <span className={cn('block size-1.5 rounded-full transition-colors', near.portalId || (!hideMarkers && near.hotspotId) ? 'bg-accent shadow-[0_0_12px_var(--accent)]' : 'bg-accent/60')} />
            <span className="absolute left-1/2 top-1/2 block size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/25" />
          </div>

          {touched && (
            <>
              <MoveStick input={input} className="absolute bottom-24 left-5 z-30 md:hidden" />
              <TouchActions
                input={input}
                onInteract={onInteract}
                interactLabel={near.portalId ? (near.portalDirection === 'OUT' ? 'Leave' : 'Enter') : !hideMarkers && near.hotspotId ? 'Inspect' : null}
                className="absolute bottom-24 right-5 z-30 md:hidden"
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
