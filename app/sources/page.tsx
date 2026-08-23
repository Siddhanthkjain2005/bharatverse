import type { Metadata } from 'next'
import { PageHero } from '@/components/content/page-hero'
import { SourceRegistry } from '@/components/sources/source-registry'
import { allSites } from '@/lib/heritage/query'
import { SOURCES } from '@/lib/heritage/sources'

export const metadata: Metadata = { title: 'Source registry', description: 'Search every institutional and platform source used by Bharatverse.' }

export default function SourcesPage() {
  const associations = Object.fromEntries(SOURCES.map((source) => [source.id, allSites().filter((site) => site.sourceIds.includes(source.id) || site.facts.some((fact) => fact.sourceIds.includes(source.id))).map((site) => site.name)]))
  return <main className="mx-auto max-w-[110rem] px-5 pb-24 pt-28 md:px-8"><PageHero eyebrow="Trust ledger" title="Every source has a name, scope and reuse posture." lede="Bharatverse links claims to registered institutional sources. Listing a source is not endorsement or partnership; it is a traceable record of what supports the interface." /><SourceRegistry sources={SOURCES} associations={associations} /></main>
}
