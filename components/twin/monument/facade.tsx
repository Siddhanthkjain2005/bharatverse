'use client'

/**
 * Facade articulation.
 *
 * The devices that break a wall into readable registers, chosen by tradition:
 * recessed pishtaq arches on Indo-Islamic work, offset pilasters and balconied
 * projections on Nagara work, engaged flutes on a minar, niche shrines on a
 * Dravidian vimana. Every one of them is a reconstruction of a typology, not a
 * measurement of this building.
 */

import { useMemo } from 'react'
import { UNIT_BOX, box } from '@/lib/twin/geometry'
import type { WorldModel, WorldSpace } from '@/lib/twin/model'
import type { ArchSpec } from '@/lib/twin/specs'
import { InstancedSet, type Inst } from '../detail/instanced'
import { ArchNiche, Jali } from '../detail/openings'
import type { TwinMaterials } from '../use-twin-materials'

interface Face {
  /** Centre of the wall's *outer* face — where an applied element stands. */
  x: number
  z: number
  /** Outward normal, so an element can be keyed into the wall by its own depth. */
  nx: number
  nz: number
  rot: number
  width: number
  /** True when the face runs along x, so a box's width is its x extent. */
  along: boolean
  door: boolean
}

/**
 * The four outer faces of a walled space. The solver builds walls *outside* the
 * documented room, from the rect edge outward by `wallT`, so the face a visitor
 * sees is a full wall thickness clear of the rect — put an applied pilaster or
 * niche on the centre-line instead and the wall swallows it.
 */
function faces(space: WorldSpace, wallT: number): Face[] {
  const { cx, cz, w, d } = space.rect
  return [
    { x: cx, z: cz + d / 2 + wallT, nx: 0, nz: 1, rot: 0, width: w, along: true, door: space.doorSide === 'PZ' },
    { x: cx, z: cz - d / 2 - wallT, nx: 0, nz: -1, rot: Math.PI, width: w, along: true, door: space.doorSide === 'NZ' },
    { x: cx + w / 2 + wallT, z: cz, nx: 1, nz: 0, rot: Math.PI / 2, width: d, along: false, door: space.doorSide === 'PX' },
    { x: cx - w / 2 - wallT, z: cz, nx: -1, nz: 0, rot: -Math.PI / 2, width: d, along: false, door: space.doorSide === 'NX' },
  ]
}

