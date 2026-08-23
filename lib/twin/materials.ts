'use client'

/**
 * The heritage material system.
 *
 * One shared, cached set of PBR materials per (site, build state, lens) so the
 * whole twin — monument, structures, ground, props — draws from a handful of
 * materials instead of hundreds. Surfaces are procedurally textured, tinted by
 * the site palette and biased toward the documented fabric of the building.
 */

import * as THREE from 'three'
import type { HeritageSite } from '@/lib/heritage/types'
import { FAMILY, siteFamilies, type MaterialFamily } from './material-families'
import { surfaceMaps } from './textures'

export type EvidenceClass =
  | 'DOCUMENTED'
  | 'RECONSTRUCTED'
  | 'INTERPRETIVE'
  | 'AI_ASSISTED'
  | 'CONTEXTUAL'

export type BuildStateKey = 'FOUNDATION' | 'CONSTRUCTION' | 'COMPLETE' | 'DAMAGED' | 'RESTORED'

const CANON: Record<MaterialFamily, string> = {
  MARBLE: '#ece7dc', SANDSTONE: '#b06a42', GRANITE: '#9a9490', BASALT: '#6b665f',
  LATERITE: '#a05a33', BRICK: '#9c5334', PLASTER: '#d8cdb8', SOIL: '#6b543c',
  GRASS: '#59683a', WOOD: '#6b4a2c', METAL: '#b9a069', OXIDIZED: '#6f8a72',
}

function mixHex(a: string, b: string, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t)
}

interface StoneOpts {
  key: string
  family: MaterialFamily
  color: THREE.Color
  dirtScale: number
  lightness?: number
}

function stoneMaterial({ key, family, color, dirtScale, lightness = 0 }: StoneOpts) {
  const f = FAMILY[family]
  const base = color.clone()
  base.offsetHSL(0, 0, lightness)
  const crevice = base.clone().offsetHSL(0.008, 0.04, -0.16)
  const maps = surfaceMaps({
    key,
    // The dominant monument stone gets the close-up map; secondary/floor/
    // landscape families stay at the normal resolution so initialisation does
    // not stall while a dozen unseen textures are synthesised.
    size: key.endsWith(':stone') ? 384 : 256,
    base: `#${base.getHexString()}`,
    crevice: `#${crevice.getHexString()}`,
    grain: f.grain,
    grainAmp: f.grainAmp,
    speckle: f.speckle,
    veins: f.veins,
    dirt: Math.min(0.85, f.dirt * dirtScale),
    roughBase: f.roughBase,
    roughVar: f.roughVar,
    normalStrength: f.normalStrength,
    courses: f.courses,
  })
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: f.metalness,
  })
  if (maps.map) mat.map = maps.map
  if (maps.normalMap) mat.normalMap = maps.normalMap
  if (maps.roughnessMap) mat.roughnessMap = maps.roughnessMap
  if (!maps.map) mat.color.copy(base)
  if (mat.normalMap) mat.normalScale.set(family === 'MARBLE' ? 0.58 : 0.92, family === 'MARBLE' ? 0.58 : 0.92)
  return mat
}

export interface MaterialSet {
  primary: MaterialFamily
  tile: number
  accentTile: number
  stone: THREE.MeshStandardMaterial
  stoneAlt: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  trim: THREE.MeshStandardMaterial
  floor: THREE.MeshStandardMaterial
  paving: THREE.MeshStandardMaterial
  soil: THREE.MeshStandardMaterial
  grass: THREE.MeshStandardMaterial
  rock: THREE.MeshStandardMaterial
  water: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  foliage: THREE.MeshStandardMaterial
  trunk: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
  ghost: THREE.MeshBasicMaterial
}

const SET_CACHE = new Map<string, MaterialSet>()
const LENS_CACHE = new Map<string, THREE.Material>()

const DIRT: Record<BuildStateKey, number> = {
  FOUNDATION: 0.5, CONSTRUCTION: 0.6, COMPLETE: 1, DAMAGED: 1.7, RESTORED: 0.72,
}

