'use client'

/**
 * Enclosures: the floors, plinths, walls and thresholds of every documented
 * space. Geometry comes straight from the wall solver, so a wall you can see is
 * a wall you collide with, and an opening you can see through is one you can
 * walk through.
 */

import { Fragment, useMemo } from 'react'
import * as THREE from 'three'
import { UNIT_BOX, box, slab } from '@/lib/twin/geometry'
import type { WorldModel, WorldSpace } from '@/lib/twin/model'
import { runsBySpace, solvePlinth } from '@/lib/twin/plinth'
import type { ArchSpec } from '@/lib/twin/specs'
import { CarvedWallRegister, Cornice, CourseLines, faceItems } from '../detail/bands'
import { InstancedSet, type Inst } from '../detail/instanced'
import { Doorframe, type ArchStyle } from '../detail/openings'
import type { TwinMaterials } from '../use-twin-materials'

const ARCH_STYLE: Record<ArchSpec['facade'], ArchStyle> = {
  PISHTAQ: 'OGEE',
  JANGHA: 'CORBEL',
  FLUTED: 'POINTED',
  ROCK: 'HORSESHOE',
  DRAVIDIAN: 'CORBEL',
  COLONNADE: 'FLAT',
}

/** Non-core buildings and gates take the site's secondary documented fabric. */
function wallMaterial(space: WorldSpace, mats: TwinMaterials) {
  const { m, pick } = mats
  if (space.role === 'CORE') return pick(m.stone, space.evidenceClass)
  if (space.role === 'GATE') return pick(m.accent, space.evidenceClass)
  if (space.role === 'BUILDING') return pick(m.stoneAlt, space.evidenceClass)
  return pick(m.paving, space.evidenceClass)
}

function floorMaterial(space: WorldSpace, mats: TwinMaterials) {
  const { m, pick } = mats
  if (space.role === 'COURT') return pick(m.paving, 'RECONSTRUCTED')
  if (space.role === 'TERRACE') return pick(m.floor, space.evidenceClass)
  return pick(m.floor, space.evidenceClass)
}

/**
 * Plinths, aprons and floors.
 *
 * The perimeter comes from the plinth solver, so the stone stops exactly where a
 * flight of steps begins — the same spans the collision world is built from.
 */
function Plinths({
  world,
  mats,
}: {
  world: WorldModel
  mats: TwinMaterials
}) {
  const { m, pick } = mats
  const runs = useMemo(() => runsBySpace(world.steps), [world.steps])

  return (
    <group>
      {world.spaces.map((s) => {
        const p = solvePlinth(s, runs.get(s.space.id) ?? [])
        const dark = pick(m.dark, s.evidenceClass)
        const alt = pick(m.stoneAlt, s.evidenceClass)
        const floor = floorMaterial(s, mats)
        const pieces = [p.core, ...p.bands]
        const caps: Inst[] = []
        const seams: Inst[] = []
        if (p.solid) {
          for (const b of p.bands) {
            if (!b.side) continue
            const face = { cx: b.cx, cz: b.cz, w: b.w, d: b.d, side: b.side }
            caps.push(...faceItems({ ...face, y: s.floorY - 0.28, h: 0.42, project: 0.36, t: 0.7 }))
            for (let y = 0.9; y < s.floorY - 0.62; y += 0.9) {
              seams.push(...faceItems({ ...face, y, h: 0.1, project: 0.07, t: 0.14 }))
            }
          }
        }
        return (
          <Fragment key={s.space.id}>
            {/* plinth mass — solid stone up to the floor level, cut at the steps */}
            {s.floorY > 0.06 &&
              pieces.map((b, i) => (
                <mesh
                  key={`b${i}`}
                  position={[b.cx, s.floorY / 2, b.cz]}
                  geometry={box(b.w, s.floorY, b.d, m.tile)}
                  material={dark}
                  castShadow
                  receiveShadow
                />
              ))}
            <InstancedSet geometry={UNIT_BOX} material={alt} items={caps} />
            <InstancedSet geometry={UNIT_BOX} material={dark} items={seams} castShadow={false} />

            {/* walking surface: room floor plus the apron pieces around it */}
            {pieces.map((b, i) => (
              <mesh
                key={`f${i}`}
                position={[b.cx, s.floorY + 0.02, b.cz]}
                geometry={slab(Math.max(0.4, b.w - 0.16), Math.max(0.4, b.d - 0.16), m.tile * 1.4)}
                material={floor}
                receiveShadow
              />
            ))}

          </Fragment>
        )
      })}
    </group>
  )
}

