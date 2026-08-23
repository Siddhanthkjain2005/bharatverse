import type { Metadata } from 'next'
import { PageHero } from '@/components/content/page-hero'

export const metadata: Metadata = { title: 'Data & privacy policy', description: 'How Bharatverse labels freshness, permissions, external data and local trip storage.' }

const LEVELS = [
  ['LIVE', 'Recently obtained from a named provider. Includes checked and validity timestamps where available.'],
  ['VERIFIED', 'Confirmed against a trusted source, but not necessarily real-time.'],
  ['ESTIMATED', 'Calculated from a disclosed model or conservative planning assumption. Not a quote.'],
  ['DEMO', 'Synthetic values used only to demonstrate a workflow. Never a real-world measurement.'],
  ['UNVERIFIED', 'The platform has not confirmed this information. Unknown never means accessible, open or available.'],
]

export default function DataPolicyPage() {
  return <main className="mx-auto max-w-[110rem] px-5 pb-24 pt-28 md:px-8"><PageHero eyebrow="Data honesty & privacy" title="A value without context is not trustworthy." lede="Bharatverse treats freshness, source and permission as part of the data—not as fine print. The current SIH build stores personal journey state locally on the visitor’s device." /><section className="py-12"><h2 className="font-serif text-4xl">Operational freshness</h2><dl className="mt-6 grid gap-px border border-border/70 bg-border/70 md:grid-cols-5">{LEVELS.map(([label, body]) => <div key={label} className="bg-background p-5"><dt className="font-mono text-xs text-accent">{label}</dt><dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</dd></div>)}</dl></section><section className="grid gap-px bg-border/70 md:grid-cols-2">{[
    ['Location permission', 'Optional and requested only for nearby discovery or an optional on-site stamp. Continuous tracking is not required.'],
    ['Camera permission', 'Requested only when the visitor opens Time Portal. The camera stream stays in the browser and stops when the experience closes.'],
    ['External providers', 'Nearby stays, ratings, review excerpts and photos are requested from Google Places when the travel desk opens. Road distance and traffic-aware time use Google Routes where available. Public price evidence is retrieved through Groq Compound web search. Responses are marked with provider and refresh time; server credentials never cross into the browser.'],
    ['Prices & booking', 'Room rates, flight fares, taxi and auto prices, tickets and availability change with dates, passengers, traffic and inventory. The Price Pulse searches only publicly indexable pages and labels the result indicative. It never enters private accounts, scrapes restricted booking systems or presents an AI-generated price as bookable. Checkout or the transport provider must confirm the final total.'],
    ['Local journey state', 'Drafts, saved trips, passport progress and spending are stored in versioned browser storage in this build. Clearing site data removes them.'],
    ['Heritage facts', 'Bharatverse does not sell, fabricate or silently rewrite heritage claims. Evidence levels and registered sources remain attached.'],
    ['Missing information', '“Information not yet verified” is a valid result. Bharatverse prefers an honest gap to fabricated completeness.'],
  ].map(([title, body]) => <article key={title} className="bg-background p-7"><h2 className="font-serif text-3xl">{title}</h2><p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{body}</p></article>)}</section></main>
}
