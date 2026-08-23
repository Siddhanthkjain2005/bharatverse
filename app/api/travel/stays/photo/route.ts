import { NextResponse } from 'next/server'

const photoNamePattern = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') || ''
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim()
  if (!apiKey || !photoNamePattern.test(name)) {
    return new Response(null, { status: 404 })
  }

  try {
    const params = new URLSearchParams({ maxWidthPx: '960', maxHeightPx: '640', skipHttpRedirect: 'true' })
    const response = await fetch(`https://places.googleapis.com/v1/${name}/media?${params.toString()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: { 'X-Goog-Api-Key': apiKey },
    })
    if (!response.ok) return new Response(null, { status: 404 })
    const payload = await response.json() as { photoUri?: string }
    if (!payload.photoUri) return new Response(null, { status: 404 })
    const target = new URL(payload.photoUri)
    if (target.protocol !== 'https:') return new Response(null, { status: 404 })
    const redirect = NextResponse.redirect(target, 307)
    redirect.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return redirect
  } catch {
    return new Response(null, { status: 404 })
  }
}
