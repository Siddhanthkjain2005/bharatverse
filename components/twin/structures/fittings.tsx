'use client'

/**
 * Fittings: what stands inside a room.
 *
 * These are typological, not documentary — an image platform in a sanctum, a
 * screened cenotaph in a chamber, pedestals in a gallery. They are graded
 * INTERPRETIVE so the Evidence Lens marks them as reconstruction, and nothing is
 * placed in a room the record does not describe.
 */

import { Fragment } from 'react'
import { box, cylinder, slab, sphere, torus } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { Jali } from '../detail/openings'
import type { TwinMaterials } from '../use-twin-materials'
import { SiteArtefacts } from './site-artefacts'
import { InteriorArtefacts } from './interior-artefacts'

export function Fittings({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const { m, pick } = mats
  const trim = pick(m.trim, 'INTERPRETIVE')
  const stone = pick(m.stoneAlt, 'INTERPRETIVE')
  const dark = pick(m.dark, 'INTERPRETIVE')

  return (
    <group>
      <SiteArtefacts world={world} mats={mats} />
      <InteriorArtefacts world={world} mats={mats} />
      {world.spaces.map((s) => {
        const { cx, cz, w, d } = s.rect
        const y = s.floorY

        if (s.space.kind === 'SANCTUM') return null

        if (s.space.kind === 'CHAMBER' && world.site.slug === 'taj-mahal') {
          const cw = Math.min(w * 0.34, 5.4)
          const cd = Math.min(d * 0.34, 4.2)
          const screenH = Math.min(2.18, s.wallH * 0.28)
          const sw = cw + 3.2
          const sd = cd + 3.2
          const tombW = Math.min(1.35, cw * 0.28)
          const tombD = Math.min(3.25, cd * 0.86)
          return (
            <group key={`f${s.space.id}`} position={[cx, y, cz]}>
              {[-1, 1].map((side) => (
                <group key={side} position={[side * cw * 0.17, 0, side * 0.08]}>
                  <mesh position={[0, 0.23, 0]} geometry={box(tombW * 1.22, 0.46, tombD * 1.12, m.tile)} material={stone} castShadow receiveShadow />
                  <mesh position={[0, 0.57, 0]} geometry={box(tombW, 0.24, tombD, m.tile)} material={trim} castShadow />
                  <mesh position={[0, 0.76, 0]} geometry={box(tombW * 0.82, 0.14, tombD * 0.82, m.tile)} material={stone} castShadow />
                  {[-1, 1].map((end) => (
                    <Fragment key={end}>
                      <mesh position={[0, 0.94, end * tombD * 0.32]} geometry={cylinder(0.075, 0.13, 0.36, 12, 1)} material={dark} castShadow />
                      <mesh position={[0, 1.15, end * tombD * 0.32]} geometry={sphere(0.12, 16, 12)} material={trim} castShadow />
                    </Fragment>
                  ))}
                  <mesh position={[0, 0.72, tombD * 0.505]} rotation={[Math.PI / 2, 0, 0]} geometry={torus(tombW * 0.25, 0.045, 8, 24)} material={dark} />
                </group>
              ))}
              {[
                { p: [0, screenH / 2, -sd / 2] as [number, number, number], r: [0, 0, 0] as [number, number, number], w: sw },
                { p: [0, screenH / 2, sd / 2] as [number, number, number], r: [0, 0, 0] as [number, number, number], w: sw },
                { p: [-sw / 2, screenH / 2, 0] as [number, number, number], r: [0, Math.PI / 2, 0] as [number, number, number], w: sd },
                { p: [sw / 2, screenH / 2, 0] as [number, number, number], r: [0, Math.PI / 2, 0] as [number, number, number], w: sd },
              ].map((seg, i) =>
                i === 1 ? null : (
                  <Jali key={i} w={seg.w} h={screenH} position={seg.p} rotation={seg.r} material={stone} cell={0.58} bar={0.055} />
                ),
              )}
            </group>
          )
        }

        if (s.space.kind === 'GALLERY') {
          const count = Math.max(2, Math.floor(Math.max(w, d) / 7))
          const along = w >= d ? 'x' : 'z'
          return (
            <group key={`f${s.space.id}`}>
              {Array.from({ length: count }).map((_, i) => {
                const t = (i + 0.5) / count
                const px = along === 'x' ? cx - w / 2 + w * t : cx - w / 2 + 1.9
                const pz = along === 'x' ? cz - d / 2 + 1.9 : cz - d / 2 + d * t
                return (
                  <Fragment key={i}>
                    <mesh position={[px, y + 0.5, pz]} geometry={box(1.5, 1, 1.5, m.tile)} material={stone} castShadow receiveShadow />
                    <mesh position={[px, y + 1.1, pz]} geometry={box(1.1, 0.2, 1.1, m.tile)} material={trim} castShadow />
                  </Fragment>
                )
              })}
            </group>
          )
        }

        if (s.role === 'TERRACE') {
          return (
            <group key={`f${s.space.id}`}>
              <mesh
                position={[cx, y + 0.05, cz]}
                geometry={slab(w * 0.9, d * 0.9, m.tile * 0.8)}
                material={pick(m.floor, s.evidenceClass)}
                receiveShadow
              />
            </group>
          )
        }

        return null
      })}

      {/*
        A plain pedestal under a documented feature the twin does not model as its
        own geometry — an iron pillar, a monolithic ratha, a stupa. The record
        places it in this room; the pedestal says "here", and deliberately does not
        invent the object standing on it.
      */}
      {world.anchors
        .filter((a) =>
          a.onFloor &&
          a.on === 'SPACE' &&
          a.spaceId &&
          !['hs-t-nandi', 'hs-t-linga', 'hs-chariot', 'hs-q-iron', 'hs-m-ratha', 'hs-a-stupa'].includes(a.id),
        )
        .map((a) => {
          const s = world.spaces.find((x) => x.space.id === a.spaceId)
          if (!s) return null
          // Clear of whatever the room already has at its centre.
          const ox = a.position[0] - s.rect.cx
          const oz = a.position[2] - s.rect.cz
          const len = Math.hypot(ox, oz) || 1
          const keep = Math.max(len, Math.min(s.rect.w, s.rect.d) * 0.34)
          const px = s.rect.cx + (ox / len) * keep
          const pz = s.rect.cz + (oz / len) * keep
          return (
            <group key={`hp${a.id}`} position={[px, s.floorY, pz]}>
              <mesh position={[0, 0.42, 0]} geometry={cylinder(0.62, 0.78, 0.84, 12, 2)} material={dark} castShadow receiveShadow />
              <mesh position={[0, 0.92, 0]} geometry={torus(0.5, 0.06, 8, 20)} rotation={[Math.PI / 2, 0, 0]} material={trim} />
            </group>
          )
        })}

      {/* built lamp standards along the route */}
      {world.props.lamps.map((l, i) => {
        const y = world.collision.groundAt(l.x, l.z, 40)
        return (
          <group key={`lamp${i}`} position={[l.x, y, l.z]}>
            <mesh position={[0, 0.2, 0]} geometry={box(0.7, 0.4, 0.7, 2)} material={dark} castShadow />
            <mesh position={[0, 1.4, 0]} geometry={cylinder(0.11, 0.15, 2.4, 8, 2)} material={stone} castShadow />
            <mesh position={[0, 2.85, 0]} geometry={sphere(0.3, 12, 10)} material={m.glow} />
            <mesh position={[0, 3.2, 0]} geometry={cylinder(0.05, 0.34, 0.44, 8, 2)} material={trim} />
          </group>
        )
      })}
    </group>
  )
}
