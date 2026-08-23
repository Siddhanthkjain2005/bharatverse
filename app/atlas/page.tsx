import type { Metadata } from 'next'
import { AtlasExplorer } from '@/components/atlas/atlas-explorer'
import { allSites, eras, states, traditions } from '@/lib/heritage/query'

export const metadata: Metadata = {
  title: 'The Atlas — Bharatverse AI',
  description:
    'Every monument in the Bharatverse index, filterable by state, tradition, era and interior availability, with provenance stated on each record.',
}

export default function AtlasPage() {
  return (
    <main>
      <AtlasExplorer
        sites={allSites()}
        facets={{ states: states(), traditions: traditions(), eras: eras() }}
        // Read server-side so the schematic map is used as a graceful fallback
        // when no Maps key is configured, rather than rendering a dead panel.
        mapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? null}
      />
    </main>
  )
}
