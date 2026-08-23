import type { Metadata } from 'next'
import { PageHero } from '@/components/content/page-hero'
import { SavedTrips } from '@/components/trips/saved-trips'

export const metadata: Metadata = { title: 'Saved journeys', description: 'Local-first Bharatverse heritage journeys.' }
export default function TripsPage() { return <main className="mx-auto max-w-[110rem] px-5 pb-24 pt-28 md:px-8"><PageHero eyebrow="Your journeys" title="Saved for the road ahead." lede="Trips in this SIH build stay on this device. Open one in Today mode for a focused, mobile-first travel view." /><div className="py-10"><SavedTrips /></div></main> }
