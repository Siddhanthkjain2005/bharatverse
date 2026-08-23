/**
 * Deterministic randomness for the heritage twin.
 *
 * Every procedural element — a boulder, a shrub, a weathering streak — is
 * derived from the site id, so the same monument renders identically on every
 * machine and every reload. That matters for a demonstration: the judge and the
 * presenter must be looking at the same scene.
 */

/** FNV-1a, stable across runtimes. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Mulberry32 — small, fast, good enough for scatter and jitter. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Convenience wrapper with the shapes the generators actually need. */
export class Rand {
  private next: () => number

  constructor(seed: number | string) {
    this.next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed)
  }

  unit(): number {
    return this.next()
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1 - 1e-9))
  }

  /** Symmetric jitter around zero. */
  jitter(amount: number): number {
    return (this.next() * 2 - 1) * amount
  }

  sign(): number {
    return this.next() < 0.5 ? -1 : 1
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))]
  }
}

/* ------------------------------------------------------------------ */
/* noise                                                               */
/* ------------------------------------------------------------------ */

const PERM_SIZE = 512

function buildPermutation(seed: number): Uint8Array {
  const rand = mulberry32(seed)
  const p = new Uint8Array(PERM_SIZE)
  const base = new Uint8Array(256)
  for (let i = 0; i < 256; i++) base[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = base[i]
    base[i] = base[j]
    base[j] = tmp
  }
  for (let i = 0; i < PERM_SIZE; i++) p[i] = base[i & 255]
  return p
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function grad2(hash: number, x: number, y: number): number {
  switch (hash & 7) {
    case 0:
      return x + y
    case 1:
      return -x + y
    case 2:
      return x - y
    case 3:
      return -x - y
    case 4:
      return x
    case 5:
      return -x
    case 6:
      return y
    default:
      return -y
  }
}

/** Classic 2D gradient noise in [-1, 1]. */
export function makeNoise2D(seed: number | string): (x: number, y: number) => number {
  const perm = buildPermutation(typeof seed === 'string' ? hashString(seed) : seed)
  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const aa = perm[perm[xi] + yi]
    const ab = perm[perm[xi] + yi + 1]
    const ba = perm[perm[xi + 1] + yi]
    const bb = perm[perm[xi + 1] + yi + 1]
    const x1 = grad2(aa, xf, yf) * (1 - u) + grad2(ba, xf - 1, yf) * u
    const x2 = grad2(ab, xf, yf - 1) * (1 - u) + grad2(bb, xf - 1, yf - 1) * u
    return x1 * (1 - v) + x2 * v
  }
}

/** Fractal sum of gradient noise, normalised to roughly [-1, 1]. */
export function makeFbm2D(
  seed: number | string,
  octaves = 4,
  lacunarity = 2.03,
  gain = 0.5,
): (x: number, y: number) => number {
  const noise = makeNoise2D(seed)
  return (x: number, y: number) => {
    let amp = 1
    let freq = 1
    let sum = 0
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, y * freq) * amp
      norm += amp
      amp *= gain
      freq *= lacunarity
    }
    return sum / (norm || 1)
  }
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1)
  return t * t * (3 - 2 * t)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
