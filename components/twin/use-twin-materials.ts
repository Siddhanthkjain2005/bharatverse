'use client'

import { useCallback, useMemo } from 'react'
import type * as THREE from 'three'
import type { HeritageSite } from '@/lib/heritage/types'
import {
  buildMaterials,
  lensVariant,
  type BuildStateKey,
  type EvidenceClass,
  type MaterialSet,
} from '@/lib/twin/materials'

export interface TwinMaterials {
  m: MaterialSet
  /**
   * Returns the material to actually draw with. With the Evidence Lens off this
   * is the identity; with it on, reconstructed and contextual surfaces are shifted
   * so the visitor can see at a glance which parts of the scene the record
   * actually supports.
   */
  pick: (mat: THREE.Material, cls: EvidenceClass) => THREE.Material
  lensOn: boolean
}

export function useTwinMaterials(
  site: HeritageSite,
  state: BuildStateKey,
  lensOn: boolean,
): TwinMaterials {
  const m = useMemo(() => buildMaterials(site, state), [site, state])
  const pick = useCallback(
    (mat: THREE.Material, cls: EvidenceClass) =>
      lensOn ? lensVariant(mat, cls, `${site.id}:${state}:${mat.uuid}`) : mat,
    [lensOn, site.id, state],
  )
  return useMemo(() => ({ m, pick, lensOn }), [m, pick, lensOn])
}
