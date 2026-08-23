import type { WorldSpace } from './model'

/**
 * One solved spiral, shared by the Qutb renderer and collision world.
 *
 * The earlier stair was only an attractive mesh, so the visitor fell through
 * it. These treads deliberately overlap along the walking line: the visible
 * stone remains radial, while each collision pad is broad enough for the
 * walker's centre to pass from one rise to the next without a gap.
 */
export interface SpiralTread {
  x: number
  z: number
  /** Centre height above the room floor. */
  y: number
  /** Walkable height above the room floor. */
  top: number
  angle: number
}

export interface SpiralStair {
  radius: number
  pathRadius: number
  treadWidth: number
  treadDepth: number
  treadThickness: number
  walkPad: number
  rise: number
  treads: SpiralTread[]
}

export function spiralStairFor(room: WorldSpace): SpiralStair {
  const count = 32
  const radius = Math.min(room.rect.w, room.rect.d) * 0.25
  const pathRadius = radius * 0.62
  const treadThickness = 0.15
  // Leave full standing clearance below the schematic chamber roof.
  const climb = Math.min(4.35, Math.max(2.8, room.wallH - 2.35))
  const rise = climb / count
  const start = Math.PI / 2
  const angleStep = 0.3
  const treads = Array.from({ length: count }, (_, i) => {
    const angle = start + i * angleStep
    const top = (i + 1) * rise
    return {
      x: Math.cos(angle) * pathRadius,
      z: Math.sin(angle) * pathRadius,
      y: top - treadThickness / 2,
      top,
      angle,
    }
  })

  return {
    radius,
    pathRadius,
    // Slim radial stones keep the stair readable from below instead of forming
    // a dense stack of floating slabs across the whole chamber.
    treadWidth: radius * 0.86,
    treadDepth: radius * 0.34,
    treadThickness,
    walkPad: Math.min(1.62, Math.max(1.35, radius * 0.52)),
    rise,
    treads,
  }
}
