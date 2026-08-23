'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CloudOff, IndianRupee, MapPin, Plus } from 'lucide-react'
import { readStoredState, updateStoredState, type StoredBharatverseState } from '@/lib/travel/storage'

export function TodayMode() {
  const [state, setState] = useState<StoredBharatverseState | null>(null)
  const [label, setLabel] = useState('Lunch')
  const [amount, setAmount] = useState(0)
  useEffect(() => setState(readStoredState()), [])
  const trip = useMemo(() => state?.trips.find((item) => item.id === state.activeTripId) ?? state?.trips[0], [state])
  if (!state) return <div className="min-h-72 animate-pulse bg-card/20" />
  if (!trip) return <div className="grid min-h-80 place-items-center border border-border p-8 text-center"><div><h2 className="font-serif text-3xl">No active journey.</h2><Link href="/plan" className="mt-5 inline-flex min-h-11 items-center border border-primary px-4 text-xs uppercase tracking-[0.14em] text-primary">Plan one now</Link></div></div>
  const day = trip.plan.days[0]
  const next = day?.stops[0]
  const plannedToday = day?.expectedSpend ?? 0
  const actual = trip.actualSpend.reduce((sum, item) => sum + item.amount, 0)
  const difference = plannedToday - actual
  const addSpend = () => {
    if (!amount || amount < 0) return
    const nextState = { ...state, trips: state.trips.map((item) => item.id === trip.id ? { ...item, actualSpend: [...item.actualSpend, { id: crypto.randomUUID(), label, amount, date: new Date().toISOString() }] } : item) }
    updateStoredState(nextState)
    setState(nextState)
    setAmount(0)
  }
  return <div className="mx-auto max-w-3xl"><div className="border border-border/70 bg-[radial-gradient(circle_at_80%_0%,oklch(0.63_0.135_44/.22),transparent_35%),oklch(0.21_0.014_62)] p-6 md:p-9"><div className="flex items-center justify-between gap-3"><span className="label-meta">Today · Day 1</span><span className="flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground"><CloudOff className="size-4" />Offline-ready trip data</span></div><h1 className="mt-7 font-serif text-5xl font-light">Good morning.</h1><div className="mt-6 grid grid-cols-3 gap-px bg-border/70">{[['Stops', String(day?.stops.length ?? 0)], ['Planned', `₹${Math.round(plannedToday).toLocaleString('en-IN')}`], ['Transit', `${Math.round((day?.travelMinutes ?? 0) / 60 * 10) / 10}h`]].map(([key, value]) => <div key={key} className="bg-card p-4"><p className="label-meta">{key}</p><p className="mt-2 font-serif text-2xl text-accent">{value}</p></div>)}</div>{next && <section className="mt-8 border border-primary/50 bg-background/60 p-5"><span className="label-meta text-primary">Next</span><div className="mt-3 flex items-start justify-between gap-5"><div><h2 className="font-serif text-4xl">{next.place.name}</h2><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{next.place.city} · arrival {String(Math.floor(next.arrivalMinute / 60)).padStart(2, '0')}:{String(next.arrivalMinute % 60).padStart(2, '0')}</p></div><span className="border border-accent px-2 py-1 text-[0.625rem] uppercase text-accent">Immersive twin</span></div><p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">{next.transfer.note} · {next.transfer.minutes} min · accessibility not yet verified.</p><div className="mt-5 grid grid-cols-2 gap-2"><Link href={`/site/${next.place.slug}`} className="flex min-h-12 items-center justify-center border border-primary bg-primary text-xs uppercase tracking-[0.14em] text-primary-foreground">Enter Twin</Link><Link href={`/guide?site=${next.place.slug}`} className="flex min-h-12 items-center justify-center border border-border text-xs uppercase tracking-[0.14em]">Ask Guide</Link></div></section>}</div><section className="mt-6 border border-border/70 p-6"><span className="label-meta">Budget Guardian</span><div className="mt-4 grid grid-cols-3 gap-3">{[['Planned today', plannedToday], ['Actual', actual], [difference >= 0 ? 'Ahead by' : 'Over by', Math.abs(difference)]].map(([key, value]) => <div key={String(key)}><p className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">{key}</p><p className="mt-1 font-serif text-2xl">₹{Math.round(Number(value)).toLocaleString('en-IN')}</p></div>)}</div>{difference < 0 && <p className="mt-5 border-l-2 border-primary pl-3 text-sm text-muted-foreground">You are ₹{Math.abs(Math.round(difference)).toLocaleString('en-IN')} above today’s plan. Recompute the remaining journey without removing must-see destinations.</p>}<div className="mt-6 grid gap-2 sm:grid-cols-[1fr_9rem_auto]"><input value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Expense label" className="min-h-11 border border-border bg-card px-3 text-sm outline-none" /><span className="flex min-h-11 items-center gap-1 border border-border bg-card px-3"><IndianRupee className="size-4" /><input type="number" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value))} aria-label="Expense amount" className="w-full bg-transparent font-mono outline-none" /></span><button type="button" onClick={addSpend} className="flex min-h-11 items-center justify-center gap-2 border border-primary px-4 text-xs uppercase tracking-[0.14em] text-primary"><Plus className="size-4" />Add spend</button></div></section><Link href="/plan" className="mt-6 flex min-h-12 items-center justify-center gap-2 border border-border text-xs uppercase tracking-[0.14em]">Adjust journey <ArrowRight className="size-4" /></Link></div>
}
