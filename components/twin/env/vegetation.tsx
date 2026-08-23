'use client'

/**
 * Planting.
 *
 * Trees, shrubs and ground cover are drawn as a handful of instanced meshes and
 * swayed by a vertex-shader wind that reads the instance position, so a hundred
 * trees move independently for the cost of one uniform. Motion is disabled when
 * the visitor has asked for reduced motion.
 */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CROSS_BLADE, LEAF_BLADE, UNIT_CONE, UNIT_CYL, UNIT_SPHERE, UNIT_SPHERE_HI } from '@/lib/twin/geometry'
import type { TreeKind } from '@/lib/twin/environment'
import { coverDensity, scatter } from '@/lib/twin/environment'
import type { WorldModel } from '@/lib/twin/model'
import { Rand } from '@/lib/twin/rng'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

const SHAPE: Record<TreeKind, { trunk: number; canopy: 'CONE' | 'SPHERE' | 'FROND'; h: number; spread: number }> = {
  CYPRESS: { trunk: 0.5, canopy: 'CONE', h: 9, spread: 1.5 },
  BANYAN: { trunk: 1.5, canopy: 'SPHERE', h: 7.5, spread: 5.4 },
  PALM: { trunk: 0.45, canopy: 'FROND', h: 10, spread: 3.2 },
  NEEM: { trunk: 1.0, canopy: 'SPHERE', h: 7, spread: 3.6 },
  SCRUB: { trunk: 0.4, canopy: 'SPHERE', h: 2.4, spread: 1.9 },
}

/** Injects a position-seeded sway into any standard material. */
function useWindMaterial(base: THREE.Material, amount: number) {
  return useMemo(() => {
    const mat = base.clone() as THREE.MeshStandardMaterial
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uSway = { value: amount }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 iOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            float phase = iOrigin.x * 0.31 + iOrigin.z * 0.24;
            float sway = (sin(uTime * 1.05 + phase) * 0.7 + sin(uTime * 2.4 + phase * 1.7) * 0.3) * uSway;
            float lift = max(position.y + 0.5, 0.0);
            transformed.x += sway * lift;
            transformed.z += sway * 0.55 * lift;
          #endif`,
        )
      mat.userData.shader = shader
    }
    mat.needsUpdate = true
    return mat
  }, [base, amount])
}

function useWindClock(materials: THREE.Material[], enabled: boolean) {
  const t = useRef(0)
  useFrame((_, delta) => {
    if (!enabled) return
    t.current += delta
    for (const m of materials) {
      const shader = (m as THREE.MeshStandardMaterial).userData?.shader
      if (shader?.uniforms?.uTime) shader.uniforms.uTime.value = t.current
    }
  })
}

