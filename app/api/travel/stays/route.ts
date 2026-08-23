import { siteBySlug } from '@/lib/heritage/query'
import { discoverNearbyStays, LiveTravelProviderError } from '@/lib/travel/live-stays'

const attempts = new Map<string, { count: number; resetAt: number }>()

function allowed(request: Request) {
  const now = Date.now()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const current = attempts.get(ip)
  if (!current || current.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  current.count += 1
  return current.count <= 24
}

export async function GET(request: Request) {
  if (!allowed(request)) {
    return Response.json({ error: 'Too many live travel requests. Try again in one minute.' }, { status: 429 })
  }
  const url = new URL(request.url)
  const slug = url.searchParams.get('site')?.trim() || ''
  const requestedRadius = Number(url.searchParams.get('radiusKm') || 20)
  const radiusKm = Number.isFinite(requestedRadius) ? Math.min(30, Math.max(5, requestedRadius)) : 20
  const site = siteBySlug(slug)
  if (!site) return Response.json({ error: 'Unknown monument.' }, { status: 404 })

  try {
    const result = await discoverNearbyStays(site, radiusKm)
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    const known = error instanceof LiveTravelProviderError
    return Response.json({
      status: 'UNAVAILABLE',
      source: null,
      routingSource: null,
      fetchedAt: new Date().toISOString(),
      site: { slug: site.slug, name: site.name, city: site.city, lat: site.lat, lon: site.lon },
      radiusKm,
      stays: [],
      message: known ? error.message : 'Live stays are temporarily unavailable.',
      code: known ? error.code : 'PROVIDER_UNAVAILABLE',
    }, {
      status: known && error.code === 'NOT_CONFIGURED' ? 503 : 502,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  }
}
