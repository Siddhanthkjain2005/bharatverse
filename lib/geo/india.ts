/**
 * Stylised landmass outline used only as a visual base for the flyover and the
 * discovery map.
 *
 * IMPORTANT: this is a low-resolution artistic silhouette, NOT a survey-grade or
 * politically authoritative boundary. It is never used for measurement, area,
 * or boundary claims. Site markers are positioned from their own verified WGS84
 * coordinates, independent of this outline.
 */
export const INDIA_OUTLINE: [number, number][] = [
  [74.3, 34.6],
  [76.0, 34.5],
  [78.5, 34.5],
  [79.5, 33.0],
  [80.2, 30.6],
  [81.0, 30.3],
  [82.5, 29.7],
  [84.0, 29.2],
  [85.8, 28.1],
  [87.0, 27.9],
  [88.2, 27.9],
  [89.1, 27.3],
  [90.0, 28.0],
  [92.0, 28.2],
  [94.0, 29.4],
  [95.5, 28.5],
  [97.4, 28.2],
  [96.5, 27.0],
  [97.0, 25.5],
  [95.0, 24.0],
  [94.0, 23.0],
  [93.4, 22.0],
  [92.6, 21.9],
  [92.0, 20.9],
  [90.5, 21.8],
  [88.0, 21.6],
  [86.9, 21.4],
  [85.0, 19.8],
  [83.0, 18.3],
  [81.2, 16.3],
  [80.3, 15.9],
  [80.1, 13.5],
  [79.8, 11.9],
  [79.3, 10.3],
  [78.2, 9.2],
  [77.5, 8.1],
  [76.5, 9.0],
  [75.7, 11.6],
  [74.8, 13.0],
  [73.8, 15.4],
  [72.9, 18.9],
  [72.6, 21.0],
  [72.0, 21.7],
  [70.0, 20.8],
  [68.9, 22.0],
  [68.2, 23.5],
  [68.7, 24.3],
  [70.0, 25.0],
  [70.6, 27.0],
  [71.9, 27.9],
  [73.4, 29.9],
  [74.5, 31.0],
  [75.3, 32.3],
  [74.0, 33.5],
]

export const INDIA_BOUNDS = {
  minLon: 68.0,
  maxLon: 97.5,
  minLat: 6.5,
  maxLat: 35.8,
}

/** Normalise lon/lat to a 0–1 square with y increasing downward (screen space). */
export function projectNormalized(lon: number, lat: number) {
  const { minLon, maxLon, minLat, maxLat } = INDIA_BOUNDS
  return {
    x: (lon - minLon) / (maxLon - minLon),
    y: 1 - (lat - minLat) / (maxLat - minLat),
  }
}

/** Project to the 3D flyover plane: x east, z south, both centred on 0. */
export function projectToPlane(lon: number, lat: number, scale = 100) {
  const n = projectNormalized(lon, lat)
  return {
    x: (n.x - 0.5) * scale,
    z: (n.y - 0.5) * scale * 1.0,
  }
}

/** Even-odd point-in-polygon test against the stylised outline. */
export function insideIndia(lon: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = INDIA_OUTLINE.length - 1; i < INDIA_OUTLINE.length; j = i++) {
    const [xi, yi] = INDIA_OUTLINE[i]
    const [xj, yj] = INDIA_OUTLINE[j]
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** SVG path (viewBox 0 0 1000 1000) for the 2D discovery map. */
export function outlinePath(size = 1000): string {
  return (
    INDIA_OUTLINE.map(([lon, lat], i) => {
      const n = projectNormalized(lon, lat)
      return `${i === 0 ? 'M' : 'L'}${(n.x * size).toFixed(1)} ${(n.y * size).toFixed(1)}`
    }).join(' ') + ' Z'
  )
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
