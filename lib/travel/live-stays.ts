import 'server-only'

import type { HeritageSite } from '@/lib/heritage/types'
import { haversineKm } from './optimizer'
import type { LiveStay, LiveStayReview, NearbyStaysResponse } from './live-types'

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const ROUTES_ENDPOINT = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'places.photos',
  'places.reviews',
].join(',')

interface GoogleText {
  text?: string
}

interface GoogleAttribution {
  displayName?: string
  uri?: string
}

interface GooglePlace {
  id?: string
  displayName?: GoogleText
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  googleMapsUri?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  businessStatus?: string
  primaryTypeDisplayName?: GoogleText
  photos?: Array<{ name?: string; authorAttributions?: GoogleAttribution[] }>
  reviews?: Array<{
    rating?: number
    relativePublishTimeDescription?: string
    text?: GoogleText
    originalText?: GoogleText
    authorAttribution?: GoogleAttribution
  }>
}

interface GoogleProviderError {
  error?: { code?: number; status?: string; message?: string }
}

interface RouteElement {
  destinationIndex?: number
  condition?: string
  distanceMeters?: number
  duration?: string
  status?: { code?: number; message?: string }
}

export class LiveTravelProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_CONFIGURED' | 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE',
  ) {
    super(message)
  }
}

function serverKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() || null
}

function durationMinutes(value?: string) {
  if (!value?.endsWith('s')) return null
  const seconds = Number(value.slice(0, -1))
  return Number.isFinite(seconds) ? Math.max(1, Math.round(seconds / 60)) : null
}

function directionsUri(site: HeritageSite, destination: { lat: number; lon: number }) {
  const params = new URLSearchParams({
    api: '1',
    origin: `${site.lat},${site.lon}`,
    destination: `${destination.lat},${destination.lon}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function cleanReview(review: NonNullable<GooglePlace['reviews']>[number]): LiveStayReview | null {
  const text = review.text?.text?.trim() || review.originalText?.text?.trim()
  if (!text) return null
  return {
    authorName: review.authorAttribution?.displayName?.trim() || 'Google Maps reviewer',
    authorUri: review.authorAttribution?.uri || null,
    rating: typeof review.rating === 'number' ? review.rating : null,
    relativeTime: review.relativePublishTimeDescription || null,
    text: text.slice(0, 420),
  }
}

async function drivingRoutes(site: HeritageSite, stays: LiveStay[], apiKey: string) {
  if (!stays.length) return null
  try {
    const result = await fetch(ROUTES_ENDPOINT, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(9_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'destinationIndex,duration,distanceMeters,status,condition',
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: site.lat, longitude: site.lon } } } }],
        destinations: stays.map((stay) => ({
          waypoint: { location: { latLng: { latitude: stay.location.lat, longitude: stay.location.lon } } },
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        languageCode: 'en-IN',
        regionCode: 'IN',
      }),
    })
    if (!result.ok) return null
    const elements = await result.json() as RouteElement[]
    for (const element of elements) {
      const index = element.destinationIndex
      if (index === undefined || !stays[index] || element.condition !== 'ROUTE_EXISTS') continue
      if (typeof element.distanceMeters === 'number') {
        stays[index].driveDistanceKm = Math.round(element.distanceMeters / 100) / 10
      }
      stays[index].driveDurationMinutes = durationMinutes(element.duration)
    }
    return stays.some((stay) => stay.driveDistanceKm !== null) ? 'Google Routes' as const : null
  } catch {
    return null
  }
}

export async function discoverNearbyStays(site: HeritageSite, radiusKm = 20): Promise<NearbyStaysResponse> {
  const apiKey = serverKey()
  if (!apiKey) {
    throw new LiveTravelProviderError(
      'Live stays need a server-side Google Maps key.',
      'NOT_CONFIGURED',
    )
  }

  let response: Response
  try {
    response = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `hotels and resorts near ${site.name}, ${site.city}, ${site.state}, India`,
        pageSize: 10,
        locationBias: {
          circle: {
            center: { latitude: site.lat, longitude: site.lon },
            radius: radiusKm * 1_000,
          },
        },
        languageCode: 'en',
        regionCode: 'IN',
      }),
    })
  } catch {
    throw new LiveTravelProviderError('Google Places did not respond in time.', 'PROVIDER_UNAVAILABLE')
  }

  const payload = await response.json() as { places?: GooglePlace[] } & GoogleProviderError
  if (!response.ok) {
    const providerMessage = payload.error?.message?.replace(/\s+/g, ' ').trim()
    throw new LiveTravelProviderError(
      providerMessage || 'Google Places rejected the live-stay request.',
      'PROVIDER_REJECTED',
    )
  }

  const stays = (payload.places ?? []).flatMap((place): LiveStay[] => {
    const latitude = place.location?.latitude
    const longitude = place.location?.longitude
    const name = place.displayName?.text?.trim()
    if (!place.id || !name || typeof latitude !== 'number' || typeof longitude !== 'number') return []
    const location = { lat: latitude, lon: longitude }
    const straightLineDistanceKm = Math.round(haversineKm({ lat: site.lat, lon: site.lon }, location) * 10) / 10
    if (straightLineDistanceKm > radiusKm * 1.6) return []
    const photo = place.photos?.find((item) => item.name)
    return [{
      id: place.id,
      name,
      typeLabel: place.primaryTypeDisplayName?.text || 'Hotel or resort',
      address: place.formattedAddress || `${site.city}, ${site.state}`,
      location,
      rating: typeof place.rating === 'number' ? place.rating : null,
      reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
      priceLevel: place.priceLevel && place.priceLevel !== 'PRICE_LEVEL_UNSPECIFIED' ? place.priceLevel : null,
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      mapsUri: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${place.formattedAddress || site.city}`)}`,
      directionsUri: directionsUri(site, location),
      businessStatus: place.businessStatus || null,
      straightLineDistanceKm,
      driveDistanceKm: null,
      driveDurationMinutes: null,
      reviews: (place.reviews ?? []).map(cleanReview).filter((item): item is LiveStayReview => Boolean(item)).slice(0, 2),
      photo: photo?.name ? {
        url: `/api/travel/stays/photo?name=${encodeURIComponent(photo.name)}`,
        attribution: (photo.authorAttributions ?? []).map((item) => ({
          name: item.displayName?.trim() || 'Google Maps contributor',
          uri: item.uri || null,
        })),
      } : null,
    }]
  })
    .sort((a, b) => {
      const qualityA = (a.rating ?? 0) * Math.log10(a.reviewCount + 10) - a.straightLineDistanceKm * 0.025
      const qualityB = (b.rating ?? 0) * Math.log10(b.reviewCount + 10) - b.straightLineDistanceKm * 0.025
      return qualityB - qualityA
    })
    .slice(0, 8)

  const routingSource = await drivingRoutes(site, stays, apiKey)
  return {
    status: 'LIVE',
    source: 'Google Places',
    routingSource: routingSource ?? 'STRAIGHT_LINE',
    fetchedAt: new Date().toISOString(),
    site: { slug: site.slug, name: site.name, city: site.city, lat: site.lat, lon: site.lon },
    radiusKm,
    stays,
    ...(stays.length ? {} : { message: `No current hotel results were returned within ${radiusKm} km.` }),
  }
}
