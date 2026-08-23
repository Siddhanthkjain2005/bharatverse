import 'server-only'

import type { HeritageSite } from '@/lib/heritage/types'
import { SITE_LOGISTICS } from './site-logistics'

export type ArrivalMode = 'AIRPORT' | 'RAIL'

export interface LiveArrivalRoute {
  from: string
  to: string
  distanceKm: number
  durationMinutes: number
  mapsUri: string
  fetchedAt: string
  provider: 'Google Places + Routes'
}

interface PlaceSearchResponse {
  places?: Array<{
    displayName?: { text?: string }
    location?: { latitude?: number; longitude?: number }
    googleMapsUri?: string
  }>
}

interface MatrixElement {
  condition?: string
  distanceMeters?: number
  duration?: string
}

function minutes(value?: string) {
  if (!value?.endsWith('s')) return null
  const seconds = Number(value.slice(0, -1))
  return Number.isFinite(seconds) ? Math.max(1, Math.round(seconds / 60)) : null
}

export async function liveArrivalRoute(site: HeritageSite, mode: ArrivalMode): Promise<LiveArrivalRoute | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim()
  const logistics = SITE_LOGISTICS[site.slug]
  if (!apiKey || !logistics) return null
  const requestedName = mode === 'RAIL' ? logistics.rail.name : logistics.airport.name

  try {
    const placeResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: `${requestedName}, ${site.state}, India`,
        pageSize: 1,
        languageCode: 'en',
        regionCode: 'IN',
      }),
    })
    if (!placeResponse.ok) return null
    const placePayload = await placeResponse.json() as PlaceSearchResponse
    const place = placePayload.places?.[0]
    const latitude = place?.location?.latitude
    const longitude = place?.location?.longitude
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null

    const routeResponse = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(9_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'duration,distanceMeters,condition',
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude, longitude } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: site.lat, longitude: site.lon } } } }],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        languageCode: 'en-IN',
        regionCode: 'IN',
      }),
    })
    if (!routeResponse.ok) return null
    const elements = await routeResponse.json() as MatrixElement[]
    const route = elements[0]
    const durationMinutes = minutes(route?.duration)
    if (route?.condition !== 'ROUTE_EXISTS' || typeof route.distanceMeters !== 'number' || durationMinutes === null) return null

    const directions = new URLSearchParams({
      api: '1',
      origin: `${latitude},${longitude}`,
      destination: `${site.lat},${site.lon}`,
      travelmode: 'driving',
    })
    return {
      from: place?.displayName?.text || requestedName,
      to: site.name,
      distanceKm: Math.round(route.distanceMeters / 100) / 10,
      durationMinutes,
      mapsUri: `https://www.google.com/maps/dir/?${directions.toString()}`,
      fetchedAt: new Date().toISOString(),
      provider: 'Google Places + Routes',
    }
  } catch {
    return null
  }
}
