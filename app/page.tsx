import { LandingHero } from '@/components/landing/hero'
import { JourneyQuickStart } from '@/components/landing/journey-quick-start'
import {
  AtlasSection,
  CapabilitiesSection,
  EvidenceSection,
  IndexSection,
} from '@/components/landing/sections'
import { allSites } from '@/lib/heritage/query'

export default function HomePage() {
  const sites = allSites()

  return (
    <>
      <LandingHero sites={sites} />
      <JourneyQuickStart />
      <CapabilitiesSection />
      <AtlasSection sites={sites} />
      <EvidenceSection />
      <IndexSection sites={sites} />
    </>
  )
}
