'use client'

/**
 * Geology, archaeological debris and the site boundary.
 *
 * Fragments are the reading that makes a ruin legible: a fallen lintel, a broken
 * column drum, a capital lying where it came down. They are contextual
 * visualisation — the record does not enumerate them — and are placed only in the
 * archaeological zone around the built complex.
 */

import { useMemo } from 'react'
import { UNIT_BOX, UNIT_CYL, UNIT_ROCK, UNIT_ROCK_HI, box } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { Rand } from '@/lib/twin/rng'
import { Course, CourseLines, Parapet } from '../detail/bands'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

export function SiteScatter({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const { m, pick } = mats
  const rockMat = pick(m.rock, 'CONTEXTUAL')
  const stoneMat = pick(m.stoneAlt, 'CONTEXTUAL')
  const darkMat = pick(m.dark, 'CONTEXTUAL')

  const built = useMemo(() => {
    const terrain = world.collision.terrain
    const rocks: Inst[] = []
    const smallRocks: Inst[] = []
    const blocks: Inst[] = []
    const drums: Inst[] = []
    const rand = new Rand(`${world.seed}:scatterdetail`)

    for (const r of world.props.rocks) {
      const y = r.y ?? terrain(r.x, r.z)
      const target = r.s > 2.6 ? rocks : smallRocks
      target.push({
        p: [r.x, y + r.s * 0.32, r.z],
        s: [r.s * 2, r.s * 1.5, r.s * 1.8],
        r: [rand.jitter(0.4), r.rot, rand.jitter(0.4)],
      })
    }

    for (const f of world.props.fragments) {
      const y = f.y ?? terrain(f.x, f.z)
      if (f.variant === 1) {
        drums.push({
          p: [f.x, y + f.s * 0.34, f.z],
          s: [f.s * 1.2, f.s * 0.7, f.s * 1.2],
          r: [Math.PI / 2 + rand.jitter(0.2), f.rot, rand.jitter(0.15)],
        })
      } else if (f.variant === 2) {
        blocks.push({
          p: [f.x, y + f.s * 0.3, f.z],
          s: [f.s * 2.6, f.s * 0.6, f.s * 0.9],
          r: [0, f.rot, rand.jitter(0.12)],
        })
      } else {
        blocks.push({
          p: [f.x, y + f.s * 0.28, f.z],
          s: [f.s * 1.3, f.s * 0.55, f.s * 1.2],
          r: [rand.jitter(0.1), f.rot, rand.jitter(0.1)],
        })
      }
    }

    return { rocks, smallRocks, blocks, drums }
  }, [world])

  return (
    <group>
      <InstancedSet geometry={UNIT_ROCK_HI} material={rockMat} items={built.rocks} />
      <InstancedSet geometry={UNIT_ROCK} material={rockMat} items={built.smallRocks} />
      <InstancedSet geometry={UNIT_BOX} material={stoneMat} items={built.blocks} />
      <InstancedSet geometry={UNIT_CYL} material={stoneMat} items={built.drums} />

      {world.env.boundary.map((b, i) => (
        <group key={`b${i}`}>
          <mesh
            position={[b.x, b.h / 2, b.z]}
            geometry={box(b.w, b.h, b.d, m.tile)}
            material={pick(m.accent, 'CONTEXTUAL')}
            castShadow
            receiveShadow
          />
          <CourseLines
            cx={b.x} cz={b.z} w={b.w} d={b.d}
            y0={0} y1={b.h - 0.6} spacing={1.15} project={0.07}
            material={darkMat}
          />
          <Course cx={b.x} cz={b.z} w={b.w} d={b.d} y={b.h - 0.28} h={0.36} project={0.24} t={0.5} material={stoneMat} />
          <Parapet cx={b.x} cz={b.z} w={b.w - 0.4} d={b.d + 0.4} y={b.h} material={stoneMat} unit={0.65} h={0.55} />
        </group>
      ))}
    </group>
  )
}
