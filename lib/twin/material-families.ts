/**
 * Material identity for each monument.
 *
 * The family is read from `site.materials` — the documented fabric of the
 * building — rather than guessed from the archetype, so a granite temple and a
 * marble tomb never share a surface. Colour comes from `site.palette`, so the
 * curated tone of each record still drives the render.
 */

import type { HeritageSite } from '@/lib/heritage/types'
import type { SurfaceRecipe } from './textures'

export type MaterialFamily =
  | 'MARBLE'
  | 'SANDSTONE'
  | 'GRANITE'
  | 'BASALT'
  | 'LATERITE'
  | 'BRICK'
  | 'PLASTER'
  | 'SOIL'
  | 'GRASS'
  | 'WOOD'
  | 'METAL'
  | 'OXIDIZED'

const KEYWORDS: [RegExp, MaterialFamily][] = [
  [/marble|makrana/i, 'MARBLE'],
  [/sandstone/i, 'SANDSTONE'],
  [/granite|charnockite/i, 'GRANITE'],
  [/basalt|dolerite|deccan trap/i, 'BASALT'],
  [/laterite|khondalite/i, 'LATERITE'],
  [/brick/i, 'BRICK'],
  [/plaster|stucco|lime|mortar/i, 'PLASTER'],
  [/wood|teak|timber/i, 'WOOD'],
  [/iron|bronze|copper|metal/i, 'METAL'],
]

/** Ordered families documented for this site, strongest first. */
export function siteFamilies(site: HeritageSite): MaterialFamily[] {
  const found: MaterialFamily[] = []
  for (const entry of site.materials) {
    for (const [re, family] of KEYWORDS) {
      if (re.test(entry) && !found.includes(family)) found.push(family)
    }
  }
  if (found.length === 0) found.push('SANDSTONE')
  return found
}

export interface FamilyTuning {
  /** Multiplied into the palette stone colour. */
  lightness: number
  saturation: number
  roughBase: number
  roughVar: number
  metalness: number
  grain: number
  grainAmp: number
  speckle: number
  veins: number
  dirt: number
  normalStrength: number
  courses: SurfaceRecipe['courses']
  /** World metres covered by one texture tile. */
  tile: number
}

export const FAMILY: Record<MaterialFamily, FamilyTuning> = {
  MARBLE: {
    lightness: 1.0, saturation: 0.7, roughBase: 0.34, roughVar: 0.16, metalness: 0.02,
    grain: 3, grainAmp: 0.22, speckle: 0.05, veins: 0.55, dirt: 0.16, normalStrength: 0.7,
    courses: { h: 128, w: 256, joint: 2 }, tile: 6,
  },
  SANDSTONE: {
    lightness: 0.94, saturation: 1.08, roughBase: 0.82, roughVar: 0.2, metalness: 0.0,
    grain: 6, grainAmp: 0.5, speckle: 0.22, veins: 0.12, dirt: 0.3, normalStrength: 1.8,
    courses: { h: 64, w: 128, joint: 3 }, tile: 4,
  },
  GRANITE: {
    lightness: 0.86, saturation: 0.7, roughBase: 0.7, roughVar: 0.22, metalness: 0.04,
    grain: 8, grainAmp: 0.4, speckle: 0.5, veins: 0.05, dirt: 0.26, normalStrength: 1.5,
    courses: { h: 86, w: 172, joint: 4 }, tile: 5,
  },
  BASALT: {
    lightness: 0.7, saturation: 0.6, roughBase: 0.88, roughVar: 0.2, metalness: 0.02,
    grain: 7, grainAmp: 0.55, speckle: 0.3, veins: 0.0, dirt: 0.34, normalStrength: 2.0,
    courses: null, tile: 4.5,
  },
  LATERITE: {
    lightness: 0.9, saturation: 1.25, roughBase: 0.9, roughVar: 0.24, metalness: 0.0,
    grain: 9, grainAmp: 0.7, speckle: 0.36, veins: 0.0, dirt: 0.38, normalStrength: 2.4,
    courses: { h: 58, w: 116, joint: 4 }, tile: 3.4,
  },
  BRICK: {
    lightness: 0.86, saturation: 1.3, roughBase: 0.86, roughVar: 0.16, metalness: 0.0,
    grain: 7, grainAmp: 0.34, speckle: 0.16, veins: 0.0, dirt: 0.34, normalStrength: 2.2,
    courses: { h: 26, w: 78, joint: 4 }, tile: 2.2,
  },
  PLASTER: {
    lightness: 1.04, saturation: 0.55, roughBase: 0.9, roughVar: 0.12, metalness: 0.0,
    grain: 4, grainAmp: 0.3, speckle: 0.06, veins: 0.0, dirt: 0.4, normalStrength: 0.9,
    courses: null, tile: 5,
  },
  SOIL: {
    lightness: 0.62, saturation: 1.15, roughBase: 0.95, roughVar: 0.14, metalness: 0.0,
    grain: 10, grainAmp: 0.8, speckle: 0.3, veins: 0.0, dirt: 0.5, normalStrength: 1.6,
    courses: null, tile: 7,
  },
  GRASS: {
    lightness: 0.5, saturation: 1.0, roughBase: 0.95, roughVar: 0.12, metalness: 0.0,
    grain: 12, grainAmp: 0.9, speckle: 0.35, veins: 0.0, dirt: 0.2, normalStrength: 1.2,
    courses: null, tile: 5,
  },
  WOOD: {
    lightness: 0.7, saturation: 1.2, roughBase: 0.72, roughVar: 0.18, metalness: 0.0,
    grain: 3, grainAmp: 0.3, speckle: 0.05, veins: 0.7, dirt: 0.28, normalStrength: 1.1,
    courses: null, tile: 2.4,
  },
  METAL: {
    lightness: 0.9, saturation: 0.8, roughBase: 0.36, roughVar: 0.2, metalness: 0.72,
    grain: 5, grainAmp: 0.24, speckle: 0.12, veins: 0.1, dirt: 0.24, normalStrength: 0.8,
    courses: null, tile: 3,
  },
  OXIDIZED: {
    lightness: 0.74, saturation: 1.4, roughBase: 0.72, roughVar: 0.24, metalness: 0.35,
    grain: 8, grainAmp: 0.5, speckle: 0.28, veins: 0.1, dirt: 0.45, normalStrength: 1.4,
    courses: null, tile: 2.6,
  },
}
