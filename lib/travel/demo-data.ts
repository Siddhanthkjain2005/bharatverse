import type { HeritageSite } from '@/lib/heritage/types'
import type { Interest, PlaceRef, TravelPlace } from './types'

export const ORIGINS: PlaceRef[] = [
  { id: 'bengaluru', name: 'Bengaluru', coordinates: { lat: 12.9716, lon: 77.5946 } },
  { id: 'delhi', name: 'Delhi', coordinates: { lat: 28.6139, lon: 77.209 } },
  { id: 'mumbai', name: 'Mumbai', coordinates: { lat: 19.076, lon: 72.8777 } },
  { id: 'chennai', name: 'Chennai', coordinates: { lat: 13.0827, lon: 80.2707 } },
  { id: 'kolkata', name: 'Kolkata', coordinates: { lat: 22.5726, lon: 88.3639 } },
  { id: 'hyderabad', name: 'Hyderabad', coordinates: { lat: 17.385, lon: 78.4867 } },
]

function interestsFor(site: HeritageSite): Interest[] {
  const text = `${site.tradition} ${site.summary} ${site.materials.join(' ')}`.toLowerCase()
  const tags: Interest[] = ['ARCHITECTURE', 'HISTORY', 'PHOTOGRAPHY']
  if (/temple|spiritual|sanctum|mosque|tomb/.test(text)) tags.push('SPIRITUAL_HERITAGE')
  if (/cave|archaeolog|ruin/.test(text)) tags.push('ARCHAEOLOGY')
  if (/sculpt|painting|art|carv/.test(text)) tags.push('ART')
  if (/granite|stone|craft/.test(text)) tags.push('CRAFTS')
  if (/landscape|hill|water|coast/.test(text)) tags.push('NATURE')
  return Array.from(new Set(tags))
}

export function travelPlacesFromSites(sites: HeritageSite[]): TravelPlace[] {
  return sites.map((site, index) => ({
    id: site.id,
    heritageSiteId: site.id,
    slug: site.slug,
    name: site.name,
    localName: site.localName,
    city: site.city,
    state: site.state,
    coordinates: { lat: site.lat, lon: site.lon },
    experienceTier: 'IMMERSIVE_TWIN',
    interests: interestsFor(site),
    heritageValue: site.unescoRef ? 10 : 8,
    visitDurationMinutes: {
      value: 120 + (index % 3) * 30,
      freshness: 'ESTIMATED',
      source: 'Bharatverse planning assumption',
      note: 'Editable planning duration; not an official visit recommendation.',
    },
    entryCost: {
      value: { min: 0, expected: 250, max: 500, currency: 'INR', freshness: 'ESTIMATED' },
      freshness: 'ESTIMATED',
      source: 'Bharatverse allowance model',
      note: 'Allowance only. Check the official ticket source before travel.',
    },
    accessibility: {
      value: {
        wheelchairEntrance: null,
        reducedWalkingSuitable: null,
        note: site.visit.accessibility ?? 'Information not yet verified.',
      },
      freshness: 'UNVERIFIED',
      note: 'Unknown does not satisfy a strict accessibility requirement.',
    },
    sourceIds: site.sourceIds,
  }))
}
