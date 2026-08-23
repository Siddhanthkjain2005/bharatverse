/**
 * Lighting rigs.
 *
 * Four times of day, each authored so the light *reveals* the architecture
 * rather than merely making it visible: raking dawn and dusk to pull the carved
 * registers out of the wall, flat high noon to read plan and mass, and a cool
 * moonlit night where the built lamps carry the scene.
 */

export type TimeOfDay = 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT'

export interface LightRig {
  label: string
  /** Direction the light comes *from*, scaled to a scene-sized position. */
  sun: [number, number, number]
  sunColor: string
  sunIntensity: number
  skyTop: string
  skyHorizon: string
  skyGround: string
  ambientSky: string
  ambientGround: string
  ambientIntensity: number
  fog: string
  fogDensity: number
  exposure: number
  /** Multiplier on built lamps and emissive fittings. */
  lamp: number
  stars: number
  /** Atmospheric haze/dust visibility. */
  haze: number
  sunDisc: number
  /**
   * Fill from the side the sun is not on. Near midday that is warm light
   * returned from sunlit ground; near the horizon it is the open sky, which is
   * blue — and getting that right is what keeps white marble reading as marble
   * at dusk instead of turning copper on every face.
   */
  bounce: string
  bounceIntensity: number
}

export const LIGHT_RIG: Record<TimeOfDay, LightRig> = {
  DAWN: {
    label: 'Dawn',
    sun: [-0.92, 0.2, 0.78],
    sunColor: '#ffcfa2',
    sunIntensity: 2.5,
    skyTop: '#2c3c62',
    skyHorizon: '#e9a878',
    skyGround: '#3a3024',
    ambientSky: '#93a9d6',
    ambientGround: '#4b4032',
    ambientIntensity: 0.7,
    fog: '#7a7180',
    fogDensity: 0.0030,
    exposure: 1.04,
    lamp: 0.55,
    stars: 0.18,
    haze: 0.75,
    sunDisc: 1.5,
    bounce: '#8fa4d2',
    bounceIntensity: 0.3,
  },
  NOON: {
    label: 'Noon',
    sun: [0.38, 1, 0.34],
    sunColor: '#fff3de',
    sunIntensity: 3.35,
    skyTop: '#4c7cbe',
    skyHorizon: '#cdd7e0',
    skyGround: '#6d6454',
    ambientSky: '#a9c3e9',
    ambientGround: '#6b6151',
    ambientIntensity: 0.8,
    fog: '#bcc0c6',
    fogDensity: 0.0014,
    exposure: 1.0,
    lamp: 0.0,
    stars: 0,
    haze: 0.32,
    sunDisc: 0.9,
    bounce: '#fff0d8',
    bounceIntensity: 0.2,
  },
  DUSK: {
    label: 'Dusk',
    sun: [0.95, 0.16, -0.5],
    sunColor: '#ffb582',
    sunIntensity: 2.6,
    skyTop: '#1e2240',
    skyHorizon: '#ff9a5a',
    skyGround: '#2b2018',
    ambientSky: '#8894cf',
    ambientGround: '#4d3526',
    ambientIntensity: 0.68,
    fog: '#5a4340',
    fogDensity: 0.0032,
    exposure: 1.06,
    lamp: 0.95,
    stars: 0.22,
    haze: 0.9,
    sunDisc: 1.9,
    bounce: '#7d8dc4',
    bounceIntensity: 0.4,
  },
  NIGHT: {
    label: 'Night',
    sun: [-0.5, 0.8, -0.42],
    sunColor: '#b8c8ff',
    sunIntensity: 0.6,
    skyTop: '#060a15',
    skyHorizon: '#18213c',
    skyGround: '#0c0e15',
    ambientSky: '#2b3a68',
    ambientGround: '#15171e',
    ambientIntensity: 0.38,
    fog: '#0d1220',
    fogDensity: 0.0036,
    exposure: 1.16,
    lamp: 1.5,
    stars: 1,
    haze: 0.55,
    sunDisc: 1.1,
    bounce: '#3d4f86',
    bounceIntensity: 0.16,
  },
}

export const TIME_ORDER: TimeOfDay[] = ['DAWN', 'NOON', 'DUSK', 'NIGHT']

/** Sun position scaled to a scene of the given radius. */
export function sunPosition(rig: LightRig, radius: number): [number, number, number] {
  const [x, y, z] = rig.sun
  const len = Math.hypot(x, y, z) || 1
  const d = radius * 1.5
  return [(x / len) * d, (y / len) * d, (z / len) * d]
}
