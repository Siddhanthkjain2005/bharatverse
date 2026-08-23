'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import type { SourceRef } from '@/lib/heritage/types'

export function SourceRegistry({ sources, associations }: { sources: SourceRef[]; associations: Record<string, string[]> }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('ALL')
  const results = useMemo(() => sources.filter((source) => {
    if (scope !== 'ALL' && source.scope !== scope) return false
    const q = query.trim().toLowerCase()
    return !q || `${source.title} ${source.publisher} ${source.license} ${(associations[source.id] ?? []).join(' ')}`.toLowerCase().includes(q)
  }), [sources, associations, query, scope])
  return (
    <div className="py-10">
      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_14rem]"><label className="flex min-h-12 items-center gap-3 border border-border bg-card px-4"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search publisher, source, monument…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><select value={scope} onChange={(event) => setScope(event.target.value)} className="min-h-12 border border-border bg-card px-4 text-sm outline-none"><option value="ALL">All scopes</option><option value="GLOBAL">Global</option><option value="NATIONAL">National</option><option value="STATE">State</option><option value="SITE">Site</option></select></div>
      <p className="mb-4 font-mono text-xs text-accent">{results.length} registered sources</p>
      <ul className="grid gap-px border border-border/70 bg-border/70 lg:grid-cols-2">{results.map((source) => <li key={source.id} className="flex flex-col gap-4 bg-background p-6"><div className="flex items-start justify-between gap-4"><div><span className="font-mono text-[0.625rem] text-accent">{source.id}</span><h2 className="mt-2 font-serif text-2xl font-light">{source.title}</h2><p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{source.publisher}</p></div><a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title}`} className="grid size-11 shrink-0 place-items-center border border-border text-muted-foreground hover:text-accent"><ExternalLink className="size-4" /></a></div><dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="label-meta">Scope</dt><dd className="mt-1">{source.scope}</dd></div><div><dt className="label-meta">Status</dt><dd className="mt-1">Verified registry entry</dd></div><div><dt className="label-meta">Reuse</dt><dd className="mt-1">{source.reuse.replaceAll('_', ' ')}</dd></div><div><dt className="label-meta">Last checked</dt><dd className="mt-1">{source.lastChecked}</dd></div></dl><div><span className="label-meta">Associated monuments</span><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{associations[source.id]?.join(' · ') || 'Platform-wide reference'}</p></div></li>)}</ul>
    </div>
  )
}
