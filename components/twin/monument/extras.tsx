'use client'

/**
 * Archetype extras: detached minarets, chariot wheels, the horses of a ceremonial
 * approach, the rock scarp a vihara is cut into, and the arched screen of a
 * congregational mosque. These are what make one procedural monument
 * unmistakably not another.
 */

import { UNIT_BOX, UNIT_ROCK_HI, box, cylinder, torus } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { Rand } from '@/lib/twin/rng'
import type { ArchSpec } from '@/lib/twin/specs'
import { Chattri } from '../detail/crowns'
import { InstancedSet, type Inst } from '../detail/instanced'
import { ArchNiche } from '../detail/openings'
import type { TwinMaterials } from '../use-twin-materials'

export function Extras({
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
  const stone = pick(m.stone, 'RECONSTRUCTED')
  const dark = pick(m.dark, 'RECONSTRUCTED')
  const rock = pick(m.rock, 'CONTEXTUAL')
  const trim = pick(m.trim, 'INTERPRETIVE')
  const { minarets, wheels, horses, cliff } = world.extras
  const built = progress > 0.4

  const rockFace = (() => {
    if (!cliff) return [] as Inst[]
    const rand = new Rand(`${world.seed}:cliffface`)
    const out: Inst[] = []
    const c = cliff.back
    for (let i = 0; i < 90; i++) {
      const t = rand.unit()
      const s = rand.range(2.4, 8)
      out.push({
        p: [c.x - c.w / 2 + c.w * t, rand.range(0, c.h * 0.98), c.z + c.d / 2 - rand.range(0, 3)],
        s: [s, s * rand.range(0.6, 1.3), s * 0.8],
        r: [rand.jitter(0.35), rand.range(0, Math.PI), rand.jitter(0.35)],
      })
    }
    return out
  })()

  return (
    <group>
      {built &&
        minarets.map((mn, i) => (
          <group key={`mn${i}`} position={[mn.x, 0, mn.z]}>
            <mesh position={[0, 0.6, 0]} geometry={cylinder(mn.r * 1.32, mn.r * 1.5, 1.2, 18, m.tile)} material={dark} castShadow receiveShadow />
            {Array.from({ length: mn.stages }).map((_, s) => {
              const sh = mn.h / mn.stages
              const rb = mn.r * (1 - s * 0.11)
              const rt = mn.r * (1 - (s + 1) * 0.11)
              return (
                <group key={s} position={[0, 1.2 + s * (sh + 0.34), 0]}>
                  <mesh position={[0, sh / 2, 0]} geometry={cylinder(rt, rb, sh, 22, m.tile)} material={stone} castShadow receiveShadow />
                  <mesh position={[0, sh + 0.16, 0]} geometry={cylinder(rt * 1.42, rt * 1.06, 0.34, 22, 2)} material={stone} castShadow />
                  <mesh position={[0, sh + 0.44, 0]} geometry={torus(rt * 1.4, 0.07, 6, 28)} material={trim} />
                </group>
              )
            })}
            <Chattri
              radius={mn.r * 0.92}
              height={mn.r * 1.15}
              position={[0, mn.h + 1.4, 0]}
              material={stone}
              trim={trim}
            />
          </group>
        ))}

      {built &&
        wheels.map((wh, i) => (
          <group key={`wh${i}`} position={[wh.x, wh.y, wh.z]} rotation={[0, wh.rot, 0]}>
            <mesh geometry={torus(wh.r, wh.r * 0.17, 10, 36)} material={stone} castShadow />
            <mesh geometry={cylinder(wh.r * 0.76, wh.r * 0.76, wh.r * 0.16, 30, 2)} material={dark} />
            <mesh rotation={[Math.PI / 2, 0, 0]} geometry={cylinder(wh.r * 0.2, wh.r * 0.2, wh.r * 0.36, 14, 2)} material={trim} />
            <InstancedSet
              geometry={UNIT_BOX}
              material={stone}
              items={Array.from({ length: 8 }).map((_, s) => ({
                p: [0, 0, 0] as [number, number, number],
                s: [wh.r * 0.13, wh.r * 1.74, wh.r * 0.16] as [number, number, number],
                r: [0, 0, (s / 8) * Math.PI * 2] as [number, number, number],
              }))}
            />
            <InstancedSet
              geometry={UNIT_BOX}
              material={trim}
              items={Array.from({ length: 8 }).map((_, s) => {
                const a = (s / 8) * Math.PI * 2 + Math.PI / 8
                return {
                  p: [Math.cos(a) * wh.r * 0.86, Math.sin(a) * wh.r * 0.86, wh.r * 0.12] as [number, number, number],
                  s: wh.r * 0.22,
                }
              })}
            />
          </group>
        ))}

      {built &&
        horses.map((h, i) => (
          <group key={`ho${i}`} position={[h.x, world.collision.groundAt(h.x, h.z, 40), h.z]} rotation={[0, h.rot, 0]}>
            <mesh position={[0, 1.5, 0]} geometry={box(1.3, 1.5, 3.2, m.tile)} material={stone} castShadow receiveShadow />
            <mesh position={[0, 2.5, 1.5]} rotation={[0.4, 0, 0]} geometry={box(0.8, 1.5, 0.9, m.tile)} material={stone} castShadow />
            <mesh position={[0, 3.1, 2.0]} geometry={box(0.5, 0.5, 0.9, m.tile)} material={dark} castShadow />
            <InstancedSet
              geometry={UNIT_BOX}
              material={stone}
              items={[-0.45, 0.45].flatMap((x) =>
                [-1.1, 1.1].map((z) => ({ p: [x, 0.7, z] as [number, number, number], s: [0.28, 1.4, 0.28] as [number, number, number] })),
              )}
            />
          </group>
        ))}

      {cliff && (
        <group>
          <mesh
            position={[cliff.back.x, cliff.back.h / 2 - 2, cliff.back.z]}
            geometry={box(cliff.back.w, cliff.back.h, cliff.back.d, m.tile * 2)}
            material={rock}
            castShadow
            receiveShadow
          />
          <mesh
            position={[cliff.cap.x, cliff.cap.y + cliff.cap.h / 2, cliff.cap.z]}
            geometry={box(cliff.cap.w, cliff.cap.h, cliff.cap.d, m.tile * 2)}
            material={rock}
            castShadow
            receiveShadow
          />
          {cliff.wings.map((wg, i) => (
            <mesh
              key={i}
              position={[wg.x, wg.h / 2 - 3, wg.z]}
              geometry={box(wg.w, wg.h, wg.d, m.tile * 2)}
              material={rock}
              castShadow
              receiveShadow
            />
          ))}
          <InstancedSet geometry={UNIT_ROCK_HI} material={rock} items={rockFace} receiveShadow={false} />
        </group>
      )}

      {spec.extras.includes('SCREEN') &&
        world.spaces
          .filter((s) => s.space.kind === 'GALLERY')
          .map((s) => {
            const n = Math.max(3, Math.round(s.rect.w / 9))
            return (
              <group key={`sc${s.space.id}`}>
                {Array.from({ length: n }).map((_, i) => {
                  const t = (i + 0.5) / n
                  const x = s.rect.cx - s.rect.w / 2 + s.rect.w * t
                  const h = s.wallH * (i === Math.floor(n / 2) ? 1.5 : 1.15)
                  return (
                    <group key={i}>
                      <mesh
                        position={[x, s.floorY + h / 2, s.rect.cz]}
                        geometry={box(s.rect.w / n - 0.6, h, s.rect.d * 0.7, m.tile)}
                        material={stone}
                        castShadow
                        receiveShadow
                      />
                      <ArchNiche
                        w={(s.rect.w / n) * 0.6}
                        h={h * 0.72}
                        depth={0.9}
                        style="POINTED"
                        position={[x, s.floorY, s.rect.cz + s.rect.d * 0.36]}
                        material={stone}
                        frame={trim}
                        inner={dark}
                      />
                    </group>
                  )
                })}
              </group>
            )
          })}
    </group>
  )
}
