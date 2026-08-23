'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  IndianRupee,
  MapPin,
  RefreshCw,
  Route,
  Save,
  Sparkles,
} from 'lucide-react'
import { ORIGINS } from '@/lib/travel/demo-data'
import { saveTrip } from '@/lib/travel/storage'
import type {
  Interest,
  Pace,
  PlanResponse,
  TravelPlan,
  TravelPreferences,
  TravelStyle,
  TransportMode,
} from '@/lib/travel/types'
import { cn } from '@/lib/utils'
import { JourneyBookingLayer } from '@/components/travel/destination-travel-desk'

interface SiteChoice {
  id: string
  slug: string
  name: string
  city: string
  state: string
}

const INTERESTS: Array<{ id: Interest; label: string }> = [
  { id: 'ARCHITECTURE', label: 'Architecture' },
  { id: 'HISTORY', label: 'History' },
  { id: 'ARCHAEOLOGY', label: 'Archaeology' },
  { id: 'PHOTOGRAPHY', label: 'Photography' },
  { id: 'SPIRITUAL_HERITAGE', label: 'Spiritual heritage' },
  { id: 'ART', label: 'Art & sculpture' },
  { id: 'CRAFTS', label: 'Crafts' },
  { id: 'NATURE', label: 'Nature' },
]

const MODES: Array<{ id: TransportMode; label: string }> = [
  { id: 'PUBLIC_TRANSPORT', label: 'Public transport' },
  { id: 'CAB', label: 'Cab / taxi' },
  { id: 'SELF_DRIVE', label: 'Self-drive' },
  { id: 'RAIL', label: 'Rail' },
  { id: 'FLIGHT', label: 'Flight' },
  { id: 'WALKING', label: 'Walking' },
]

