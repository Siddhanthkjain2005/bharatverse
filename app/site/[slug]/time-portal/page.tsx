import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TimePortal } from '@/components/site/time-portal'
import { allSites, siteBySlug } from '@/lib/heritage/query'

export function generateStaticParams() { return allSites().map((site) => ({ slug: site.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const site = siteBySlug(slug); return { title: site ? `Time Portal · ${site.name}` : 'Time Portal' } }
export default async function TimePortalPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const site = siteBySlug(slug); if (!site) notFound(); return <main className="mx-auto max-w-[110rem] px-5 pb-24 pt-28 md:px-8"><span className="label-meta">On-site historical camera</span><h1 className="mt-4 display text-[clamp(3rem,7vw,6rem)] leading-[.88]">Time Portal · {site.name}</h1><p className="mb-10 mt-5 max-w-[68ch] text-base leading-relaxed text-muted-foreground">Align an interpretive historical reference with the present view, then fade between them. Camera access is optional and no survey-grade registration is claimed.</p><TimePortal site={{ name: site.name, slug: site.slug, timeline: site.timeline.map(({ id, year, title }) => ({ id, year, title })) }} /></main> }
