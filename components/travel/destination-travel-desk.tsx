'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgeIndianRupee,
  CarFront,
  Clock3,
  ExternalLink,
  Hotel,
  MapPin,
  Phone,
  Plane,
  Radar,
  RefreshCw,
  Star,
  TicketCheck,
  TrainFront,
} from 'lucide-react'
import type { LiveStay, NearbyStaysResponse } from '@/lib/travel/live-types'
import { FLIGHTS_URL, mapSearchUrl, RAIL_URL, SITE_LOGISTICS } from '@/lib/travel/site-logistics'
import { cn } from '@/lib/utils'

export interface TravelDeskDestination {
  slug: string
  name: string
  city: string
}

type SortMode = 'RECOMMENDED' | 'CLOSEST' | 'RATING'
type PulseKind = 'HOTELS' | 'FLIGHTS' | 'LOCAL_RIDE'

interface PricePulseResponse {
  status?: 'INDICATIVE'
  kind?: PulseKind
  fetchedAt?: string
  summary?: string
  provider?: string
  verification?: 'PUBLIC_WEB_NOT_BOOKABLE'
  sources?: Array<{ title: string; url: string; snippet: string; relevance: number | null }>
  arrivalRoute?: {
    from: string
    to: string
    distanceKm: number
    durationMinutes: number
    mapsUri: string
    fetchedAt: string
    provider: 'Google Places + Routes'
  } | null
  error?: string
}

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: 'No price level',
  PRICE_LEVEL_INEXPENSIVE: '₹ · value stay',
  PRICE_LEVEL_MODERATE: '₹₹ · mid-range',
  PRICE_LEVEL_EXPENSIVE: '₹₹₹ · upscale',
  PRICE_LEVEL_VERY_EXPENSIVE: '₹₹₹₹ · luxury',
}

function sortStays(stays: LiveStay[], mode: SortMode) {
  if (mode === 'CLOSEST') {
    return [...stays].sort((a, b) =>
      (a.driveDistanceKm ?? a.straightLineDistanceKm) - (b.driveDistanceKm ?? b.straightLineDistanceKm),
    )
  }
  if (mode === 'RATING') {
    return [...stays].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount)
  }
  return stays
}