export function Facade({
  world,
  core,
  spec,
  mats,
}: {
  world: WorldModel
  core: WorldSpace
  spec: ArchSpec
  mats: TwinMaterials
}) {
  const { m, pick } = mats
  const stone = pick(m.stone, 'RECONSTRUCTED')
  const dark = pick(m.dark, 'RECONSTRUCTED')
  const trim = pick(m.trim, 'INTERPRETIVE')
  const f = faces(core, spec.wallT)
  const y = core.floorY
  const wallH = core.wallH

  /**
   * Offset pilasters: the vertical rhythm that turns a blank wall into bays. Each
   * one is keyed into the wall and projects the rest of its depth, and carries a
   * base and a capital block, because a shaft with neither reads as a stripe.
   */
  const { shafts, blocks } = useMemo(() => {
    const shafts: Inst[] = []
    const blocks: Inst[] = []
    if (spec.facade !== 'DRAVIDIAN' && spec.facade !== 'COLONNADE' && spec.facade !== 'JANGHA') {
      return { shafts, blocks }
    }
    const deep = 0.9
    const off = deep / 2 - 0.22
    for (const face of f) {
      const n = Math.max(2, Math.round(face.width / 4.6))
      const wide = 1.0
      for (let i = 0; i <= n; i++) {
        const along = -face.width / 2 + (face.width * i) / n
        const px = (face.along ? face.x + along : face.x) + face.nx * off
        const pz = (face.along ? face.z : face.z + along) + face.nz * off
        const s: [number, number, number] = face.along ? [wide, wallH, deep] : [deep, wallH, wide]
        shafts.push({ p: [px, y + wallH / 2, pz], s })
        for (const [cy, grow] of [
          [y + 0.34, 0.34],
          [y + wallH - 0.5, 0.42],
        ] as const) {
          blocks.push({
            p: [px, cy, pz],
            s: face.along ? [wide + grow, 0.68, deep + grow * 0.5] : [deep + grow * 0.5, 0.68, wide + grow],
          })
        }
      }
    }
    return { shafts, blocks }
  }, [f, spec.facade, y, wallH])

  /** Engaged shafts: the flutes that make a minar read as round from any angle. */
  const flutes = useMemo<Inst[]>(() => {
    if (spec.facade !== 'FLUTED') return []
    const out: Inst[] = []
    for (const face of f) {
      const n = Math.max(3, Math.round(face.width / 1.5))
      for (let i = 0; i <= n; i++) {
        const along = -face.width / 2 + (face.width * i) / n
        const px = (face.along ? face.x + along : face.x) + face.nx * 0.16
        const pz = (face.along ? face.z : face.z + along) + face.nz * 0.16
        out.push({
          p: [px, y + wallH / 2, pz],
          s: [0.62, wallH, 0.62],
          r: [0, Math.PI / 4, 0],
        })
      }
    }
    return out
  }, [f, spec.facade, y, wallH])

  return (
    <group>
      {shafts.length > 0 && <InstancedSet geometry={UNIT_BOX} material={stone} items={shafts} />}
      {blocks.length > 0 && <InstancedSet geometry={UNIT_BOX} material={dark} items={blocks} />}
      {flutes.length > 0 && <InstancedSet geometry={UNIT_BOX} material={stone} items={flutes} />}

      {spec.facade === 'PISHTAQ' &&
        f.map((face, i) => {
          const nw = Math.min(face.width * 0.5, spec.door.w * 1.9)
          const nh = Math.min(wallH * 0.78, spec.door.h * 1.3)
          const flank = (face.width / 2 + nw / 2) / 2
          return (
            <group key={i}>
              <ArchNiche
                w={nw}
                h={nh}
                depth={0.95}
                style="OGEE"
                position={[face.x, y + 0.2, face.z]}
                rotation={[0, face.rot, 0]}
                material={stone}
                frame={trim}
                inner={dark}
                open={face.door}
              />
              {!face.door && (
                <Jali
                  w={nw * 0.5}
                  h={nh * 0.34}
                  position={[
                    (face.along ? face.x : face.x + face.nx * 0.34),
                    y + nh * 0.42,
                    (face.along ? face.z + face.nz * 0.34 : face.z),
                  ]}
                  rotation={[0, face.rot, 0]}
                  material={dark}
                  cell={0.34}
                  bar={0.09}
                />
              )}
              {[-1, 1].map((s) => (
                <ArchNiche
                  key={s}
                  w={nw * 0.32}
                  h={nh * 0.46}
                  depth={0.5}
                  style="OGEE"
                  position={[
                    face.along ? face.x + s * flank : face.x,
                    y + 0.2,
                    face.along ? face.z : face.z + s * flank,
                  ]}
                  rotation={[0, face.rot, 0]}
                  material={stone}
                  frame={trim}
                  inner={dark}
                />
              ))}
            </group>
          )
        })}

      {spec.facade === 'DRAVIDIAN' &&
        f.map((face, i) => (
          <ArchNiche
            key={i}
            w={Math.min(face.width * 0.2, 3.4)}
            h={wallH * 0.42}
            depth={0.8}
            style="CORBEL"
            position={[face.x, y + wallH * 0.24, face.z]}
            rotation={[0, face.rot, 0]}
            material={stone}
            frame={dark}
            inner={dark}
          />
        ))}

      {spec.extras.includes('BALCONIES') &&
        f
          .filter((face) => !face.door)
          .map((face, i) => (
            <group key={i}>
              <mesh
                position={[face.x + face.nx * 0.62, y + wallH * 0.52, face.z + face.nz * 0.62]}
                geometry={box(face.along ? 4.2 : 1.9, 3.1, face.along ? 1.9 : 4.2, m.tile)}
                material={stone}
                castShadow
                receiveShadow
              />
              <mesh
                position={[face.x + face.nx * 0.62, y + wallH * 0.52 + 1.75, face.z + face.nz * 0.62]}
                geometry={box(face.along ? 5 : 2.6, 0.4, face.along ? 2.6 : 5, m.tile)}
                material={dark}
                castShadow
              />
            </group>
          ))}
    </group>
  )
}