export function Enclosures({
  world,
  spec,
  mats,
}: {
  world: WorldModel
  spec: ArchSpec
  mats: TwinMaterials
}) {
  const { m, pick } = mats
  const style = ARCH_STYLE[spec.facade]

  const portalDoors = useMemo(() => {
    const keys = new Set(world.portals.map((p) => `${p.position[0].toFixed(1)}:${p.position[2].toFixed(1)}`))
    return world.doorways.filter((d) => keys.has(`${d.x.toFixed(1)}:${d.z.toFixed(1)}`))
  }, [world.doorways, world.portals])

  return (
    <group>
      <Plinths world={world} mats={mats} />

      {/* wall runs */}
      {world.walls.map((w, i) => {
        const s = world.spaces.find((x) => x.space.id === w.spaceId)
        if (!s) return null
        const mat = wallMaterial(s, mats)
        return (
          <Fragment key={`w${i}`}>
            <mesh
              position={[w.x, w.y, w.z]}
              geometry={box(w.w, w.h, w.d, m.tile)}
              material={mat}
              castShadow
              receiveShadow
            />
            {w.kind === 'WALL' && w.h > 3 && (
              <CourseLines
                cx={w.x} cz={w.z} w={w.w} d={w.d}
                y0={w.y - w.h / 2} y1={w.y + w.h / 2 - 0.4}
                spacing={1.25} project={0.08}
                material={pick(m.dark, s.evidenceClass)}
              />
            )}
            {w.kind === 'PARAPET' && (
              <mesh
                position={[w.x, w.y + w.h / 2 + 0.12, w.z]}
                geometry={box(w.w + 0.4, 0.24, w.d + 0.4, m.tile)}
                material={pick(m.stone, s.evidenceClass)}
                castShadow
              />
            )}
          </Fragment>
        )
      })}

      {/* wall heads over openings */}
      {world.lintels.map((l, i) => {
        const s = world.spaces.find((x) => x.space.id === l.spaceId)
        return (
          <mesh
            key={`l${i}`}
            position={[l.x, l.y, l.z]}
            geometry={box(l.w, l.h, l.d, m.tile)}
            material={s ? wallMaterial(s, mats) : m.stone}
            castShadow
            receiveShadow
          />
        )
      })}

      {/* cornice + sculptural register on the roofed enclosures */}
      {world.spaces
        .filter((s) => s.roofed && s.wallH > 4)
        .map((s) => {
          const w = s.rect.w + spec.wallT * 2
          const d = s.rect.d + spec.wallT * 2
          const top = s.floorY + s.wallH
          return (
            <Fragment key={`c${s.space.id}`}>
              <Cornice
                cx={s.rect.cx} cz={s.rect.cz} w={w} d={d} y={top - 1.1}
                material={pick(m.stone, s.evidenceClass)}
                dark={pick(m.dark, s.evidenceClass)}
                scale={s.role === 'CORE' ? 1.2 : 0.95}
              />
              {(spec.facade === 'JANGHA' || spec.facade === 'DRAVIDIAN') &&
                world.walls
                  .filter((wall) => wall.spaceId === s.space.id && wall.kind === 'WALL')
                  .map((wall, wallIndex) => (
                    <CarvedWallRegister
                      key={`${s.space.id}:carve:${wallIndex}`}
                      cx={wall.x} cz={wall.z} w={wall.w} d={wall.d}
                      y={s.floorY + s.wallH * 0.42} h={Math.min(2.4, s.wallH * 0.24)}
                      seed={`${world.seed}:${s.space.id}:carve:${wallIndex}`}
                      material={pick(m.stoneAlt, 'INTERPRETIVE')}
                      density={1.3}
                    />
                  ))}
            </Fragment>
          )
        })}

      {/* framed thresholds on the ways in */}
      {portalDoors.map((d, i) => (
        <Doorframe
          key={`df${i}`}
          w={d.w}
          h={d.h}
          wallT={spec.wallT}
          style={style}
          position={[d.x, d.sill, d.z]}
          rotation={[0, d.alongX ? 0 : Math.PI / 2, 0]}
          material={pick(m.stone, 'RECONSTRUCTED')}
          trim={pick(m.trim, 'INTERPRETIVE')}
        />
      ))}
    </group>
  )
}
