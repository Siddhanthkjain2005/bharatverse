import { allSites } from '@/lib/heritage/query'
import { travelPlacesFromSites } from '@/lib/travel/demo-data'
import { optimizeJourney } from '@/lib/travel/optimizer'
import { validatePreferences } from '@/lib/travel/validate'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request.' }, { status: 400 })
  }
  const validated = validatePreferences(body)
  if (!validated.ok) return Response.json({ error: 'Invalid trip preferences.', details: validated.errors }, { status: 400 })
  const places = travelPlacesFromSites(allSites())
  const knownIds = new Set(places.map((place) => place.id))
  if (validated.value.mustSeePlaceIds.some((id) => !knownIds.has(id))) {
    return Response.json({ error: 'Unknown must-see destination.' }, { status: 400 })
  }
  return Response.json(optimizeJourney(validated.value, places))
}
