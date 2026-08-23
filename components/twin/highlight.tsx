'use client'

/**
 * Selection highlight for the architecture inspector.
 *
 * A framed volume with corner brackets rather than a coloured overlay — it reads
 * as a measurement drawing laid over the building, which is the register this
 * product wants.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ArchBox } from '@/lib/twin/architecture'
import { UNIT_BOX } from '@/lib/twin/geometry'
import { InstancedSet, type Inst } from './detail/instanced'

export function HighlightBox({ box, color }: { box: ArchBox; color: string }) {
  const h = Math.max(0.4, box.y1 - box.y0)
  const cy = (box.y0 + box.y1) / 2

  const edgeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [color],
  )

  const shellMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.BackSide,
        fog: false,
      }),
    [color],
  )

  useEffect(
    () => () => {
      edgeMat.dispose()
      shellMat.dispose()
    },
    [edgeMat, shellMat],
  )

  const brackets = useMemo<Inst[]>(() => {
    const t = Math.min(0.24, Math.max(0.08, Math.min(box.w, box.d) * 0.02))
    const armX = Math.min(box.w * 0.28, 3)
    const armZ = Math.min(box.d * 0.28, 3)
    const armY = Math.min(h * 0.28, 3)
    const out: Inst[] = []
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const px = sx * (box.w / 2)
          const pz = sz * (box.d / 2)
          const py = sy * (h / 2)
          out.push({ p: [px - sx * armX * 0.5, py, pz], s: [armX, t, t] })
          out.push({ p: [px, py, pz - sz * armZ * 0.5], s: [t, t, armZ] })
          out.push({ p: [px, py - sy * armY * 0.5, pz], s: [t, armY, t] })
        }
      }
    }
    return out
  }, [box.w, box.d, h])

  return (
    <group position={[box.cx, cy, box.cz]}>
      <InstancedSet
        geometry={UNIT_BOX}
        material={edgeMat}
        items={brackets}
        castShadow={false}
        receiveShadow={false}
      />
      <mesh material={shellMat} scale={[box.w, h, box.d]} geometry={UNIT_BOX} />
    </group>
  )
}
