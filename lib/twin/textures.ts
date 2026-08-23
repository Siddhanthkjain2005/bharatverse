'use client'

/**
 * Procedural surface maps for heritage materials.
 *
 * Nothing is downloaded: colour, roughness and normal maps are synthesised from
 * seeded noise in a canvas the first time a family is requested, then cached for
 * the life of the page. That keeps the twin dependency-free and offline-capable
 * while still giving stone the grain, coursing and soiling that flat colours
 * cannot express.
 */

import * as THREE from 'three'
import { clamp, makeFbm2D, smoothstep } from './rng'

export interface SurfaceRecipe {
  key: string
  size?: number
  /** Base albedo. */
  base: string
  /** Colour that shows in crevices and mortar joints. */
  crevice: string
  /** Noise frequency across the tile. */
  grain?: number
  grainAmp?: number
  /** Mineral speckle density, 0–1. */
  speckle?: number
  /** Marble-style veining strength, 0–1. */
  veins?: number
  /** Ashlar coursing: block height in pixels and joint width. */
  courses?: { h: number; w: number; joint: number } | null
  /** Weathering/soiling strength, 0–1. */
  dirt?: number
  roughBase?: number
  roughVar?: number
  normalStrength?: number
}

export interface SurfaceMaps {
  map: THREE.Texture | null
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
}

const CACHE = new Map<string, SurfaceMaps>()
const EMPTY: SurfaceMaps = { map: null, normalMap: null, roughnessMap: null }

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex)
  return [c.r * 255, c.g * 255, c.b * 255]
}

/** Sobel height → tangent-space normal, written straight into an RGBA buffer. */
function heightToNormal(
  height: Float32Array,
  size: number,
  strength: number,
  out: Uint8ClampedArray,
) {
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))
      let nx = dx * strength
      let ny = dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      const i = (y * size + x) * 4
      out[i] = (nx * 0.5 + 0.5) * 255
      out[i + 1] = (ny * 0.5 + 0.5) * 255
      out[i + 2] = (nz / len) * 255
      out[i + 3] = 255
    }
  }
}

function makeTexture(data: Uint8ClampedArray, size: number, srgb: boolean) {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

export function surfaceMaps(recipe: SurfaceRecipe): SurfaceMaps {
  const cached = CACHE.get(recipe.key)
  if (cached) return cached
  if (typeof window === 'undefined') return EMPTY

  const size = recipe.size ?? 256
  const grain = recipe.grain ?? 5
  const grainAmp = recipe.grainAmp ?? 0.5
  const speckle = recipe.speckle ?? 0.2
  const veins = recipe.veins ?? 0
  const dirt = recipe.dirt ?? 0.25
  const roughBase = recipe.roughBase ?? 0.8
  const roughVar = recipe.roughVar ?? 0.18

  const fine = makeFbm2D(`${recipe.key}:fine`, 4)
  const broad = makeFbm2D(`${recipe.key}:broad`, 3)
  const vein = makeFbm2D(`${recipe.key}:vein`, 3)
  const spec = makeFbm2D(`${recipe.key}:spec`, 2)
  const weather = makeFbm2D(`${recipe.key}:weather`, 5)
  const fracture = makeFbm2D(`${recipe.key}:fracture`, 2)

  const height = new Float32Array(size * size)
  const color = new Uint8ClampedArray(size * size * 4)
  const rough = new Uint8ClampedArray(size * size * 4)
  const [br, bg, bb] = hexToRgb(recipe.base)
  const [cr, cg, cb] = hexToRgb(recipe.crevice)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      let h = fine(u * grain * 4, v * grain * 4) * grainAmp
      h += broad(u * grain, v * grain) * 0.6

      // ashlar joints: recessed grooves on a running bond
      let joint = 0
      if (recipe.courses) {
        const { h: bh, w: bw, joint: jw } = recipe.courses
        const row = Math.floor(y / bh)
        const offset = (row % 2) * (bw / 2)
        const dy = y % bh
        const dx = (x + offset) % bw
        if (dy < jw || dx < jw) joint = 1
      }

      // marble veining: thin sinuous bands
      const vn = veins > 0 ? Math.abs(vein(u * 2.2, v * 2.2)) : 1
      const veinMask = veins > 0 ? Math.pow(1 - clamp(vn * 3.4, 0, 1), 2) * veins : 0

      // mineral speckle
      const sp = speckle > 0 ? clamp(spec(u * grain * 16, v * grain * 16), -1, 1) : 0
      const speckMask = speckle > 0 ? clamp(sp, 0, 1) * speckle : 0

      // Fine pits and hairline mineral fractures keep close-up stone from
      // reading as painted plastic. They remain deliberately restrained on
      // polished marble and become stronger as the material weathers.
      const pore = Math.pow(clamp(weather(u * grain * 28 + 3, v * grain * 28 - 5) * 0.5 + 0.5, 0, 1), 8)
      const fractureField = Math.abs(fracture(u * 3.2 + 19, v * 3.2 - 11))
      const crack = Math.pow(1 - clamp(fractureField * 8.5, 0, 1), 3) * dirt
      const streakNoise = clamp(weather(u * 2.1 - 9, v * 0.55 + 4) * 0.5 + 0.5, 0, 1)
      const streak = Math.pow(streakNoise, 3) * smoothstep(0.12, 0.92, v) * dirt * 0.18

      const soil = clamp(broad(u * 1.7 + 11, v * 1.7 - 7) * 0.5 + 0.5, 0, 1) * dirt
      const shade = clamp(0.5 + h * 0.5, 0, 1)
      const mix = clamp(joint * 0.85 + soil * 0.55 + (1 - shade) * 0.3 + crack * 0.28 + streak, 0, 1)

      const i = (y * size + x) * 4
      const tint = 1 - speckMask * 0.35 + veinMask * 0.12 - pore * dirt * 0.08
      color[i] = clamp((br * (1 - mix) + cr * mix) * tint, 0, 255)
      color[i + 1] = clamp((bg * (1 - mix) + cg * mix) * tint, 0, 255)
      color[i + 2] = clamp((bb * (1 - mix) + cb * mix) * tint, 0, 255)
      color[i + 3] = 255

      const r = clamp(roughBase + (shade - 0.5) * roughVar * 2 + joint * 0.1 - veinMask * 0.2 + pore * 0.12 + crack * 0.08, 0.05, 1)
      const g = Math.round(r * 255)
      rough[i] = g
      rough[i + 1] = g
      rough[i + 2] = g
      rough[i + 3] = 255

      height[y * size + x] = h * 0.5 - joint * 1.4 + veinMask * 0.2 + speckMask * 0.3 - pore * 0.18 - crack * 0.34
    }
  }

  const normal = new Uint8ClampedArray(size * size * 4)
  heightToNormal(height, size, recipe.normalStrength ?? 1.6, normal)

  const maps: SurfaceMaps = {
    map: makeTexture(color, size, true),
    roughnessMap: makeTexture(rough, size, false),
    normalMap: makeTexture(normal, size, false),
  }
  CACHE.set(recipe.key, maps)
  return maps
}
