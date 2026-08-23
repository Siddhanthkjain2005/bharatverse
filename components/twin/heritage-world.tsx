'use client'

/**
 * The world, assembled.
 *
 * Terrain, planting, ground works, documented enclosures, the monument's facade
 * and crown, and the atmosphere — all in one coordinate frame. There is no
 * separate interior scene: the sanctum is inside the building that stands in the
 * garden the visitor just crossed.
 */

import { memo } from 'react'
import type { LightRig } from '@/lib/twin/light'
import type { BuildStateKey } from '@/lib/twin/materials'
import type { WorldModel } from '@/lib/twin/model'
import type { ArchSpec } from '@/lib/twin/specs'
import { Birds, Dust, Fireflies, GroundMist, SunShafts } from './env/atmosphere'
import { DistantContext } from './env/distant-context'
import { GroundWorks } from './env/ground-works'
import { SiteScatter } from './env/scatter-props'
import { Terrain } from './env/terrain'
import { Vegetation } from './env/vegetation'
import { WaterFeatures } from './env/water'
import { Crown } from './monument/crown'
import { Extras } from './monument/extras'
import { Facade } from './monument/facade'
import { Enclosures } from './structures/enclosure'
import { Fittings } from './structures/fittings'
import { InteriorDetails } from './structures/interior-details'
import { Roofs } from './structures/roofs'
import type { TwinMaterials } from './use-twin-materials'

export const HeritageWorld = memo(function HeritageWorld({
  world,
  spec,
  mats,
  rig,
  progress,
  state,
  reducedMotion,
  quality = 1,
  showAtmosphere = true,
}: {
  world: WorldModel
  spec: ArchSpec
  mats: TwinMaterials
  rig: LightRig
  progress: number
  state: BuildStateKey
  reducedMotion: boolean
  quality?: number
  showAtmosphere?: boolean
}) {
  const core = world.core
  const foundationOnly = progress < 0.16

  return (
    <group>
      <Terrain world={world} mats={mats} />
      <DistantContext world={world} mats={mats} detail={quality} />
      <GroundWorks world={world} mats={mats} />
      {world.water.length > 0 && <WaterFeatures world={world} mats={mats} />}
      <Vegetation world={world} mats={mats} reducedMotion={reducedMotion} detail={quality} />
      <SiteScatter world={world} mats={mats} />

      {!foundationOnly && (
        <>
          <Enclosures world={world} spec={spec} mats={mats} />
          <Roofs world={world} spec={spec} mats={mats} progress={progress} />
          <Fittings world={world} mats={mats} />
          <InteriorDetails world={world} mats={mats} rig={rig} reducedMotion={reducedMotion} detail={quality} />
          {core && <Facade world={world} core={core} spec={spec} mats={mats} />}
        </>
      )}
      {core && <Crown world={world} core={core} spec={spec} mats={mats} progress={progress} state={state} />}
      <Extras world={world} spec={spec} mats={mats} progress={progress} />

      {showAtmosphere && (
        <>
          <Dust rig={rig} reducedMotion={reducedMotion} extent={world.extent} quality={quality} />
          {quality > 0.95 && <GroundMist world={world} rig={rig} reducedMotion={reducedMotion} />}
          {quality > 0.6 && <Fireflies world={world} rig={rig} reducedMotion={reducedMotion} quality={quality} />}
          {core && (
            <SunShafts
              rig={rig}
              origin={[core.rect.cx, core.floorY, core.rect.cz + core.rect.d / 2 + 2]}
              height={core.wallH}
              radius={Math.max(core.rect.w, core.rect.d)}
            />
          )}
          {rig.stars < 0.5 && (
            <Birds
              radius={world.extent * 1.4}
              height={(core ? core.floorY + core.wallH : 16) + 22}
              reducedMotion={reducedMotion}
              count={quality > 1 ? 15 : 9}
            />
          )}
        </>
      )}
    </group>
  )
})

HeritageWorld.displayName = 'HeritageWorld'
