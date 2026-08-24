'use client'

/**
 * The crown over the monument core.
 *
 * Whatever the documented plan produced as a core footprint, the crown is
 * generated to fit it — so the same code gives a Mughal dome over a square
 * chamber and a Kalinga deul over a rectangular one, and the time machine can
 * build either one up or take it down.
 *
 * Red Fort:
 * The Red Fort is a fortified Mughal palace complex. Its principal roofline
 * must remain broad and low, with flat parapets and small chhatri kiosks.
 * It must never inherit a temple-style stepped crown.
 */

import type * as THREE from 'three'

import { UNIT_BOX, box, cylinder, sphere } from '@/lib/twin/geometry'

import type { BuildStateKey } from '@/lib/twin/materials'

import type { WorldModel, WorldSpace } from '@/lib/twin/model'

import { Rand } from '@/lib/twin/rng'

import type { ArchSpec } from '@/lib/twin/specs'

import { Parapet } from '../detail/bands'

import { Chattri, OnionDome, TieredRoof } from '../detail/crowns'

import { CurvedSpire, MinarShaft } from '../detail/spires'

import { InstancedSet, type Inst } from '../detail/instanced'

import type { TwinMaterials } from '../use-twin-materials'

export function Crown({
  world,
  core,
  spec,
  mats,
  progress,
  state,
}: {
  world: WorldModel
  core: WorldSpace
  spec: ArchSpec
  mats: TwinMaterials
  progress: number
  state: BuildStateKey
}) {
  const { m, pick } = mats

  const cls = 'RECONSTRUCTED' as const

  const stone = pick(m.stone, cls)
  const dark = pick(m.dark, cls)
  const trim = pick(m.trim, 'INTERPRETIVE')

  /** Gilded finial metal. Everything else on a dome is masonry. */
  const metal = pick(m.metal, 'INTERPRETIVE')

  const { cx, cz, w, d } = core.rect

  const top = core.floorY + core.wallH + 0.9

  const span = Math.min(w, d) + spec.wallT * 2

  const ruined = state === 'DAMAGED'

  const t = Math.min(
    1,
    Math.max(0, (progress - 0.35) / 0.55),
  )

  /*
   * ============================================================
   * RED FORT OVERRIDE
   * ============================================================
   *
   * Do this by site slug rather than relying only on the archetype.
   *
   * This is intentional. If a future data change accidentally assigns the
   * Red Fort another crown type, the Red Fort can still never become a
   * shikhara, vimana, ratha or minaret.
   *
   * The visual language here is:
   *
   *   - broad flat roof
   *   - low parapet
   *   - small Mughal chhatris
   *   - no central tower
   *   - no pyramidal tiers
   *
   * The larger fortification walls and bastions are generated elsewhere.
   */
  if (world.site.slug === 'red-fort') {
    if (t <= 0.02) return null

    const roofW = w + spec.wallT * 2
    const roofD = d + spec.wallT * 2

    /*
     * Keep the kiosks small relative to the building. The old implementation
     * used the same scale logic as the monument crown system, which could make
     * the roofline read like a miniature temple.
     */
    const radius = Math.max(
      0.55,
      Math.min(w, d) * 0.055,
    )

    const height = Math.max(
      0.9,
      radius * 1.25,
    )

    /*
     * A broad parapet is the primary roofline. There is deliberately no
     * TieredRoof, CurvedSpire or OnionDome in this branch.
     */
    const chhatriCount = Math.max(
      3,
      Math.min(7, Math.round(w / 5.5)),
    )

    return (
      <group>
        <Parapet
          cx={cx}
          cz={cz}
          w={roofW}
          d={roofD}
          y={top}
          material={stone}
          unit={0.9}
          h={0.8}
        />

        {/*
         * Front roofline kiosks.
         *
         * These are intentionally low and evenly spaced rather than forming
         * a tall central crown.
         */}
        {Array.from({ length: chhatriCount }).map((_, i) => {
          const x =
            cx -
            w / 2 +
            (w * (i + 0.5)) / chhatriCount

          return (
            <Chattri
              key={`rf-front-${i}`}
              radius={radius}
              height={height}
              position={[
                x,
                top + 0.55,
                cz - d / 2 - spec.wallT * 0.35,
              ]}
              material={stone}
              trim={trim}
              metal={metal}
            />
          )
        })}

        {/*
         * Rear roofline kiosks. These are slightly quieter than the front
         * edge but keep the silhouette coherent from orbit view.
         */}
        {Array.from({ length: chhatriCount }).map((_, i) => {
          const x =
            cx -
            w / 2 +
            (w * (i + 0.5)) / chhatriCount

          return (
            <Chattri
              key={`rf-rear-${i}`}
              radius={radius * 0.92}
              height={height * 0.92}
              position={[
                x,
                top + 0.5,
                cz + d / 2 + spec.wallT * 0.35,
              ]}
              material={stone}
              trim={trim}
              metal={metal}
            />
          )
        })}

        {/*
         * Corner chhatris give the roofline a distinctly Mughal pavilion
         * rhythm without creating a single dominant tower.
         */}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <Chattri
            key={`rf-corner-${i}`}
            radius={radius * 1.18}
            height={height * 1.12}
            position={[
              cx +
                sx *
                  (w / 2 +
                    spec.wallT -
                    radius * 1.15),
              top + 0.55,
              cz +
                sz *
                  (d / 2 +
                    spec.wallT -
                    radius * 1.15),
            ]}
            material={stone}
            trim={trim}
            metal={metal}
          />
        ))}
      </group>
    )
  }

  /*
   * Rock-cut architecture has no built crown.
   */
  if (spec.crown === 'ROCK') {
    return null
  }

  /*
   * Mughal / Timurid onion dome.
   */
  if (spec.crown === 'ONION_DOME') {
    if (t <= 0.02) return null

    const r = span * 0.47

    /*
     * A dome that springs at full radius needs a drum tall enough to read as
     * one.
     */
    const drumH = Math.max(
      3.4,
      r * 0.62,
    )

    return (
      <group>
        <Parapet
          cx={cx}
          cz={cz}
          w={w + spec.wallT * 2}
          d={d + spec.wallT * 2}
          y={top}
          material={stone}
          unit={0.85}
          h={0.95}
        />

        <mesh
          position={[
            cx,
            top + drumH / 2,
            cz,
          ]}
          geometry={cylinder(
            r,
            r * 1.04,
            drumH,
            48,
            m.tile,
          )}
          material={stone}
          castShadow
          receiveShadow
        />

        {/*
         * The dome is generated about its own axis, so it has to be carried to
         * the core's centre.
         */}
        <group
          position={[
            cx,
            0,
            cz,
          ]}
        >
          <OnionDome
            radius={r}
            y={top + drumH}
            material={stone}
            trim={dark}
            metal={metal}
            petals={26}
          />
        </group>

        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <Chattri
            key={i}
            radius={span * 0.13}
            height={span * 0.16}
            position={[
              cx +
                sx *
                  (w / 2 +
                    spec.wallT -
                    span * 0.12),
              top + 0.6,
              cz +
                sz *
                  (d / 2 +
                    spec.wallT -
                    span * 0.12),
            ]}
            material={stone}
            trim={dark}
            metal={metal}
          />
        ))}
      </group>
    )
  }

  /*
   * Nagara / curvilinear shikhara.
   */
  if (spec.crown === 'SHIKHARA') {
    return (
      <CurvedSpire
        cx={cx}
        cz={cz}
        baseW={w + spec.wallT * 1.6}
        baseD={d + spec.wallT * 1.6}
        y={top}
        height={span * 2.3}
        material={stone}
        dark={dark}
        trim={trim}
        power={0.66}
        rings={44}
        urushringa={t > 0.75 ? 4 : 0}
        progress={t}
      />
    )
  }

  /*
   * Kalinga deul.
   */
  if (spec.crown === 'DEUL') {
    const height =
      span *
      (ruined ? 0.55 : 1.7)

    return (
      <>
        <CurvedSpire
          cx={cx}
          cz={cz}
          baseW={w + spec.wallT * 1.6}
          baseD={d + spec.wallT * 1.6}
          y={top}
          height={height}
          material={stone}
          dark={dark}
          trim={trim}
          power={0.5}
          rings={ruined ? 14 : 46}
          rathas
          progress={ruined ? 1 : t}
        />

        {ruined && (
          <Rubble
            cx={cx}
            cz={cz}
            w={w}
            d={d}
            y={core.floorY}
            seed={`${world.seed}:rubble`}
            material={stone}
          />
        )}
      </>
    )
  }

  /*
   * Dravidian vimana.
   */
  if (spec.crown === 'VIMANA') {
    const tiers = 13

    return (
      <TieredRoof
        cx={cx}
        cz={cz}
        w={w + spec.wallT * 2}
        d={d + spec.wallT * 2}
        y={top}
        tiers={tiers}
        tierH={span * 0.115}
        taper={0.905}
        material={stone}
        dark={dark}
        shrine
        visible={Math.max(
          1,
          Math.round(tiers * t),
        )}
      />
    )
  }

  /*
   * Temple chariot / ratha superstructure.
   */
  if (spec.crown === 'RATHA') {
    const tiers = 6

    return (
      <TieredRoof
        cx={cx}
        cz={cz}
        w={w + spec.wallT * 2}
        d={d + spec.wallT * 2}
        y={top}
        tiers={tiers}
        tierH={span * 0.16}
        taper={0.84}
        material={stone}
        dark={dark}
        visible={Math.max(
          2,
          Math.round(tiers * t),
        )}
      />
    )
  }

  /*
   * Generic Mughal audience-hall roofline.
   *
   * This remains available for any future site explicitly assigned the
   * CHHATRI_ROW crown. Red Fort is handled above by the stronger site-specific
   * override.
   */
  if (spec.crown === 'CHHATRI_ROW') {
    if (t <= 0.02) return null

    const r = Math.min(w, d) * 0.075
    const h = r * 1.3
    const n = Math.max(
      3,
      Math.round(w / 6.5),
    )

    return (
      <group>
        <Parapet
          cx={cx}
          cz={cz}
          w={w + spec.wallT * 2}
          d={d + spec.wallT * 2}
          y={top}
          material={stone}
          unit={0.85}
          h={0.95}
        />

        {Array.from({ length: n }).map((_, i) => {
          const x =
            cx -
            w / 2 +
            (w * (i + 0.5)) / n

          return (
            <Chattri
              key={i}
              radius={r}
              height={h}
              position={[
                x,
                top + 0.6,
                cz -
                  d / 2 -
                  spec.wallT * 0.4,
              ]}
              material={stone}
              trim={dark}
              metal={metal}
            />
          )
        })}

        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <Chattri
            key={`c${i}`}
            radius={r * 1.15}
            height={h * 1.1}
            position={[
              cx +
                sx *
                  (w / 2 +
                    spec.wallT -
                    r * 1.2),
              top + 0.6,
              cz +
                sz *
                  (d / 2 +
                    spec.wallT -
                    r * 1.2),
            ]}
            material={stone}
            trim={dark}
            metal={metal}
          />
        ))}
      </group>
    )
  }

  /*
   * MINAR — the tower stands on the core, tapering in five storeys.
   */
  const base = span * 0.5

  const storeys = [
    {
      h: base * 1.5,
      rb: base * 0.98,
      rt: base * 0.84,
    },
    {
      h: base * 1.2,
      rb: base * 0.8,
      rt: base * 0.68,
    },
    {
      h: base * 1.0,
      rb: base * 0.64,
      rt: base * 0.55,
    },
    {
      h: base * 0.84,
      rb: base * 0.52,
      rt: base * 0.46,
    },
    {
      h: base * 0.7,
      rb: base * 0.44,
      rt: base * 0.38,
    },
  ].map((s, i) => ({
    ...s,
    flutes: [24, 20, 16, 12, 8][i],
  }))

  return (
    <MinarShaft
      cx={cx}
      cz={cz}
      y={top}
      storeys={storeys}
      material={stone}
      dark={dark}
      trim={trim}
      progress={Math.min(
        1,
        Math.max(0.2, progress / 0.85),
      )}
    />
  )
}

/**
 * Collapsed superstructure: courses that came down and stayed where they fell.
 */
function Rubble({
  cx,
  cz,
  w,
  d,
  y,
  seed,
  material,
}: {
  cx: number
  cz: number
  w: number
  d: number
  y: number
  seed: string
  material: THREE.Material
}) {
  const rand = new Rand(seed)

  const items: Inst[] = []

  for (let i = 0; i < 34; i++) {
    const a = rand.range(
      0,
      Math.PI * 2,
    )

    const r = rand.range(
      w * 0.55,
      w * 1.25,
    )

    const s = rand.range(
      0.9,
      2.6,
    )

    items.push({
      p: [
        cx + Math.cos(a) * r,
        y + s * 0.3,
        cz +
          Math.sin(a) *
            r *
            0.85,
      ],
      s: [
        s * 1.4,
        s * 0.62,
        s * 1.1,
      ],
      r: [
        rand.jitter(0.24),
        rand.range(0, Math.PI),
        rand.jitter(0.24),
      ],
    })
  }

  return (
    <InstancedSet
      geometry={UNIT_BOX}
      material={material}
      items={items}
    />
  )
}