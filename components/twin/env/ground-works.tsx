'use client'

/**
 * Ground works: paving, flights of steps, garden quarters and stepped tanks.
 *
 * Every tread rendered here is also a walkable platform in the collision world,
 * which is what makes a flight of steps something the visitor climbs rather than
 * a texture they slide up.
 */

import { useMemo } from 'react'
import { UNIT_BOX, box, slab } from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { treadsFor } from '@/lib/twin/steps'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

export function GroundWorks({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const { m, pick } = mats
  const paving = pick(m.paving, 'CONTEXTUAL')
  const stone = pick(m.stoneAlt, 'CONTEXTUAL')
  const dark = pick(m.dark, 'CONTEXTUAL')
  const grass = pick(m.grass, 'CONTEXTUAL')

  // Same generator the collision world uses, so a tread is never a texture.
  const treads = useMemo<Inst[]>(() => {
    const out: Inst[] = []
    for (const run of world.steps) {
      for (const t of treadsFor(run)) {
        out.push({ p: [t.cx, t.top / 2, t.cz], s: [t.w, Math.max(t.top, 0.12), t.d] })
      }
    }
    return out
  }, [world.steps])

  const gardens = useMemo(() => {
    if (world.env.land !== 'CHARBAGH') return []
    const court = world.spaces.find((s) => s.role === 'COURT')
    if (!court) return []
    const out: { x: number; z: number; w: number; d: number }[] = []
    const hw = (court.rect.w - 6) / 2
    const hd = (court.rect.d - 6) / 2
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push({
          x: court.rect.cx + (sx * (hw + 3)) / 2,
          z: court.rect.cz + (sz * (hd + 3)) / 2,
          w: hw - 1.4,
          d: hd - 1.4,
        })
      }
    }
    return out.map((q) => ({ ...q, y: court.floorY + 0.08 }))
  }, [world.env.land, world.spaces])

  const tank = world.water.find((wf) => wf.kind === 'POOL')

  return (
    <group>
      {/* paved routes between documented spaces */}
      {world.paths.map((p, i) => (
        <group key={`p${i}`}>
          <mesh position={[p.x, p.y + 0.05, p.z]} geometry={slab(p.w, p.d, m.tile)} material={paving} receiveShadow />
          <mesh
            position={[p.x, p.y + 0.09, p.z]}
            geometry={box(p.w > p.d ? p.w : p.w + 0.5, 0.18, p.w > p.d ? p.d + 0.5 : p.d, m.tile)}
            material={dark}
            receiveShadow
          />
          <mesh position={[p.x, p.y + 0.12, p.z]} geometry={slab(p.w - 0.5, p.d - 0.5, m.tile * 0.7)} material={paving} receiveShadow />
        </group>
      ))}

      <InstancedSet geometry={UNIT_BOX} material={stone} items={treads} />

      {/* charbagh quarters: sunken lawn inside a stone kerb */}
      {gardens.map((q, i) => (
        <group key={`g${i}`}>
          <mesh position={[q.x, q.y - 0.02, q.z]} geometry={box(q.w + 0.9, 0.36, q.d + 0.9, m.tile)} material={stone} receiveShadow />
          <mesh position={[q.x, q.y + 0.11, q.z]} geometry={slab(q.w, q.d, m.tile * 0.6)} material={grass} receiveShadow />
        </group>
      ))}

      {/* stepped tank */}
      {tank && (
        <group position={[tank.x, 0, tank.z]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh
              key={i}
              position={[0, -i * 0.62 + 0.3, 0]}
              geometry={box(tank.w + 6 - i * 1.8, 0.62, tank.d + 6 - i * 1.8, m.tile)}
              material={i % 2 ? stone : dark}
              receiveShadow
              castShadow
            />
          ))}
        </group>
      )}
    </group>
  )
}
