'use client'

/**
 * Archetype-aware horizon dressing.
 *
 * These forms sit beyond the visitable archaeological zone, where they can add
 * scale and regional identity without pretending to document an exact modern
 * skyline. The Evidence Lens therefore always grades them CONTEXTUAL.
 */

import { useMemo } from 'react'
import { UNIT_BOX, UNIT_CONE, UNIT_ROCK_HI, UNIT_SPHERE_HI } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { Rand } from '@/lib/twin/rng'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

type BuiltContext = {
  hills: Inst[]
  dunes: Inst[]
  buildings: Inst[]
  roofs: Inst[]
  rockStacks: Inst[]
}

export function DistantContext({
  world,
  mats,
  detail = 1,
}: {
  world: WorldModel
  mats: TwinMaterials
  detail?: number
}) {
  const { m, pick } = mats
  const built = useMemo<BuiltContext>(() => {
    const rand = new Rand(`${world.seed}:horizon-context`)
    const hills: Inst[] = []
    const dunes: Inst[] = []
    const buildings: Inst[] = []
    const roofs: Inst[] = []
    const rockStacks: Inst[] = []
    const land = world.env.land
    const terrain = world.collision.terrain
    const horizonCount = Math.round((detail > 1 ? 34 : 24) * (land === 'GORGE' ? 1.5 : 1))

    for (let i = 0; i < horizonCount; i++) {
      const a = (i / horizonCount) * Math.PI * 2 + rand.jitter(0.08)
      const r = world.ground * rand.range(1.18, 1.72)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r * rand.range(0.88, 1.12)
      const y = terrain(x, z) - rand.range(1, 5)

      if (land === 'DESERT_COMPLEX' || land === 'COASTAL' || land === 'CHARBAGH') {
        dunes.push({
          p: [x, y - 5, z],
          s: [rand.range(22, 46), rand.range(7, 14), rand.range(18, 40)],
          r: [0, a + rand.jitter(0.5), 0],
        })
      } else {
        const tall = land === 'GORGE' ? rand.range(28, 58) : rand.range(15, 36)
        hills.push({
          p: [x, y + tall * 0.22, z],
          s: [rand.range(24, 54), tall, rand.range(20, 46)],
          r: [rand.jitter(0.18), a, rand.jitter(0.12)],
        })
      }
    }

    const settlement = land !== 'GORGE' && land !== 'BOULDER_FIELD'
    if (settlement) {
      const count = Math.round((detail > 1 ? 28 : 18) * (land === 'DESERT_COMPLEX' ? 1.2 : 1))
      const baseA = land === 'COASTAL' ? -0.7 : 2.25
      for (let i = 0; i < count; i++) {
        const a = baseA + rand.jitter(0.64)
        const r = world.ground * rand.range(0.96, 1.24)
        const x = Math.cos(a) * r + rand.jitter(18)
        const z = Math.sin(a) * r + rand.jitter(18)
        const y = terrain(x, z)
        const w = rand.range(4, 10)
        const d = rand.range(4, 9)
        const h = rand.range(3.2, 8.5)
        buildings.push({ p: [x, y + h / 2, z], s: [w, h, d], r: [0, rand.jitter(0.16), 0] })
        if (land === 'TEMPLE_COURT' || land === 'COASTAL') {
          roofs.push({ p: [x, y + h + 1.4, z], s: [w * 0.72, 2.8, d * 0.72], r: [0, rand.jitter(0.2), 0] })
        }
      }
    }

    if (land === 'BOULDER_FIELD' || land === 'GORGE' || land === 'TEMPLE_COURT') {
      const count = Math.round(detail > 1 ? 54 : 34)
      for (let i = 0; i < count; i++) {
        const a = rand.range(0, Math.PI * 2)
        const r = world.ground * rand.range(0.82, 1.34)
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const s = rand.range(5, land === 'BOULDER_FIELD' ? 18 : 12)
        rockStacks.push({
          p: [x, terrain(x, z) + s * 0.35, z],
          s: [s * rand.range(1.2, 2.2), s, s * rand.range(1.1, 1.9)],
          r: [rand.jitter(0.4), rand.range(0, Math.PI), rand.jitter(0.35)],
        })
      }
    }

    return { hills, dunes, buildings, roofs, rockStacks }
  }, [world, detail])

  return (
    <group>
      <InstancedSet geometry={UNIT_ROCK_HI} material={pick(m.rock, 'CONTEXTUAL')} items={built.hills} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_SPHERE_HI} material={pick(m.soil, 'CONTEXTUAL')} items={built.dunes} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_BOX} material={pick(m.stoneAlt, 'CONTEXTUAL')} items={built.buildings} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_CONE} material={pick(m.dark, 'CONTEXTUAL')} items={built.roofs} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={UNIT_ROCK_HI} material={pick(m.rock, 'CONTEXTUAL')} items={built.rockStacks} castShadow={false} receiveShadow={false} />
    </group>
  )
}
