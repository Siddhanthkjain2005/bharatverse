'use client'

/**
 * Roofs and interior supports.
 *
 * Each documented space is roofed according to its own kind and the archetype's
 * tradition, so a hall reads as a pillared hall, a sanctum as an enclosed cell,
 * and a courtyard stays open to the sky.
 */

import { Fragment } from 'react'
import { box, sphere } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import type { ArchSpec } from '@/lib/twin/specs'
import { Parapet } from '../detail/bands'
import { Chattri, TieredRoof } from '../detail/crowns'
import { Architrave, Colonnade } from '../detail/supports'
import type { TwinMaterials } from '../use-twin-materials'

export function Roofs({
  world,
  spec,
  mats,
  progress,
}: {
  world: WorldModel
  spec: ArchSpec
  mats: TwinMaterials
  progress: number
}) {
  const { m, pick } = mats

  return (
    <group>
      {world.spaces.map((s) => {
        if (!s.roofed) return null
        const w = s.rect.w + spec.wallT * 2
        const d = s.rect.d + spec.wallT * 2
        const top = s.floorY + s.wallH
        const stone = pick(m.stone, s.evidenceClass)
        const dark = pick(m.dark, s.evidenceClass)
        const isCore = s.role === 'CORE'
        const roof = spec.roof

        return (
          <Fragment key={`r${s.space.id}`}>
            {/* ceiling slab — seen from inside as well as above */}
            <mesh
              position={[s.rect.cx, top + 0.42, s.rect.cz]}
              geometry={box(w, 0.84, d, m.tile)}
              material={stone}
              castShadow
              receiveShadow
            />
            {/* coffered soffit so the ceiling is not a flat lid */}
            <mesh
              position={[s.rect.cx, top - 0.22, s.rect.cz]}
              geometry={box(s.rect.w * 0.66, 0.44, s.rect.d * 0.66, m.tile)}
              material={dark}
            />
            {isCore && spec.crown === 'ONION_DOME' && (
              <mesh
                position={[s.rect.cx, top - 0.4, s.rect.cz]}
                geometry={sphere(Math.min(s.rect.w, s.rect.d) * 0.46, 24, 14, Math.PI * 2, Math.PI / 2)}
                rotation={[Math.PI, 0, 0]}
                material={dark}
              />
            )}

            {!isCore && roof === 'PYRAMID' && (
              <TieredRoof
                cx={s.rect.cx} cz={s.rect.cz} w={w * 0.98} d={d * 0.98} y={top + 0.84}
                tiers={7} tierH={Math.max(0.6, s.wallH * 0.11)} taper={0.845}
                material={stone} dark={dark}
                visible={progress > 0.32 ? 7 : 2}
              />
            )}
            {!isCore && roof === 'TIERED' && (
              <TieredRoof
                cx={s.rect.cx} cz={s.rect.cz} w={w * 0.98} d={d * 0.98} y={top + 0.84}
                tiers={5} tierH={Math.max(0.9, s.wallH * 0.15)} taper={0.87}
                material={stone} dark={dark} shrine
                visible={progress > 0.32 ? 5 : 2}
              />
            )}
            {!isCore && (roof === 'FLAT' || roof === 'DOMED_FLAT') && (
              <>
                <Parapet
                  cx={s.rect.cx} cz={s.rect.cz} w={w - 0.6} d={d - 0.6} y={top + 0.84}
                  material={stone} unit={0.8} h={0.9}
                />
                {roof === 'DOMED_FLAT' && Math.min(w, d) > 9 && (
                  <>
                    <mesh
                      position={[s.rect.cx, top + 1.2, s.rect.cz]}
                      geometry={box(Math.min(w, d) * 0.44, 1.1, Math.min(w, d) * 0.44, m.tile)}
                      material={stone}
                      castShadow
                    />
                    <mesh
                      position={[s.rect.cx, top + 1.75, s.rect.cz]}
                      geometry={sphere(Math.min(w, d) * 0.26, 20, 12, Math.PI * 2, Math.PI / 2)}
                      material={stone}
                      castShadow
                    />
                  </>
                )}
                {roof === 'DOMED_FLAT' &&
                  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
                    <Chattri
                      key={i}
                      radius={Math.min(1.5, Math.min(w, d) * 0.12)}
                      height={1.8}
                      position={[s.rect.cx + sx * (w / 2 - 1.6), top + 1.1, s.rect.cz + sz * (d / 2 - 1.6)]}
                      material={stone}
                      trim={pick(m.trim, 'INTERPRETIVE')}
                    />
                  ))}
              </>
            )}
          </Fragment>
        )
      })}

      {/* colonnades — halls, galleries and court cloisters */}
      {world.columns.map((g) => {
        const s = world.spaces.find((x) => x.space.id === g.spaceId)
        const cls = s?.evidenceClass ?? 'RECONSTRUCTED'
        return (
          <Fragment key={`col${g.spaceId}`}>
            <Colonnade
              set={{ positions: g.positions, y: g.y, h: g.h, style: g.style, scale: g.radius / 0.56 }}
              stone={pick(m.stone, cls)}
              dark={pick(m.dark, cls)}
              trim={pick(m.trim, 'INTERPRETIVE')}
            />
            <Architrave
              positions={g.positions}
              y={g.y + g.h + 0.4}
              material={pick(m.stoneAlt, cls)}
              along="x"
            />
            <Architrave
              positions={g.positions}
              y={g.y + g.h + 0.4}
              material={pick(m.stoneAlt, cls)}
              along="z"
            />
            {g.cloister && s && (
              <>
                {[
                  { x: s.rect.cx, z: s.rect.cz - s.rect.d / 2 + 2.2, w: s.rect.w - 4, d: 5.2 },
                  { x: s.rect.cx, z: s.rect.cz + s.rect.d / 2 - 2.2, w: s.rect.w - 4, d: 5.2 },
                  { x: s.rect.cx - s.rect.w / 2 + 2.2, z: s.rect.cz, w: 5.2, d: s.rect.d - 4 },
                  { x: s.rect.cx + s.rect.w / 2 - 2.2, z: s.rect.cz, w: 5.2, d: s.rect.d - 4 },
                ].map((r, i) => (
                  <mesh
                    key={i}
                    position={[r.x, g.y + g.h + 0.95, r.z]}
                    geometry={box(r.w, 0.7, r.d, m.tile)}
                    material={pick(m.stoneAlt, 'RECONSTRUCTED')}
                    castShadow
                    receiveShadow
                  />
                ))}
              </>
            )}
          </Fragment>
        )
      })}
    </group>
  )
}
