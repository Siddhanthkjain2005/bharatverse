'use client'

/**
 * Terrain.
 *
 * The ground under a monument is levelled where the complex stands and undulates
 * beyond it — the archaeological platform reading you actually see on site. Ground
 * cover is painted into vertex colours, so grass, dry soil and exposed rock blend
 * across one mesh instead of showing a hard edge.
 *
 * A detailed inner plane carries everything a visitor can reach; a low-poly skirt
 * carries the same surface out past the distance at which fog closes, so the land
 * reads as continuing to the horizon instead of stopping at a visible edge.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { WorldModel } from '@/lib/twin/model'
import { clamp, makeFbm2D, smoothstep } from '@/lib/twin/rng'
import type { TwinMaterials } from '../use-twin-materials'

/**
 * Ground cover as a colour: watered near the complex, drier and rockier as it
 * climbs away. Returns a shared `Color` — copy it out before the next call.
 */
function coverPainter(world: WorldModel, lush: number) {
  const patch = makeFbm2D(`${world.seed}:patch`, 3)
  const grass = new THREE.Color('#5c6c39').lerp(new THREE.Color(world.site.palette.stone), 0.14)
  const soil = new THREE.Color('#6d563c').lerp(new THREE.Color(world.site.palette.stone), 0.2)
  const rockC = new THREE.Color(world.site.palette.stone).offsetHSL(0, -0.06, -0.16)
  const c = new THREE.Color()
  return (x: number, z: number, h: number) => {
    const r = Math.hypot(x, z)
    const dry = clamp(
      smoothstep(world.flatRadius * 0.8, world.ground * 0.85, r) * 0.85 +
        patch(x / 34, z / 34) * 0.35 +
        smoothstep(2, 9, h) * 0.5,
      0,
      1,
    )
    const rocky = clamp(smoothstep(5, 14, h) + patch(x / 18 + 7, z / 18 - 3) * 0.28, 0, 1)
    return c.copy(grass).lerp(soil, dry * (1.25 - lush * 0.5)).lerp(rockC, rocky * 0.7)
  }
}

/** Displace a ground mesh onto the terrain and paint its cover into vertex colours. */
function drapeGround(
  geo: THREE.BufferGeometry,
  world: WorldModel,
  paint: (x: number, z: number, h: number) => THREE.Color,
  drop = 0,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const terrain = world.collision.terrain
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = terrain(x, z)
    pos.setY(i, h - drop)
    const c = paint(x, z, h)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    // One texel repeat every 7 m, whatever the mesh's own parameterisation.
    uv.setXY(i, x / 7, z / 7)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  uv.needsUpdate = true
  return geo
}

export function Terrain({ world, mats }: { world: WorldModel; mats: TwinMaterials }) {
  const { m, pick } = mats
  const lush = world.env.lushness

  const { geometry, skirt } = useMemo(() => {
    const paint = coverPainter(world, lush)
    const size = world.ground * 2.5
    const plane = new THREE.PlaneGeometry(size, size, 108, 108)
    plane.rotateX(-Math.PI / 2)

    /**
     * The skirt. Its inner edge sits well inside the detailed plane and 0.3 m
     * below it, so the plane hides the overlap; beyond the plane it carries the
     * same terrain function out to just short of the sky dome (`ground * 2.4`),
     * by which distance every rig's fog has closed completely.
     */
    const ring = new THREE.RingGeometry(world.ground * 1.12, world.ground * 2.28, 96, 8)
    ring.rotateX(-Math.PI / 2)

    return {
      geometry: drapeGround(plane, world, paint),
      skirt: drapeGround(ring, world, paint, 0.3),
    }
  }, [world, lush])

  const material = useMemo(() => {
    const base = pick(m.soil, 'CONTEXTUAL') as THREE.MeshStandardMaterial
    const mat = base.clone()
    mat.vertexColors = true
    mat.color.set(0xffffff)
    if (mat.normalMap) mat.normalScale.set(0.6, 0.6)
    return mat
  }, [m.soil, pick])

  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      {/* Far ground: no shadows, and never in front of anything a visitor can reach. */}
      <mesh geometry={skirt} material={material} />
    </>
  )
}
