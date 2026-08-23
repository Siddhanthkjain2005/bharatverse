import type { Metadata } from 'next'
import { DestinationExplorer } from '@/components/explore/destination-explorer'
import { allSites } from '@/lib/heritage/query'

export const metadata: Metadata = {
  title: 'Explore heritage destinations',
  description: 'Discover evidence-rich Indian heritage destinations, preview their immersive twins and add them to a real journey.',
}

export default function ExplorePage() {
  return <DestinationExplorer sites={allSites()} />
}
