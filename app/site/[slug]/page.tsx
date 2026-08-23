import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TwinWorkspace } from '@/components/site/twin-workspace'
import { EvidenceBadge } from '@/components/provenance'
import { GuidePanel } from '@/components/guide/guide-panel'
import { allSites, scriptLang, siteBySlug } from '@/lib/heritage/query'
import { JourneyAction } from '@/components/planner/journey-action'
import { DestinationTravelDesk } from '@/components/travel/destination-travel-desk'

export function generateStaticParams() {
  return allSites().map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const site = siteBySlug(slug)
  if (!site) return { title: 'Monument not found — Bharatverse AI' }
  return {
    title: `${site.name} — Bharatverse AI`,
    description: site.summary,
    openGraph: { title: site.name, description: site.summary, images: [] },
    twitter: { title: site.name, description: site.summary, images: [] },
  }
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const site = siteBySlug(slug)
  if (!site) notFound()

  return (
    <main>
      {/* ---------- title block ---------- */}
      <header className="mx-auto max-w-[110rem] px-5 pb-8 pt-28 md:px-8">
        <div className="flex flex-col gap-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <Link
              href="/atlas"
              className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
            >
              Atlas
            </Link>
            <span aria-hidden className="font-mono text-[0.625rem] text-border">
              ›
            </span>
            <span className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-accent">
              {site.state}
            </span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="display text-[clamp(2.5rem,6vw,5rem)] leading-[0.9]">
                {site.name}
              </h1>
              {site.localName && (
                <p
                  lang={scriptLang(site.localName)}
                  className="local-name text-xl font-light text-muted-foreground"
                >
                  {site.localName}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-4">
              <JourneyAction slug={site.slug} />
              <Link href={`/site/${site.slug}/time-portal`} className="inline-flex min-h-11 items-center border border-accent px-4 font-sans text-xs uppercase tracking-[0.16em] text-accent">Open Time Portal</Link>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 lg:ml-auto">
              {[
                { label: 'Period', value: site.period },
                { label: 'Tradition', value: site.tradition },
                { label: 'Location', value: `${site.city}, ${site.state}` },
                {
                  label: 'UNESCO',
                  value: site.unescoRef ? `Ref ${site.unescoRef}` : 'Not inscribed',
                },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <dt className="label-meta">{f.label}</dt>
                  <dd className="max-w-[26ch] font-sans text-sm text-foreground/90">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="max-w-[78ch] font-sans text-base leading-relaxed text-muted-foreground md:text-lg">
            {site.summary}
          </p>
        </div>
      </header>

      {/* ---------- the twin ---------- */}
      <TwinWorkspace site={site} />

      <DestinationTravelDesk destination={{ slug: site.slug, name: site.name, city: site.city }} />

      {/* ---------- narrative modes ---------- */}
      <section
        aria-label="Ways of telling this monument"
        className="mx-auto max-w-[110rem] px-5 pb-24 md:px-8"
      >
        <div className="mb-8 flex flex-col gap-3">
          <span className="label-meta">Ways of telling</span>
          <h2 className="display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight">
            The same monument, told four ways.
          </h2>
          <p className="max-w-[68ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Each account carries its own evidence grade, so a documented fact is
            never mistaken for a remembered story.
          </p>
        </div>

        <ul className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2">
          {site.stories.map((story) => (
            <li key={story.mode} className="flex flex-col gap-4 bg-background p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-xl font-light text-foreground">
                  {story.label}
                </h3>
                <EvidenceBadge level={story.evidence} />
              </div>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                {story.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Ask the guide"
        className="border-t border-border/70 bg-card/20"
      >
        <div className="mx-auto max-w-[60rem] px-5 py-20 md:px-8">
          <GuidePanel
            siteSlug={site.slug}
            siteName={site.name}
            suggestions={[
              `Who built ${site.name} and when?`,
              'What are the principal materials?',
              'What is documented about the interior?',
              'What is disputed or uncertain here?',
            ]}
          />
        </div>
      </section>
    </main>
  )
}
