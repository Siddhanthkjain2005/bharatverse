'use client'

/**
 * Instanced draw helper.
 *
 * Ornamental repetition is what makes historic architecture read as historic —
 * hundreds of blocks in a course, brackets under a cornice, tufts of grass. All
 * of it goes through one instanced draw call per set, so detail costs geometry,
 * not frame time.
 */

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface Inst {
  p: [number, number, number]
  /** Uniform scale, or per-axis. */
  s?: number | [number, number, number]
  r?: [number, number, number]
}

const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()
const E = new THREE.Euler()
const V = new THREE.Vector3()
const S = new THREE.Vector3()

export function InstancedSet({
  geometry,
  material,
  items,
  castShadow = true,
  receiveShadow = true,
  frustumCulled = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Inst[]
  castShadow?: boolean
  receiveShadow?: boolean
  frustumCulled?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = Math.max(1, items.length)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      V.set(it.p[0], it.p[1], it.p[2])
      if (typeof it.s === 'number') S.setScalar(it.s)
      else if (it.s) S.set(it.s[0], it.s[1], it.s[2])
      else S.setScalar(1)
      if (it.r) E.set(it.r[0], it.r[1], it.r[2])
      else E.set(0, 0, 0)
      Q.setFromEuler(E)
      M.compose(V, Q, S)
      mesh.setMatrixAt(i, M)
    }
    mesh.count = items.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  if (items.length === 0) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, count]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={frustumCulled}
    />
  )
}
