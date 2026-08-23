import { yawAlong, type WorldModel, type WorldSpace } from './model'
import { interiorIdentityConfigFor } from './interior-identity-config'

/**
 * The interior destination that gives each monument an unmistakable identity.
 *
 * This is deliberately not an "idol for every site" table: a funerary chamber
 * and a mosque complex must not be dressed like a Hindu sanctum. Each entry
 * points to a real documented space and names the fitting already modelled there.
 */
export interface InteriorIdentity {
  space: WorldSpace
  label: string
  caption: string
}

export function interiorIdentityFor(world: WorldModel): InteriorIdentity | null {
  const identity = interiorIdentityConfigFor(world.site.slug)
  const space = identity
    ? world.spaces.find((candidate) => candidate.space.id === identity.spaceId)
    : null

  if (identity && space) return { space, label: identity.label, caption: identity.caption }

  const fallback =
    world.spaces.find((candidate) => candidate.space.kind === 'SANCTUM') ??
    world.spaces.find((candidate) => candidate.space.kind === 'CHAMBER') ??
    world.core

  return fallback
    ? {
        space: fallback,
        label: fallback.space.name,
        caption: `The documented focal space inside ${world.site.name}.`,
      }
    : null
}

/** Face the monument-specific focal object after an interior teleport. */
export function interiorIdentityYaw(
  world: WorldModel,
  spaceId: string,
  x: number,
  z: number,
  fallback: number,
): number {
  const identity = interiorIdentityFor(world)
  if (!identity || identity.space.space.id !== spaceId) return fallback
  let targetX = identity.space.rect.cx
  let targetZ = identity.space.rect.cz
  if (world.site.slug === 'konark-sun-temple') {
    targetX -= identity.space.rect.w * 0.18
    targetZ -= identity.space.rect.d * 0.24
  }
  return yawAlong(targetX - x, targetZ - z)
}
