'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import { JourneyAction } from '@/components/planner/journey-action'
import { EvidenceBadge } from '@/components/provenance'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const EXPERIENCES = ['Architecture', 'History', 'Photography', 'Spiritual', 'Archaeology'] as const

export function DestinationExplorer({ sites }: { sites: HeritageSite[] }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState('ALL')
  const [era, setEra] = useState('ALL')
  const [unesco, setUnesco] = useState(false)
  const [experience, setExperience] = useState<string>('ALL')
  const states = Array.from(new Set(sites.map((site) => site.state))).sort()
  const eras = Array.from(new Set(sites.map((site) => site.era))).sort()

  const results = useMemo(() => sites.filter((site) => {
    const query = q.trim().toLocaleLowerCase()
    if (query && !`${site.name} ${site.localName ?? ''} ${site.city} ${site.state} ${site.tradition} ${site.summary}`.toLocaleLowerCase().includes(query)) return false
    if (state !== 'ALL' && site.state !== state) return false
    if (era !== 'ALL' && site.era !== era) return false
    if (unesco && !site.unescoRef) return false
    if (experience !== 'ALL') {
      const text = `${site.summary} ${site.tradition} ${site.hotspots.map((item) => item.kind).join(' ')}`.toLowerCase()
      if (!text.includes(experience.toLowerCase()) && !(experience === 'Photography')) return false
    }
    return true
  }), [q, state, era, unesco, experience, sites])

  return (
    <main className="pb-24 pt-24">
      <section className="mx-auto max-w-[110rem] px-5 md:px-8">
        <div className="grid gap-10 border-b border-border/70 pb-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div><span className="label-meta">Discover India</span><h1 className="mt-4 display text-[clamp(3.5rem,8vw,8rem)] leading-[.82]">Find the place that stays with you.</h1></div>
          <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground md:text-lg">Explore a deliberately small, fully sourced collection of immersive heritage twins. Preview the monument, understand its record, then add it to a journey that fits your real constraints.</p>
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[18rem_1fr]">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
            <label className="flex flex-col gap-2"><span className="label-meta">Search destinations</span><span className="flex min-h-11 items-center gap-2 border border-border bg-card px-3"><Search className="size-4 text-muted-foreground" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Monument, city, tradition…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></span></label>
            <label className="flex flex-col gap-2"><span className="label-meta">Region / state</span><select value={state} onChange={(event) => setState(event.target.value)} className="min-h-11 border border-border bg-card px-3 text-sm outline-none"><option value="ALL">All states</option>{states.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="flex flex-col gap-2"><span className="label-meta">Era</span><select value={era} onChange={(event) => setEra(event.target.value)} className="min-h-11 border border-border bg-card px-3 text-sm outline-none"><option value="ALL">All eras</option>{eras.map((item) => <option key={item}>{item}</option>)}</select></label>
            <fieldset><legend className="label-meta mb-3">Experience</legend><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExperience('ALL')} className={cn('min-h-10 border px-3 text-xs', experience === 'ALL' ? 'border-accent text-accent' : 'border-border text-muted-foreground')}>All</button>{EXPERIENCES.map((item) => <button key={item} type="button" onClick={() => setExperience(item)} className={cn('min-h-10 border px-3 text-xs', experience === item ? 'border-accent text-accent' : 'border-border text-muted-foreground')}>{item}</button>)}</div></fieldset>
            <label className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={unesco} onChange={(event) => setUnesco(event.target.checked)} className="accent-[var(--accent)]" />UNESCO-inscribed only</label>
            <div className="border-t border-border pt-4"><span className="font-mono text-xs text-accent">{String(results.length).padStart(2, '0')}</span><span className="ml-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">destinations</span></div>
          </aside>

          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{results.map((site, index) => <li key={site.id} className="group flex min-h-[30rem] flex-col overflow-hidden border border-border/70 bg-card/20 transition-colors hover:border-primary/50"><div className="relative h-48 overflow-hidden" style={{ background: `radial-gradient(circle at 65% 35%, ${site.palette.accent}66, transparent 23%), linear-gradient(150deg, ${site.palette.sky}, ${site.palette.stone}66 58%, #14110e)` }}><div className="absolute inset-x-[18%] bottom-0 h-[58%] border-x border-t border-foreground/20 bg-background/20 [clip-path:polygon(15%_100%,15%_42%,30%_42%,30%_20%,42%_20%,50%_0,58%_20%,70%_20%,70%_42%,85%_42%,85%_100%)]" /><span className="absolute left-4 top-4 font-mono text-xs text-foreground/70">{String(index + 1).padStart(2, '0')}</span><span className="absolute right-4 top-4 border border-foreground/30 bg-background/40 px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] backdrop-blur">Immersive twin</span></div><div className="flex flex-1 flex-col gap-4 p-5"><div><p className="local-name text-sm text-muted-foreground">{site.localName}</p><h2 className="mt-1 font-serif text-3xl font-light leading-none">{site.name}</h2><p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{site.city} · {site.state}</p></div><p className="text-sm leading-relaxed text-muted-foreground">{site.heroLine}</p><div className="mt-auto flex flex-wrap items-center gap-2"><EvidenceBadge level={site.stories[0]?.evidence ?? 'VERIFIED_FACT'} />{site.unescoRef && <span className="border border-primary/40 px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-primary">UNESCO</span>}</div><div className="grid grid-cols-2 gap-2"><Link href={`/site/${site.slug}`} className="flex min-h-11 items-center justify-center gap-2 border border-border text-xs uppercase tracking-[0.14em] transition-colors hover:border-accent hover:text-accent">Preview <ArrowUpRight className="size-4" /></Link><JourneyAction slug={site.slug} compact /></div></div></li>)}</ul>
        </div>
      </section>
    </main>
  )
}
