import type { Metadata } from 'next'
import { PlannerShell } from '@/components/planner/planner-shell'
import { allSites } from '@/lib/heritage/query'

export const metadata: Metadata = {
  title: 'Plan a heritage journey',
  description: 'Build a complete heritage itinerary with live nearby stays, driving distance, official ticketing, transport links and explicit planning assumptions.',
}

export default function PlanPage() {
  const sites = allSites().map(({ id, slug, name, city, state }) => ({ id, slug, name, city, state }))
  return <PlannerShell sites={sites} />
}
