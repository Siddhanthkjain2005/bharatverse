'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Clock3, MapPin } from 'lucide-react'
import { readStoredState, updateStoredState, type StoredBharatverseState } from '@/lib/travel/storage'

export function SavedTrips() {
  const [state, setState] = useState<StoredBharatverseState | null>(null)
  useEffect(() => setState(readStoredState()), [])
  if (!state) return <div className="min-h-64 animate-pulse border border-border bg-card/20" />
  if (!state.trips.length) return <div className="grid min-h-72 place-items-center border border-border bg-card/20 p-8 text-center"><div><MapPin className="mx-auto size-9 text-primary" /><h2 className="mt-4 font-serif text-3xl">No saved journeys yet.</h2><p className="mt-2 text-sm text-muted-foreground">Build a feasible route, then save it here for Today mode.</p><Link href="/plan" className="mt-5 inline-flex min-h-11 items-center border border-primary bg-primary px-4 text-xs uppercase tracking-[0.14em] text-primary-foreground">Plan a journey</Link></div></div>
  return <ul className="grid gap-5 md:grid-cols-2">{state.trips.map((trip) => <li key={trip.id} className="border border-border/70 bg-card/20 p-6"><div className="flex items-start justify-between gap-3"><div><span className="label-meta">{trip.plan.title}</span><h2 className="mt-2 font-serif text-3xl">{trip.preferences.origin.name} heritage journey</h2></div>{state.activeTripId === trip.id && <span className="border border-accent px-2 py-1 text-[0.625rem] uppercase text-accent">Active</span>}</div><div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Clock3 className="size-4 text-primary" />{trip.preferences.days} days</span><span>{trip.plan.heritageStops} stops</span><span>₹{trip.plan.costs.total.expected.toLocaleString('en-IN')} estimated</span></div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{trip.plan.days.map((day) => day.region.split(' · ')[0]).join(' → ')}</p><div className="mt-6 flex gap-2"><button type="button" onClick={() => { const next = { ...state, activeTripId: trip.id }; updateStoredState(next); setState(next) }} className="min-h-11 border border-border px-3 text-xs uppercase tracking-[0.14em]">Make active</button><Link href="/today" onClick={() => { const next = { ...state, activeTripId: trip.id }; updateStoredState(next) }} className="ml-auto flex min-h-11 items-center gap-2 border border-primary px-3 text-xs uppercase tracking-[0.14em] text-primary">Open Today <ArrowRight className="size-4" /></Link></div></li>)}</ul>
}