export function buildMaterials(site: HeritageSite, state: BuildStateKey): MaterialSet {
  const cacheKey = `${site.id}:${state}`
  const hit = SET_CACHE.get(cacheKey)
  if (hit) return hit

  const families = siteFamilies(site)
  const primary = families[0]
  const secondary = families.find((f, i) => i > 0 && f !== primary) ?? primary
  const dirt = DIRT[state]
  const k = `${site.id}:${state}`

  const stoneColor = mixHex(site.palette.stone, CANON[primary], 0.42)
  const accentColor = mixHex(CANON[secondary], site.palette.accent, 0.34)
  const worn = state === 'DAMAGED'

  const set: MaterialSet = {
    primary,
    tile: FAMILY[primary].tile,
    accentTile: FAMILY[secondary].tile,
    stone: stoneMaterial({ key: `${k}:stone`, family: primary, color: stoneColor, dirtScale: dirt }),
    stoneAlt: stoneMaterial({ key: `${k}:stoneAlt`, family: primary, color: stoneColor, dirtScale: dirt * 1.25, lightness: -0.035 }),
    accent: stoneMaterial({ key: `${k}:accent`, family: secondary, color: accentColor, dirtScale: dirt }),
    dark: stoneMaterial({ key: `${k}:dark`, family: primary, color: stoneColor, dirtScale: dirt * 1.5, lightness: -0.13 }),
    floor: stoneMaterial({ key: `${k}:floor`, family: primary, color: stoneColor, dirtScale: dirt * 1.1, lightness: -0.06 }),
    paving: stoneMaterial({ key: `${k}:paving`, family: secondary === primary ? 'GRANITE' : secondary, color: mixHex(site.palette.stone, '#8b8377', 0.5), dirtScale: dirt * 1.5, lightness: -0.09 }),
    soil: stoneMaterial({ key: `${k}:soil`, family: 'SOIL', color: mixHex(CANON.SOIL, site.palette.stone, 0.24), dirtScale: 1 }),
    grass: stoneMaterial({ key: `${k}:grass`, family: 'GRASS', color: mixHex(CANON.GRASS, site.palette.stone, 0.16), dirtScale: 1 }),
    rock: stoneMaterial({ key: `${k}:rock`, family: primary === 'MARBLE' ? 'GRANITE' : primary, color: stoneColor.clone().offsetHSL(0, -0.02, -0.08), dirtScale: dirt * 1.4 }),
    wood: stoneMaterial({ key: `${k}:wood`, family: 'WOOD', color: new THREE.Color(CANON.WOOD), dirtScale: dirt }),
    trunk: stoneMaterial({ key: `${k}:trunk`, family: 'WOOD', color: new THREE.Color('#4e3b28'), dirtScale: 1.3 }),
    metal: new THREE.MeshStandardMaterial({ color: new THREE.Color(site.palette.accent).offsetHSL(0, 0.05, -0.06), roughness: 0.32, metalness: 0.82 }),
    trim: new THREE.MeshStandardMaterial({ color: new THREE.Color(site.palette.accent), roughness: worn ? 0.62 : 0.38, metalness: 0.38 }),
    water: new THREE.MeshStandardMaterial({
      color: new THREE.Color(site.palette.sky).lerp(new THREE.Color('#284f5d'), 0.72),
      roughness: 0.1,
      metalness: 0.42,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
    foliage: new THREE.MeshStandardMaterial({ color: new THREE.Color('#3d5429'), roughness: 0.78, metalness: 0, side: THREE.DoubleSide }),
    glow: new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffd9a0'), emissive: new THREE.Color('#ffb066'), emissiveIntensity: 2.4, roughness: 0.5 }),
    ghost: new THREE.MeshBasicMaterial({ color: new THREE.Color(site.palette.accent), wireframe: true, transparent: true, opacity: 0.18 }),
  }
  SET_CACHE.set(cacheKey, set)
  return set
}

const LENS_TINT: Record<EvidenceClass, { hue: number; sat: number; light: number; opacity: number; emissive: string }> = {
  DOCUMENTED: { hue: 0, sat: 0, light: 0, opacity: 1, emissive: '#000000' },
  RECONSTRUCTED: { hue: 0.5, sat: -0.34, light: 0.02, opacity: 1, emissive: '#12232e' },
  INTERPRETIVE: { hue: 0.52, sat: -0.5, light: -0.02, opacity: 0.9, emissive: '#1b1630' },
  AI_ASSISTED: { hue: 0.78, sat: -0.42, light: 0.03, opacity: 0.94, emissive: '#241a30' },
  CONTEXTUAL: { hue: 0.55, sat: -0.68, light: -0.05, opacity: 0.72, emissive: '#0d1418' },
}

/**
 * Evidence Lens: a cached variant of a material that says, without a text
 * overlay, how well attested the surface it covers actually is.
 */
export function lensVariant(base: THREE.Material, cls: EvidenceClass, key: string): THREE.Material {
  if (cls === 'DOCUMENTED') return base
  const id = `${key}:${cls}`
  const hit = LENS_CACHE.get(id)
  if (hit) return hit
  const m = base.clone() as THREE.MeshStandardMaterial
  const t = LENS_TINT[cls]
  if (m.color) m.color.offsetHSL(0, t.sat, t.light)
  if ('emissive' in m) {
    m.emissive = new THREE.Color(t.emissive)
    m.emissiveIntensity = 1
  }
  if (t.opacity < 1) {
    m.transparent = true
    m.opacity = t.opacity
    m.depthWrite = t.opacity > 0.85
  }
  LENS_CACHE.set(id, m)
  return m
}
