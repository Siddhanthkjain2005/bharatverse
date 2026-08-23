'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'

export function JourneyQuickStart() {
  const router = useRouter()
  const [origin, setOrigin] = useState('bengaluru')
  const [days, setDays] = useState(4)
  const [budget, setBudget] = useState(18_000)

  return (
    <section className="relative z-10 border-b border-border/70 bg-background py-12 md:py-16">
      <div className="mx-auto max-w-[110rem] px-5 md:px-8">
        <div className="grid gap-8 border border-border/70 bg-card/30 p-6 md:p-8 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <span className="label-meta">Plan in 60 seconds</span>
            <h2 className="mt-3 font-serif text-3xl font-light md:text-4xl">Start with the shape of your trip.</h2>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">We will turn these constraints into three honest, editable heritage routes.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); router.push(`/plan?origin=${origin}&days=${days}&budget=${budget}`) }} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1.2fr_.6fr_.8fr_auto]">
            <label className="flex flex-col gap-2"><span className="label-meta">Starting from</span><span className="flex min-h-12 items-center gap-2 border border-border bg-background px-3"><MapPin className="size-4 text-primary" /><select value={origin} onChange={(event) => setOrigin(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"><option value="bengaluru">Bengaluru</option><option value="delhi">Delhi</option><option value="mumbai">Mumbai</option><option value="chennai">Chennai</option><option value="kolkata">Kolkata</option></select></span></label>
            <label className="flex flex-col gap-2"><span className="label-meta">Days</span><input type="number" min={1} max={14} value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-12 border border-border bg-background px-3 font-mono outline-none" /></label>
            <label className="flex flex-col gap-2"><span className="label-meta">Budget</span><input type="number" min={5_000} step={500} value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="min-h-12 border border-border bg-background px-3 font-mono outline-none" /></label>
            <button type="submit" className="flex min-h-12 items-center justify-center gap-2 self-end border border-primary bg-primary px-5 text-xs uppercase tracking-[0.16em] text-primary-foreground">Build journey <ArrowRight className="size-4" /></button>
          </form>
        </div>
      </div>
    </section>
  )
}