function StayCard({ stay }: { stay: LiveStay }) {
  const [imageFailed, setImageFailed] = useState(false)
  const distance = stay.driveDistanceKm ?? stay.straightLineDistanceKm
  const distanceLabel = stay.driveDistanceKm === null ? 'straight-line' : 'driving'

  return (
    <article className="group overflow-hidden border border-border/70 bg-background">
      <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_65%_30%,oklch(0.64_0.12_47/.25),transparent_45%),linear-gradient(145deg,oklch(0.24_0.018_60),oklch(0.15_0.01_60))]">
        {stay.photo && !imageFailed ? (
          <Image
            src={stay.photo.url}
            alt={`${stay.name} from Google Maps`}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grid size-full place-items-center"><Hotel className="size-11 text-primary/60" /></div>
        )}
        <span className="absolute left-3 top-3 border border-background/30 bg-background/85 px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.14em] backdrop-blur">
          {stay.typeLabel}
        </span>
        <span className="absolute bottom-3 right-3 bg-background/90 px-2.5 py-1.5 font-mono text-xs text-accent backdrop-blur">
          {distance.toFixed(1)} km {distanceLabel}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-2xl font-light leading-tight">{stay.name}</h3>
            <p className="mt-2 flex items-start gap-2 font-sans text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />{stay.address}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 font-serif text-xl text-accent">
              <Star className="size-4 fill-current" />{stay.rating?.toFixed(1) ?? '—'}
            </p>
            <p className="mt-1 font-mono text-[0.625rem] text-muted-foreground">{stay.reviewCount.toLocaleString('en-IN')} reviews</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground">
            <BadgeIndianRupee className="size-3.5 text-primary" />{stay.priceLevel ? PRICE_LABELS[stay.priceLevel] ?? 'Price level listed' : 'Live room price at provider'}
          </span>
          {stay.driveDurationMinutes !== null && (
            <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground">
              <CarFront className="size-3.5 text-primary" />about {stay.driveDurationMinutes} min by road
            </span>
          )}
          {stay.businessStatus && stay.businessStatus !== 'OPERATIONAL' && (
            <span className="border border-destructive/50 px-2.5 py-1.5 text-[0.6875rem] text-destructive">{stay.businessStatus.replaceAll('_', ' ').toLowerCase()}</span>
          )}
        </div>

        {stay.reviews.length > 0 && (
          <details className="mt-5 border-t border-border/60 pt-4">
            <summary className="cursor-pointer font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-accent">Read recent Google reviews</summary>
            <div className="mt-4 flex flex-col gap-4">
              {stay.reviews.map((review, index) => (
                <blockquote key={`${review.authorName}-${index}`} className="border-l-2 border-primary/50 pl-3">
                  <p className="font-sans text-xs leading-relaxed text-muted-foreground">“{review.text}”</p>
                  <footer className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.625rem] text-muted-foreground">
                    {review.authorUri ? <a href={review.authorUri} target="_blank" rel="noreferrer" className="text-foreground hover:text-accent">{review.authorName}</a> : review.authorName}
                    {review.rating !== null && <span>{review.rating}/5</span>}
                    {review.relativeTime && <span>· {review.relativeTime}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          </details>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href={stay.directionsUri} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border border-primary bg-primary px-3 text-center text-[0.6875rem] uppercase tracking-[0.12em] text-primary-foreground">
            Directions <ArrowUpRight className="size-3.5" />
          </a>
          <a href={stay.website ?? stay.mapsUri} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border border-accent px-3 text-center text-[0.6875rem] uppercase tracking-[0.12em] text-accent">
            Check live rooms <ExternalLink className="size-3.5" />
          </a>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <a href={stay.mapsUri} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-2 border border-border px-3 text-[0.6875rem] text-muted-foreground hover:text-foreground">Google Maps</a>
          {stay.phone ? <a href={`tel:${stay.phone}`} className="flex min-h-10 items-center justify-center gap-2 border border-border px-3 text-[0.6875rem] text-muted-foreground hover:text-foreground"><Phone className="size-3.5" />Call property</a> : <span className="grid min-h-10 place-items-center border border-border px-3 text-[0.6875rem] text-muted-foreground">Phone not listed</span>}
        </div>
        {stay.photo?.attribution.length ? (
          <p className="mt-3 font-sans text-[0.5625rem] leading-relaxed text-muted-foreground">
            Photo: {stay.photo.attribution.map((item, index) => <span key={`${item.name}-${index}`}>{index ? ', ' : ''}{item.uri ? <a href={item.uri} target="_blank" rel="noreferrer" className="underline">{item.name}</a> : item.name}</span>)}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function NearbyStays({ destination }: { destination: TravelDeskDestination }) {
  const [response, setResponse] = useState<NearbyStaysResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('RECOMMENDED')

  async function load() {
    setLoading(true)
    try {
      const request = await fetch(`/api/travel/stays?site=${encodeURIComponent(destination.slug)}&radiusKm=20`, { cache: 'no-store' })
      const result = await request.json() as NearbyStaysResponse
      setResponse(result)
    } catch {
      setResponse({
        status: 'UNAVAILABLE', source: null, routingSource: null, fetchedAt: new Date().toISOString(),
        site: { slug: destination.slug, name: destination.name, city: destination.city, lat: 0, lon: 0 },
        radiusKm: 20, stays: [], message: 'The live travel service could not be reached.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [destination.slug]) // eslint-disable-line react-hooks/exhaustive-deps
  const stays = useMemo(() => sortStays(response?.stays ?? [], sort), [response, sort])

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center border border-border/70 bg-card/20 p-8 text-center">
        <div><RefreshCw className="mx-auto size-8 animate-spin text-primary motion-reduce:animate-none" /><p className="mt-4 font-serif text-2xl">Finding real stays near {destination.name}…</p><p className="mt-2 label-meta">Google Places + live driving routes</p></div>
      </div>
    )
  }

  if (!response || response.status !== 'LIVE') {
    return (
      <div className="border border-primary/50 bg-primary/8 p-7">
        <span className="label-meta text-primary">Live provider unavailable</span>
        <h3 className="mt-3 font-serif text-3xl">No hotel details have been invented.</h3>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">{response?.message ?? 'Live stays could not be loaded.'}</p>
        <button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center gap-2 border border-primary px-4 text-xs uppercase tracking-[0.14em] text-primary"><RefreshCw className="size-4" />Retry live search</button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 font-sans text-[0.6875rem] text-muted-foreground">
          <span className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 uppercase tracking-[0.14em] text-emerald-300">Live</span>
          <span>Google Places · {response.routingSource === 'Google Routes' ? 'live driving routes' : 'straight-line distance'}</span>
          <span>· refreshed {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(response.fetchedAt))}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['RECOMMENDED', 'CLOSEST', 'RATING'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setSort(item)} className={cn('min-h-9 border px-3 font-sans text-[0.625rem] uppercase tracking-[0.12em]', sort === item ? 'border-accent text-accent' : 'border-border text-muted-foreground')}>
              {item.toLowerCase()}
            </button>
          ))}
          <button type="button" onClick={() => void load()} aria-label="Refresh live hotels" className="grid size-9 place-items-center border border-border text-muted-foreground hover:text-accent"><RefreshCw className="size-3.5" /></button>
        </div>
      </div>

      {stays.length ? <div className="grid gap-5 lg:grid-cols-2">{stays.map((stay) => <StayCard key={stay.id} stay={stay} />)}</div> : (
        <div className="border border-border p-7 text-sm text-muted-foreground">{response.message ?? 'No current stay results were returned nearby.'}</div>
      )}
      <p className="mt-5 border-l-2 border-primary pl-3 font-sans text-xs leading-relaxed text-muted-foreground">
        Ratings, review counts, review excerpts and business details come from Google Maps at request time. Room prices and availability change by dates and guests, so “Check live rooms” opens the property or Maps rather than showing a made-up quote.
      </p>
    </div>
  )
}

function PublicPricePulse({ destination }: { destination: TravelDeskDestination }) {
  const [kind, setKind] = useState<PulseKind>('HOTELS')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [rooms, setRooms] = useState(1)
  const [origin, setOrigin] = useState('')
  const [arrivalMode, setArrivalMode] = useState<'AIRPORT' | 'RAIL'>('AIRPORT')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PricePulseResponse | null>(null)

  async function scan() {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/travel/price-pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug: destination.slug, kind, checkIn, checkOut, adults, rooms, origin, arrivalMode }),
      })
      const payload = await response.json() as PricePulseResponse
      setResult(payload)
    } catch {
      setResult({ error: 'The public-web scan could not be completed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-8 overflow-hidden border border-accent/50 bg-[radial-gradient(circle_at_90%_0%,oklch(0.63_0.135_44/.15),transparent_35%),oklch(0.2_0.014_62)]">
      <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <span className="inline-flex items-center gap-2 label-meta text-accent"><Radar className="size-4" />Public-web price pulse</span>
          <h3 className="mt-3 font-serif text-3xl font-light">One live cost desk for the entire arrival.</h3>
          <p className="mt-3 max-w-[70ch] font-sans text-sm leading-relaxed text-muted-foreground">Scan public hotel offers, flights to the nearest airport, or taxi and auto fare evidence. Exact matches are separated from generic ranges; checkout—not AI—confirms availability, surge and final total.</p>
        </div>
        <span className="border border-primary/40 px-3 py-2 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary">No cached prices</span>
      </div>

      <div className="grid grid-cols-3 gap-px border-y border-border/70 bg-border/70">
        {([
          { id: 'HOTELS' as const, label: 'Hotel prices', icon: Hotel },
          { id: 'FLIGHTS' as const, label: 'Flight prices', icon: Plane },
          { id: 'LOCAL_RIDE' as const, label: 'Taxi & auto', icon: CarFront },
        ]).map((item) => <button key={item.id} type="button" onClick={() => { setKind(item.id); setResult(null) }} className={cn('flex min-h-12 items-center justify-center gap-2 bg-background px-3 font-sans text-[0.6875rem] uppercase tracking-[0.12em]', kind === item.id ? 'bg-accent/12 text-accent' : 'text-muted-foreground hover:text-foreground')}><item.icon className="size-4" />{item.label}</button>)}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void scan() }} className="grid gap-3 border-b border-border/70 bg-background/45 p-5 sm:grid-cols-2 xl:grid-cols-6">
        {kind === 'FLIGHTS' && <label className="flex flex-col gap-2 sm:col-span-2"><span className="label-meta">Flying from</span><input required value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="City or airport code, e.g. DEL" className="min-h-11 border border-border bg-background px-3 font-sans text-xs outline-none focus:border-accent" /></label>}
        {kind === 'LOCAL_RIDE' && <label className="flex flex-col gap-2 sm:col-span-2"><span className="label-meta">Arriving by</span><select value={arrivalMode} onChange={(event) => setArrivalMode(event.target.value as 'AIRPORT' | 'RAIL')} className="min-h-11 border border-border bg-background px-3 font-sans text-xs outline-none focus:border-accent"><option value="AIRPORT">Nearest airport</option><option value="RAIL">Nearest railway station</option></select></label>}
        {kind !== 'LOCAL_RIDE' && <><label className="flex flex-col gap-2"><span className="label-meta">{kind === 'FLIGHTS' ? 'Outbound' : 'Check-in'}</span><input required type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="min-h-11 border border-border bg-background px-3 font-mono text-xs outline-none focus:border-accent" /></label><label className="flex flex-col gap-2"><span className="label-meta">{kind === 'FLIGHTS' ? 'Return' : 'Check-out'}</span><input required type="date" min={checkIn || undefined} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="min-h-11 border border-border bg-background px-3 font-mono text-xs outline-none focus:border-accent" /></label></>}
        <label className="flex flex-col gap-2"><span className="label-meta">{kind === 'LOCAL_RIDE' ? 'Passengers' : 'Adults'}</span><input required type="number" min={1} max={12} value={adults} onChange={(event) => setAdults(Number(event.target.value))} className="min-h-11 border border-border bg-background px-3 font-mono text-xs outline-none focus:border-accent" /></label>
        {kind === 'HOTELS' && <label className="flex flex-col gap-2"><span className="label-meta">Rooms</span><input required type="number" min={1} max={6} value={rooms} onChange={(event) => setRooms(Number(event.target.value))} className="min-h-11 border border-border bg-background px-3 font-mono text-xs outline-none focus:border-accent" /></label>}
        <button type="submit" disabled={loading || (kind !== 'LOCAL_RIDE' && (!checkIn || !checkOut)) || (kind === 'FLIGHTS' && origin.trim().length < 2)} className="mt-auto flex min-h-11 items-center justify-center gap-2 border border-accent bg-accent px-5 font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-accent-foreground disabled:opacity-50 xl:col-span-1">
          {loading ? <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" /> : <Radar className="size-4" />}{loading ? 'Scanning…' : 'Scan prices'}
        </button>
      </form>

      {result && (
        <div className="p-5 md:p-7" aria-live="polite">
          {result.error ? <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{result.error}</p> : (
            <>
              <div className="flex flex-wrap items-center gap-2"><span className="border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary">Indicative web evidence</span>{result.fetchedAt && <span className="font-mono text-[0.625rem] text-muted-foreground">Scanned {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(result.fetchedAt))}</span>}</div>
              {result.kind === 'LOCAL_RIDE' && result.arrivalRoute && <a href={result.arrivalRoute.mapsUri} target="_blank" rel="noreferrer" className="mt-5 grid gap-px border border-primary/50 bg-primary/50 sm:grid-cols-3"><span className="bg-background/95 p-4"><span className="label-meta">Live road route</span><strong className="mt-2 block font-serif text-xl font-light">{result.arrivalRoute.from} → {result.arrivalRoute.to}</strong></span><span className="bg-background/95 p-4"><span className="label-meta">Driving distance</span><strong className="mt-2 block font-serif text-2xl font-light text-accent">{result.arrivalRoute.distanceKm.toFixed(1)} km</strong></span><span className="bg-background/95 p-4"><span className="label-meta">Traffic-aware time</span><strong className="mt-2 flex items-center gap-2 font-serif text-2xl font-light text-accent">{result.arrivalRoute.durationMinutes} min <ArrowUpRight className="size-4" /></strong></span></a>}
              <p className="mt-5 max-w-[90ch] whitespace-pre-line font-sans text-sm leading-relaxed text-foreground/90">{result.summary}</p>
              {result.sources?.length ? <div className="mt-6 grid gap-3 md:grid-cols-2">{result.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="group border border-border/70 bg-background/60 p-4 transition-colors hover:border-accent"><span className="flex items-start justify-between gap-4 font-serif text-lg leading-tight">{source.title}<ArrowUpRight className="size-4 shrink-0 text-accent" /></span>{source.snippet && <span className="mt-2 block font-sans text-xs leading-relaxed text-muted-foreground">{source.snippet}</span>}</a>)}</div> : <p className="mt-5 text-sm text-muted-foreground">No usable public source links were returned.</p>}
              {result.kind === 'FLIGHTS' && <div className="mt-5 flex flex-wrap gap-2"><a href={FLIGHTS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-accent px-4 text-xs uppercase tracking-[0.12em] text-accent">Open Google Flights <ArrowUpRight className="size-3.5" /></a><a href="https://www.skyscanner.co.in/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-border px-4 text-xs uppercase tracking-[0.12em]">Check Skyscanner <ArrowUpRight className="size-3.5" /></a></div>}
              {result.kind === 'LOCAL_RIDE' && <div className="mt-5 grid gap-2 sm:grid-cols-3"><a href="https://book.olacabs.com/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border border-accent px-4 text-xs uppercase tracking-[0.12em] text-accent">Check Ola <ArrowUpRight className="size-3.5" /></a><a href="https://m.uber.com/ul/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-xs uppercase tracking-[0.12em]">Check Uber <ArrowUpRight className="size-3.5" /></a><a href="https://www.rapido.bike/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-xs uppercase tracking-[0.12em]">Check Rapido <ArrowUpRight className="size-3.5" /></a></div>}
              <p className="mt-5 border-l-2 border-accent pl-3 font-sans text-xs leading-relaxed text-muted-foreground">This scan uses public web results, not protected Google Maps content. A booking inventory API is still required before Bharatverse can award a “Best bookable price” badge.</p>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export function DestinationTravelDesk({ destination, planner = false }: { destination: TravelDeskDestination; planner?: boolean }) {
  const logistics = SITE_LOGISTICS[destination.slug]
  return (
    <section className={cn(planner ? 'border border-border/70 bg-card/20 p-5 md:p-7' : 'border-y border-border/70 bg-card/20')}>
      <div className={cn(!planner && 'mx-auto max-w-[110rem] px-5 py-20 md:px-8')}>
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="label-meta">Live travel desk</span>
            <h2 className="mt-3 display text-[clamp(2rem,4vw,4rem)] leading-[0.95]">Stay close. Arrive prepared.</h2>
            <p className="mt-4 max-w-[68ch] font-sans text-sm leading-relaxed text-muted-foreground">Current nearby hotels and resorts, route distance, trusted booking handoffs, and the practical links needed to turn the digital visit into a real one.</p>
          </div>
          <span className="inline-flex items-center gap-2 border border-primary/40 px-3 py-2 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary"><Clock3 className="size-3.5" />Fetched when opened</span>
        </div>

        {logistics && (
          <div className="mb-8 grid gap-px border border-border/70 bg-border/70 md:grid-cols-3">
            <a href={logistics.ticketing.url} target="_blank" rel="noreferrer" className="group bg-background p-5 transition-colors hover:bg-primary/8">
              <TicketCheck className="size-5 text-primary" /><span className="mt-4 block label-meta">Official entry</span><strong className="mt-2 block font-serif text-xl font-light">{logistics.ticketing.label}</strong><span className="mt-2 block font-sans text-xs leading-relaxed text-muted-foreground">{logistics.ticketing.note}</span><span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-accent">Open official source <ArrowUpRight className="size-3.5" /></span>
            </a>
            <div className="bg-background p-5">
              <Plane className="size-5 text-primary" /><span className="mt-4 block label-meta">Nearest airport · approximate</span><strong className="mt-2 block font-serif text-xl font-light">{logistics.airport.name} ({logistics.airport.code})</strong><span className="mt-2 block font-sans text-xs text-muted-foreground">About {logistics.airport.approximateDistanceKm} km from the monument. Confirm the route for your travel date.</span><div className="mt-4 flex gap-3"><a href={FLIGHTS_URL} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.12em] text-accent">Live flights</a><a href={mapSearchUrl(`${logistics.airport.name} to ${destination.name}`)} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.12em] text-accent">Map route</a></div>
            </div>
            <div className="bg-background p-5">
              <TrainFront className="size-5 text-primary" /><span className="mt-4 block label-meta">Rail connection · approximate</span><strong className="mt-2 block font-serif text-xl font-light">{logistics.rail.name}</strong><span className="mt-2 block font-sans text-xs text-muted-foreground">About {logistics.rail.approximateDistanceKm} km from the monument. Check train operation and availability directly.</span><div className="mt-4 flex gap-3"><a href={RAIL_URL} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.12em] text-accent">IRCTC trains</a><a href={mapSearchUrl(`${logistics.rail.name} to ${destination.name}`)} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.12em] text-accent">Map route</a></div>
            </div>
          </div>
        )}
        <PublicPricePulse destination={destination} />
        <NearbyStays destination={destination} />
      </div>
    </section>
  )
}

export function JourneyBookingLayer({ destinations }: { destinations: TravelDeskDestination[] }) {
  const unique = useMemo(() => Array.from(new Map(destinations.map((item) => [item.slug, item])).values()), [destinations])
  const [activeSlug, setActiveSlug] = useState(unique[0]?.slug ?? '')
  useEffect(() => {
    if (!unique.some((item) => item.slug === activeSlug)) setActiveSlug(unique[0]?.slug ?? '')
  }, [activeSlug, unique])
  const active = unique.find((item) => item.slug === activeSlug) ?? unique[0]
  if (!active) return null

  return (
    <section>
      <div className="mb-4 flex gap-px overflow-x-auto border border-border/70 bg-border/70">
        {unique.map((item) => <button key={item.slug} type="button" onClick={() => setActiveSlug(item.slug)} className={cn('min-h-12 shrink-0 bg-background px-4 text-left font-sans text-xs', item.slug === active.slug ? 'bg-primary/12 text-accent' : 'text-muted-foreground hover:text-foreground')}>{item.name}<span className="ml-2 text-[0.625rem] uppercase">{item.city}</span></button>)}
      </div>
      <DestinationTravelDesk key={active.slug} destination={active} planner />
    </section>
  )
}
