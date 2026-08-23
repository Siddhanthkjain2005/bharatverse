export type LiveStayStatus = 'LIVE' | 'UNAVAILABLE'

export interface LiveStayReview {
  authorName: string
  authorUri: string | null
  rating: number | null
  relativeTime: string | null
  text: string
}

export interface LiveStayPhoto {
  url: string
  attribution: Array<{ name: string; uri: string | null }>
}

export interface LiveStay {
  id: string
  name: string
  typeLabel: string
  address: string
  location: { lat: number; lon: number }
  rating: number | null
  reviewCount: number
  priceLevel: string | null
  phone: string | null
  website: string | null
  mapsUri: string
  directionsUri: string
  businessStatus: string | null
  straightLineDistanceKm: number
  driveDistanceKm: number | null
  driveDurationMinutes: number | null
  reviews: LiveStayReview[]
  photo: LiveStayPhoto | null
}

export interface NearbyStaysResponse {
  status: LiveStayStatus
  source: 'Google Places' | null
  routingSource: 'Google Routes' | 'STRAIGHT_LINE' | null
  fetchedAt: string
  site: { slug: string; name: string; city: string; lat: number; lon: number }
  radiusKm: number
  stays: LiveStay[]
  message?: string
}