function formatMoney(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins ? `${mins}m` : ''}`.trim() : `${mins}m`
}

function clock(minute: number) {
  const hours = Math.floor(minute / 60)
  const mins = minute % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function ToggleGroup<T extends string>({
  value,
  values,
  onChange,
}: {
  value: T
  values: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-px border border-border/70 bg-border/70">
      {values.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'min-h-11 bg-background px-3 py-2 font-sans text-xs transition-colors',
            value === item.id ? 'bg-primary/15 text-accent' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function RouteSketch({ plan, origin }: { plan: TravelPlan; origin: TravelPreferences['origin'] }) {
  const points = [origin, ...plan.days.flatMap((day) => day.stops.map((stop) => ({
    id: stop.place.id,
    name: stop.place.name,
    coordinates: stop.place.coordinates,
  })))]
  const toPoint = (point: { coordinates: { lat: number; lon: number } }) => ({
    x: ((point.coordinates.lon - 67) / 31) * 100,
    y: 100 - ((point.coordinates.lat - 7) / 30) * 100,
  })
  const path = points.map(toPoint)

  return (
    <div className="relative min-h-[26rem] overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_55%_45%,oklch(0.31_0.062_273/.3),transparent_48%),linear-gradient(135deg,oklch(0.21_0.014_62),oklch(0.16_0.011_62))] p-5">
      <div className="flex items-center justify-between">
        <span className="label-meta">Estimated route sketch</span>
        <span className="border border-primary/40 px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary">Fallback routing</span>
      </div>
      <svg aria-label="Route from origin through planned heritage stops" viewBox="0 0 100 100" className="absolute inset-x-5 bottom-5 top-14 h-[calc(100%-5rem)] w-[calc(100%-2.5rem)] overflow-visible">
        <path d={path.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" className="text-primary/70" />
        {path.map((point, index) => (
          <g key={`${point.x}-${point.y}-${index}`}>
            <circle cx={point.x} cy={point.y} r={index === 0 ? 3 : 4} className={index === 0 ? 'fill-background stroke-accent' : 'fill-primary stroke-primary'} strokeWidth="1" />
            <text x={point.x} y={point.y + 1.4} textAnchor="middle" className={cn('fill-current font-mono text-[3.3px]', index === 0 ? 'text-accent' : 'text-primary-foreground')}>{index === 0 ? 'O' : index}</text>
          </g>
        ))}
      </svg>
      <p className="absolute bottom-3 left-4 right-4 font-sans text-[0.6875rem] leading-relaxed text-muted-foreground">Distances use recorded WGS84 coordinates. Durations are conservative estimates, not live traffic.</p>
    </div>
  )
}

export function PlannerShell({ sites }: { sites: SiteChoice[] }) {
  const searchParams = useSearchParams()
  const [originId, setOriginId] = useState(searchParams.get('origin') ?? 'bengaluru')
  const [days, setDays] = useState(Number(searchParams.get('days') ?? 4))
  const [budget, setBudget] = useState(Number(searchParams.get('budget') ?? 18_000))
  const [travelers, setTravelers] = useState(1)
  const [style, setStyle] = useState<TravelStyle>('BALANCED')
  const [pace, setPace] = useState<Pace>('BALANCED')
  const [interests, setInterests] = useState<Interest[]>(['ARCHITECTURE', 'PHOTOGRAPHY'])
  const [modes, setModes] = useState<TransportMode[]>(['PUBLIC_TRANSPORT', 'CAB', 'RAIL', 'FLIGHT'])
  const [mustSee, setMustSee] = useState<string[]>([])
  const [maxTravel, setMaxTravel] = useState(360)
  const [fewerHotels, setFewerHotels] = useState(true)
  const [photography, setPhotography] = useState(true)
  const [response, setResponse] = useState<PlanResponse | null>(null)
  const [activePlan, setActivePlan] = useState(0)
  const [status, setStatus] = useState<'IDLE' | 'PLANNING' | 'READY' | 'ERROR'>('IDLE')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const slug = searchParams.get('mustSee')
    const hit = sites.find((site) => site.slug === slug)
    if (hit) setMustSee((current) => current.includes(hit.id) ? current : [...current, hit.id])
  }, [searchParams, sites])

  const preferences = useMemo<TravelPreferences>(() => ({
    origin: ORIGINS.find((origin) => origin.id === originId) ?? ORIGINS[0],
    days,
    travelers,
    budget: { currency: 'INR', max: budget },
    style,
    pace,
    interests,
    transportModes: modes,
    mustSeePlaceIds: mustSee,
    maxDailyTravelMinutes: maxTravel,
    preferences: { fewerHotelChanges: fewerHotels, photography },
  }), [originId, days, travelers, budget, style, pace, interests, modes, mustSee, maxTravel, fewerHotels, photography])

  async function buildPlan() {
    setStatus('PLANNING')
    setSaved(false)
    try {
      const result = await fetch('/api/travel/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      if (!result.ok) throw new Error('Planning request failed')
      setResponse(await result.json() as PlanResponse)
      setActivePlan(0)
      setStatus('READY')
    } catch {
      setStatus('ERROR')
    }
  }

  const plan = response?.plans[activePlan] ?? response?.plans[0]

  return (
    <main className="min-h-screen pb-24 pt-24">
      <section className="mx-auto max-w-[110rem] px-5 md:px-8">
        <div className="grid gap-10 border-b border-border/70 pb-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <p className="label-meta mb-4">Bharatverse Journey Engine</p>
            <h1 className="display max-w-[15ch] text-[clamp(3rem,7vw,6.5rem)] leading-[0.88]">Build a journey that can actually happen.</h1>
          </div>
          <p className="max-w-[58ch] font-sans text-base leading-relaxed text-muted-foreground md:text-lg">A deterministic planner balances heritage, time, budget and distance. Every cost is a range, every route has a freshness label, and impossible requests are reported honestly.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[110rem] gap-10 px-5 py-12 md:px-8 xl:grid-cols-[24rem_1fr]">
        <form onSubmit={(event) => { event.preventDefault(); void buildPlan() }} className="flex flex-col gap-7 xl:sticky xl:top-20 xl:h-[calc(100svh-6rem)] xl:overflow-y-auto xl:pr-3 scrollbar-thin">
          <div className="flex flex-col gap-2">
            <label htmlFor="origin" className="label-meta">Starting from</label>
            <select id="origin" value={originId} onChange={(event) => setOriginId(event.target.value)} className="min-h-11 border border-border bg-card px-3 font-sans text-sm outline-none focus:border-accent">
              {ORIGINS.map((origin) => <option key={origin.id} value={origin.id}>{origin.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2"><span className="label-meta">Days</span><input type="number" min={1} max={14} value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-11 border border-border bg-card px-3 font-mono outline-none focus:border-accent" /></label>
            <label className="flex flex-col gap-2"><span className="label-meta">Travellers</span><input type="number" min={1} max={12} value={travelers} onChange={(event) => setTravelers(Number(event.target.value))} className="min-h-11 border border-border bg-card px-3 font-mono outline-none focus:border-accent" /></label>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between"><label htmlFor="budget" className="label-meta">Total trip budget</label><span className="font-serif text-2xl text-accent">{formatMoney(budget)}</span></div>
            <input id="budget" type="range" min={5_000} max={100_000} step={500} value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="accent-[var(--primary)]" />
            <p className="font-sans text-[0.6875rem] text-muted-foreground">The engine protects a 10% contingency by default.</p>
          </div>

          <fieldset className="flex flex-col gap-2"><legend className="label-meta mb-2">Travel style</legend><ToggleGroup value={style} onChange={setStyle} values={[{ id: 'BUDGET', label: 'Budget' }, { id: 'BALANCED', label: 'Balanced' }, { id: 'COMFORTABLE', label: 'Comfortable' }]} /></fieldset>
          <fieldset className="flex flex-col gap-2"><legend className="label-meta mb-2">Pace</legend><ToggleGroup value={pace} onChange={setPace} values={[{ id: 'RELAXED', label: 'Relaxed' }, { id: 'BALANCED', label: 'Balanced' }, { id: 'PACKED', label: 'Packed' }]} /></fieldset>

          <fieldset><legend className="label-meta mb-3">Interests</legend><div className="grid grid-cols-2 gap-2">{INTERESTS.map((item) => { const on = interests.includes(item.id); return <button key={item.id} type="button" aria-pressed={on} onClick={() => setInterests((current) => on ? current.filter((id) => id !== item.id) : [...current, item.id])} className={cn('min-h-11 border px-3 py-2 text-left font-sans text-xs transition-colors', on ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:text-foreground')}>{item.label}</button> })}</div></fieldset>

          <fieldset><legend className="label-meta mb-3">Transport</legend><div className="flex flex-wrap gap-2">{MODES.map((item) => { const on = modes.includes(item.id); return <button key={item.id} type="button" aria-pressed={on} onClick={() => setModes((current) => on ? current.filter((id) => id !== item.id) : [...current, item.id])} className={cn('min-h-11 border px-3 font-sans text-xs', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>{item.label}</button> })}</div></fieldset>

          <label className="flex flex-col gap-3"><span className="flex items-center justify-between"><span className="label-meta">Maximum daily travel</span><span className="font-mono text-xs text-accent">{formatTime(maxTravel)}</span></span><input type="range" min={60} max={720} step={30} value={maxTravel} onChange={(event) => setMaxTravel(Number(event.target.value))} className="accent-[var(--primary)]" /></label>

          <fieldset><legend className="label-meta mb-3">Must-see destinations</legend><div className="flex flex-col gap-1.5">{sites.map((site) => <label key={site.id} className="flex min-h-11 items-center gap-3 border border-border/60 px-3 font-sans text-xs text-muted-foreground"><input type="checkbox" checked={mustSee.includes(site.id)} onChange={(event) => setMustSee((current) => event.target.checked ? [...current, site.id] : current.filter((id) => id !== site.id))} className="accent-[var(--accent)]" /><span>{site.name}</span><span className="ml-auto text-[0.625rem] uppercase">{site.city}</span></label>)}</div></fieldset>

          <fieldset className="flex flex-col gap-2"><legend className="label-meta mb-1">Trip preferences</legend><label className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={fewerHotels} onChange={(event) => setFewerHotels(event.target.checked)} /> Prefer fewer hotel changes</label><label className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={photography} onChange={(event) => setPhotography(event.target.checked)} /> Photography-friendly schedule</label></fieldset>

          <button type="submit" disabled={status === 'PLANNING' || interests.length === 0 || modes.length === 0} className="sticky bottom-2 flex min-h-12 items-center justify-center gap-2 border border-primary bg-primary px-5 font-sans text-xs uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-50"><Sparkles className="size-4" />{status === 'PLANNING' ? 'Evaluating routes…' : response ? 'Recompute journey' : 'Build my heritage journey'}</button>
        </form>

        <div aria-live="polite" className="min-w-0">
          {status === 'IDLE' && <div className="grid min-h-[34rem] place-items-center border border-border/70 bg-card/20 p-8 text-center"><div className="max-w-md"><Compass className="mx-auto mb-5 size-10 text-primary" /><h2 className="font-serif text-3xl font-light">Your route begins with constraints.</h2><p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">Choose what matters. Bharatverse will calculate three distinct routes and show the assumptions behind every one.</p></div></div>}
          {status === 'PLANNING' && <div className="grid min-h-[34rem] place-items-center border border-border/70 bg-card/20 p-8 text-center"><RefreshCw className="mb-5 size-9 animate-spin text-primary motion-reduce:animate-none" /><p className="font-serif text-2xl">Checking budget, time and distance…</p><p className="mt-2 label-meta">Deterministic calculation · no LLM routing</p></div>}
          {status === 'ERROR' && <div className="border border-destructive/50 bg-destructive/10 p-8"><h2 className="font-serif text-2xl">The planner could not complete this calculation.</h2><p className="mt-2 text-sm text-muted-foreground">Your inputs are still here. Try recomputing; no trip data has been lost.</p></div>}
          {status === 'READY' && response && !response.feasible && <div className="mb-6 border border-primary/50 bg-primary/8 p-7"><span className="label-meta text-primary">Honest feasibility check</span><h2 className="mt-3 font-serif text-3xl">This trip is not realistically feasible under the current constraints.</h2><p className="mt-3 text-sm text-muted-foreground">Binding constraints: {response.bindingConstraints.join(' · ')}</p><div className="mt-5 flex flex-wrap gap-2">{response.suggestions.map((item) => <span key={item} className="border border-border px-3 py-2 text-xs text-foreground">+ {item}</span>)}</div></div>}
          {status === 'READY' && plan && <div className="flex flex-col gap-8">
            <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-3">{response?.plans.map((item, index) => <button key={item.id} type="button" onClick={() => setActivePlan(index)} className={cn('min-h-40 bg-background p-5 text-left transition-colors', activePlan === index ? 'bg-primary/10' : 'hover:bg-card')}><span className={cn('label-meta', activePlan === index && 'text-accent')}>{item.title}</span><p className="mt-3 font-serif text-2xl">{formatMoney(item.costs.total.expected)}</p><p className="mt-1 font-sans text-xs text-muted-foreground">{formatTime(item.totalTransitMinutes)} transit · {item.heritageStops} heritage stops</p><p className="mt-4 font-sans text-xs leading-relaxed text-muted-foreground">{item.summary}</p></button>)}</div>

            <div className="grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">{[
              ['Expected spend', formatMoney(plan.costs.total.expected)],
              ['Possible range', `${formatMoney(plan.costs.total.min)}–${formatMoney(plan.costs.total.max)}`],
              ['Safety reserve', formatMoney(plan.costs.contingency.expected)],
              ['Remaining', formatMoney(Math.max(0, plan.costs.remaining))],
            ].map(([label, value]) => <div key={label} className="bg-background p-5"><dt className="label-meta">{label}</dt><dd className="mt-2 font-serif text-2xl text-accent">{value}</dd></div>)}</div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]"><div className="flex flex-col gap-4">{plan.days.map((day) => <article key={day.day} className="border border-border/70 bg-card/20"><header className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><span className="label-meta">Day {day.day}</span><h3 className="font-serif text-2xl">{day.region}</h3></div><span className="font-mono text-xs text-muted-foreground">{formatTime(day.travelMinutes)} transit</span></header>{day.stops.map((stop) => <div key={stop.place.id} className="grid grid-cols-[4rem_1fr] gap-4 p-5"><span className="font-mono text-xs text-accent">{clock(stop.arrivalMinute)}</span><div><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-serif text-2xl">{stop.place.name}</h4><p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Immersive twin · {formatTime(stop.departureMinute - stop.arrivalMinute)}</p></div><span className="border border-primary/40 px-2 py-1 text-[0.625rem] uppercase text-primary">{stop.transfer.freshness}</span></div><div className="mt-4 flex items-center gap-2 border-y border-border/60 py-3 text-xs text-muted-foreground"><Route className="size-4 text-primary" />{formatTime(stop.transfer.minutes)} · {stop.transfer.distanceKm} km · {stop.transfer.mode.toLowerCase().replaceAll('_', ' ')}<span className="ml-auto">{formatMoney(stop.transfer.cost.expected)}</span></div><details className="mt-4"><summary className="cursor-pointer text-xs uppercase tracking-[0.14em] text-accent">Why is this in my itinerary?</summary><ul className="mt-3 flex flex-col gap-2">{stop.reasons.map((reason) => <li key={reason} className="flex gap-2 text-xs text-muted-foreground"><Check className="size-3.5 shrink-0 text-accent" />{reason}</li>)}</ul></details><div className="mt-4 flex flex-wrap gap-2"><Link href={`/site/${stop.place.slug}`} className="min-h-11 border border-primary px-3 py-3 text-xs uppercase tracking-[0.14em] text-primary">Preview in Twin</Link><Link href={`/guide?site=${stop.place.slug}`} className="min-h-11 border border-border px-3 py-3 text-xs uppercase tracking-[0.14em]">Ask Bharatverse</Link></div></div></div>)}<div className="flex items-center gap-3 border-t border-dashed border-border px-5 py-4"><Sparkles className="size-4 text-accent" /><div><p className="text-xs uppercase tracking-[0.14em] text-accent">Serendipity window · {formatTime(day.flexibleMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">Reserved for rest, photography or a verified nearby discovery.</p></div></div></article>)}</div><RouteSketch plan={plan} origin={preferences.origin} /></div>

            <JourneyBookingLayer destinations={plan.days.flatMap((day) => day.stops.flatMap((stop) => stop.place.slug ? [{ slug: stop.place.slug, name: stop.place.name, city: stop.place.city }] : []))} />

            <section className="border border-border/70 bg-card/30 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="label-meta">What-if engine</span><h2 className="mt-2 font-serif text-3xl">Change one constraint. Recompute the truth.</h2></div><button type="button" onClick={() => void buildPlan()} className="flex min-h-11 items-center gap-2 border border-primary px-4 text-xs uppercase tracking-[0.14em] text-primary"><RefreshCw className="size-4" />Apply changes</button></div><div className="mt-6 grid gap-5 md:grid-cols-2"><label className="flex flex-col gap-3"><span className="flex justify-between text-xs text-muted-foreground"><span>Budget</span><span className="text-accent">{formatMoney(budget)}</span></span><input type="range" min={5_000} max={100_000} step={500} value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="accent-[var(--primary)]" /></label><label className="flex flex-col gap-3"><span className="flex justify-between text-xs text-muted-foreground"><span>Daily travel</span><span className="text-accent">{formatTime(maxTravel)}</span></span><input type="range" min={60} max={720} step={30} value={maxTravel} onChange={(event) => setMaxTravel(Number(event.target.value))} className="accent-[var(--primary)]" /></label></div></section>

            <details className="border border-border/70 p-5"><summary className="cursor-pointer label-meta">Assumptions & data freshness</summary><ul className="mt-4 flex flex-col gap-3">{plan.assumptions.map((item) => <li key={item} className="flex gap-3 text-sm text-muted-foreground"><span className="text-primary">—</span>{item}</li>)}</ul>{plan.validation.warnings.map((warning) => <p key={warning} className="mt-4 border-l-2 border-accent pl-3 text-xs text-muted-foreground">{warning}</p>)}</details>

            <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => { saveTrip(preferences, plan); setSaved(true) }} className="flex min-h-12 items-center gap-2 border border-primary bg-primary px-5 text-xs uppercase tracking-[0.18em] text-primary-foreground"><Save className="size-4" />{saved ? 'Journey saved' : 'Save journey'}</button>{saved && <Link href="/today" className="flex min-h-12 items-center gap-2 border border-accent px-5 text-xs uppercase tracking-[0.18em] text-accent">Open Today mode <ArrowRight className="size-4" /></Link>}</div>
          </div>}
        </div>
      </section>
    </main>
  )
}