export function Vegetation({
  world,
  mats,
  reducedMotion,
  detail = 1,
}: {
  world: WorldModel
  mats: TwinMaterials
  reducedMotion: boolean
  detail?: number
}) {
  const { m, pick } = mats
  const env = world.env
  const trunkMat = pick(m.trunk, 'CONTEXTUAL')
  const foliageBase = pick(m.foliage, 'CONTEXTUAL')
  const canopyMat = useWindMaterial(foliageBase, 0.055)
  const tuftMat = useWindMaterial(foliageBase, 0.03)
  useWindClock([canopyMat, tuftMat], !reducedMotion)

  const built = useMemo(() => {
    const terrain = world.collision.terrain
    const trunks: Inst[] = []
    const branches: Inst[] = []
    const cones: Inst[] = []
    const spheres: Inst[] = []
    const fronds: Inst[] = []

    const place = (kind: TreeKind, p: { x: number; z: number; s: number; rot: number; y?: number }) => {
      const sp = SHAPE[kind]
      // The world assembler already resolved what this tree stands on, and its
      // collider is planted at that height; use the same number.
      const y = p.y ?? terrain(p.x, p.z)
      const h = sp.h * p.s
      const tr = sp.trunk * p.s * 0.5
      trunks.push({ p: [p.x, y + h * 0.32, p.z], s: [tr, h * 0.66, tr] })
      if (sp.canopy === 'CONE') {
        cones.push({ p: [p.x, y + h * 0.72, p.z], s: [sp.spread * p.s, h * 0.95, sp.spread * p.s], r: [0, p.rot, 0] })
      } else if (sp.canopy === 'SPHERE') {
        spheres.push({
          p: [p.x, y + h * 0.74, p.z],
          s: [sp.spread * p.s * 2, sp.spread * p.s * 1.5, sp.spread * p.s * 2],
          r: [0, p.rot, 0],
        })
        spheres.push({
          p: [p.x + tr * 1.6, y + h * 0.56, p.z - tr * 1.4],
          s: [sp.spread * p.s * 1.3, sp.spread * p.s * 1.0, sp.spread * p.s * 1.3],
          r: [0, p.rot * 1.7, 0],
        })
        if (detail > 1) {
          for (let i = 0; i < 3; i++) {
            const a = p.rot + (i / 3) * Math.PI * 2
            spheres.push({
              p: [p.x + Math.cos(a) * sp.spread * p.s * 0.42, y + h * (0.68 + i * 0.035), p.z + Math.sin(a) * sp.spread * p.s * 0.42],
              s: [sp.spread * p.s * 0.95, sp.spread * p.s * 0.72, sp.spread * p.s * 0.95],
              r: [0, a, 0],
            })
          }
          for (let i = 0; i < 4; i++) {
            const a = p.rot + (i / 4) * Math.PI * 2
            branches.push({
              p: [p.x + Math.cos(a) * sp.spread * p.s * 0.18, y + h * 0.5, p.z + Math.sin(a) * sp.spread * p.s * 0.18],
              s: [tr * 0.42, sp.spread * p.s * 0.86, tr * 0.42],
              r: [Math.sin(a) * 0.62, 0, Math.cos(a) * -0.62],
            })
          }
        }
      } else {
        const n = detail > 1 ? 11 : 7
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + p.rot
          fronds.push({
            p: [p.x + Math.cos(a) * sp.spread * p.s * 0.42, y + h * 0.94, p.z + Math.sin(a) * sp.spread * p.s * 0.42],
            s: [sp.spread * p.s * 1.5, 0.9 * p.s, 1],
            r: [-0.62, -a, 0.2],
          })
        }
      }
    }

    for (const t of world.props.trees) {
      place(t.variant === 1 ? env.secondaryTree : env.treeKind, t)
    }
    const shrubs: Inst[] = world.props.shrubs.map((s) => {
      const y = s.y ?? terrain(s.x, s.z)
      return {
        p: [s.x, y + 0.5 * s.s, s.z],
        s: [1.7 * s.s, 1.1 * s.s, 1.7 * s.s],
        r: [0, s.rot, 0],
      }
    })

    const tufts: Inst[] = []
    const count = Math.round(env.tuftCount * detail)
    const points = scatter(`${world.seed}:tufts`, {
      count,
      from: 6,
      to: world.ground * 0.98,
      minScale: 0.5,
      maxScale: 1.4,
      variants: 1,
      bias: 0.9,
    })
    const rand = new Rand(`${world.seed}:tuftpick`)
    for (const p of points) {
      const r = Math.hypot(p.x, p.z)
      if (rand.unit() > coverDensity(r, world.flatRadius, world.ground, env.lushness)) continue
      const y = terrain(p.x, p.z)
      // Grass grows in soil. Where the surface underfoot is built — paving, a
      // plinth, a flight of steps — a tuft would either sprout from stone or be
      // swallowed by it, so the point is skipped.
      if (world.collision.groundAt(p.x, p.z, Infinity) > y + 0.05) continue
      tufts.push({ p: [p.x, y + 0.22 * p.s, p.z], s: [0.5 * p.s, 0.85 * p.s, 0.5 * p.s], r: [0, p.rot, 0] })
    }

    return { trunks, branches, cones, spheres, fronds, shrubs, tufts }
  }, [world, env, detail])

  return (
    <group>
      <InstancedSet geometry={UNIT_CYL} material={trunkMat} items={built.trunks} />
      <InstancedSet geometry={UNIT_CYL} material={trunkMat} items={built.branches} receiveShadow={false} />
      <InstancedSet geometry={UNIT_CONE} material={canopyMat} items={built.cones} receiveShadow={false} />
      <InstancedSet geometry={detail > 1 ? UNIT_SPHERE_HI : UNIT_SPHERE} material={canopyMat} items={built.spheres} receiveShadow={false} />
      <InstancedSet geometry={LEAF_BLADE} material={canopyMat} items={built.fronds} castShadow={false} receiveShadow={false} />
      <InstancedSet geometry={detail > 1 ? UNIT_SPHERE_HI : UNIT_SPHERE} material={canopyMat} items={built.shrubs} receiveShadow={false} />
      <InstancedSet geometry={CROSS_BLADE} material={tuftMat} items={built.tufts} castShadow={false} receiveShadow={false} />
    </group>
  )
}
