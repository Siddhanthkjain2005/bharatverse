/**
 * Archetype extras with a physical presence.
 *
 * Detached minarets, chariot wheels, the horses at a ceremonial approach and the
 * rock scarp a vihara is cut into all need to exist in the collision world as
 * well as on screen, so their placement is solved here and consumed by both.
 */

import type { WorldSpace } from './model'
import type { ArchSpec } from './specs'

export interface Minaret {
  x: number
  z: number
  r: number
  h: number
  stages: number
}

export interface Wheel {
  x: number
  z: number
  r: number
  y: number
  /** Rotation about Y so the wheel lies against the plinth face. */
  rot: number
}

export interface Horse {
  x: number
  z: number
  rot: number
}

export interface Cliff {
  /** Rock mass behind the excavated facade. */
  back: { x: number; z: number; w: number; d: number; h: number }
  /** Rock over the chamber. */
  cap: { x: number; z: number; w: number; d: number; y: number; h: number }
  /** Scarp wings either side. */
  wings: { x: number; z: number; w: number; d: number; h: number }[]
}

export interface Extras {
  minarets: Minaret[]
  wheels: Wheel[]
  horses: Horse[]
  cliff: Cliff | null
}

const APRON = 2.8

export function extrasFor(core: WorldSpace | null, spec: ArchSpec, extent: number): Extras {
  const out: Extras = { minarets: [], wheels: [], horses: [], cliff: null }
  if (!core) return out
  const { cx, cz, w, d } = core.rect
  const px = w / 2 + APRON
  const pz = d / 2 + APRON

  if (spec.extras.includes('MINARETS')) {
    const r = Math.max(1.4, Math.min(w, d) * 0.11)
    const h = core.wallH * 1.42
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.minarets.push({ x: cx + sx * (px + r * 1.7), z: cz + sz * (pz + r * 1.7), r, h, stages: 3 })
      }
    }
  }

  if (spec.extras.includes('WHEELS')) {
    const r = Math.min(2.7, Math.max(1.5, core.floorY * 0.56))
    const y = r + 0.5
    const count = 6
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count
        out.wheels.push({
          x: cx - (w + APRON * 2) / 2 + (w + APRON * 2) * t,
          z: cz + side * (pz + 0.42),
          r,
          y,
          rot: side > 0 ? 0 : Math.PI,
        })
      }
    }
  }

  if (spec.extras.includes('HORSES')) {
    for (let i = 0; i < 7; i++) {
      out.horses.push({
        x: cx - 9 + i * 3,
        z: cz + pz + 8 + (i % 2) * 1.7,
        rot: 0.08 * (i - 3),
      })
    }
  }

  if (spec.extras.includes('CLIFF')) {
    const backD = 34
    const capH = 15
    out.cliff = {
      back: { x: cx, z: cz - pz - backD / 2 + 1, w: Math.max(extent * 1.5, w * 3.2), d: backD, h: core.floorY + core.wallH + capH },
      cap: { x: cx, z: cz, w: w + spec.wallT * 2 + 9, d: d + spec.wallT * 2 + 6, y: core.floorY + core.wallH + 0.9, h: capH },
      wings: [-1, 1].map((s) => ({
        x: cx + s * (Math.max(extent * 0.62, w * 1.6)),
        z: cz - pz * 0.2,
        w: Math.max(extent * 0.55, w * 1.5),
        d: 26,
        h: core.floorY + core.wallH + capH * 0.86,
      })),
    }
  }

  return out
}
