'use client'

/**
 * Shared, cached geometry with world-scaled UVs.
 *
 * A box in three.js gets 0–1 UVs on every face regardless of its size, so a
 * 40-metre wall and a 2-metre block would show the same number of texture tiles.
 * These helpers rescale the UV attribute by real metres, which is what lets one
 * shared stone texture read correctly at every scale — and lets the whole twin
 * run on a handful of materials instead of hundreds.
 */

import * as THREE from 'three'

const CACHE = new Map<string, THREE.BufferGeometry>()

function keyed<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  const hit = CACHE.get(key)
  if (hit) return hit as T
  const geo = make()
  CACHE.set(key, geo)
  return geo
}

const q = (n: number) => Math.round(n * 100) / 100

/** Box with UVs measured in metres per `tile`. */
export function box(w: number, h: number, d: number, tile = 4): THREE.BoxGeometry {
  return keyed(`box:${q(w)}:${q(h)}:${q(d)}:${q(tile)}`, () => {
    const geo = new THREE.BoxGeometry(w, h, d)
    const uv = geo.attributes.uv as THREE.BufferAttribute
    // face order: +x, -x, +y, -y, +z, -z — four vertices each
    const spans: [number, number][] = [
      [d / tile, h / tile],
      [d / tile, h / tile],
      [w / tile, d / tile],
      [w / tile, d / tile],
      [w / tile, h / tile],
      [w / tile, h / tile],
    ]
    for (let f = 0; f < 6; f++) {
      const [su, sv] = spans[f]
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
      }
    }
    uv.needsUpdate = true
    return geo
  })
}

/** Ground-facing plane (already rotated flat) with metre-scaled UVs. */
export function slab(w: number, d: number, tile = 6): THREE.PlaneGeometry {
  return keyed(`slab:${q(w)}:${q(d)}:${q(tile)}`, () => {
    const geo = new THREE.PlaneGeometry(w, d, 1, 1)
    geo.rotateX(-Math.PI / 2)
    const uv = geo.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile))
    }
    uv.needsUpdate = true
    return geo
  })
}

export function cylinder(
  rt: number,
  rb: number,
  h: number,
  seg = 16,
  tile = 4,
  open = false,
): THREE.CylinderGeometry {
  return keyed(`cyl:${q(rt)}:${q(rb)}:${q(h)}:${seg}:${q(tile)}:${open}`, () => {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)
    const uv = geo.attributes.uv as THREE.BufferAttribute
    const circ = (Math.PI * (rt + rb)) / tile
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * (h / tile))
    }
    uv.needsUpdate = true
    return geo
  })
}

export function sphere(r: number, wSeg = 20, hSeg = 14, phi = Math.PI * 2, theta = Math.PI) {
  return keyed(`sph:${q(r)}:${wSeg}:${hSeg}:${q(phi)}:${q(theta)}`, () =>
    new THREE.SphereGeometry(r, wSeg, hSeg, 0, phi, 0, theta),
  )
}

export function cone(r: number, h: number, seg = 10) {
  return keyed(`cone:${q(r)}:${q(h)}:${seg}`, () => new THREE.ConeGeometry(r, h, seg))
}

export function torus(r: number, tube: number, radial = 8, tubular = 24, arc = Math.PI * 2) {
  return keyed(`tor:${q(r)}:${q(tube)}:${radial}:${tubular}:${q(arc)}`, () =>
    new THREE.TorusGeometry(r, tube, radial, tubular, arc),
  )
}

export function dodeca(r: number, detail = 0) {
  return keyed(`dod:${q(r)}:${detail}`, () => new THREE.DodecahedronGeometry(r, detail))
}

/** Unit box used by every InstancedMesh that scatters cuboids. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
export const UNIT_ROCK = new THREE.DodecahedronGeometry(0.5, 0)
export const UNIT_ROCK_HI = new THREE.DodecahedronGeometry(0.5, 1)
export const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
export const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 8)
export const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 10, 8)
export const UNIT_SPHERE_HI = new THREE.SphereGeometry(0.5, 18, 13)
export const UNIT_PLANE = new THREE.PlaneGeometry(1, 1)

/** Tapered palm/leaf blade; unlike a rectangular plane it keeps a botanical silhouette. */
export const LEAF_BLADE = (() => {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      0, 0, 0,
      -0.22, 0.08, -0.05,
      0, 0.12, -1,
      0, 0, 0,
      0, 0.12, -1,
      0.22, 0.08, -0.05,
    ], 3),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([
      0.5, 0, 0, 0.08, 0.5, 1,
      0.5, 0, 0.5, 1, 1, 0.08,
    ], 2),
  )
  geo.computeVertexNormals()
  return geo
})()

/** A small swept-wing silhouette for the distant flock. */
export const BIRD_WING = (() => {
  const shape = new THREE.Shape()
  shape.moveTo(-1, 0)
  shape.lineTo(-0.12, 0.14)
  shape.lineTo(0, -0.05)
  shape.lineTo(0.12, 0.14)
  shape.lineTo(1, 0)
  shape.lineTo(0.2, 0.42)
  shape.lineTo(0, 0.18)
  shape.lineTo(-0.2, 0.42)
  shape.closePath()
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)
  return geo
})()

/** Cross-billboard used for grass tufts and low shrubs. */
export const CROSS_BLADE = (() => {
  const a = new THREE.PlaneGeometry(1, 1)
  a.translate(0, 0.5, 0)
  const b = a.clone()
  b.rotateY(Math.PI / 2)
  const geo = new THREE.BufferGeometry()
  const posA = a.attributes.position.array as Float32Array
  const posB = b.attributes.position.array as Float32Array
  const uvA = a.attributes.uv.array as Float32Array
  const idxA = Array.from(a.index!.array)
  const pos = new Float32Array(posA.length + posB.length)
  pos.set(posA, 0)
  pos.set(posB, posA.length)
  const uv = new Float32Array(uvA.length * 2)
  uv.set(uvA, 0)
  uv.set(uvA, uvA.length)
  const index = idxA.concat(idxA.map((i) => i + a.attributes.position.count))
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
})()
