import type { PlanStrategy, TravelPlace, TravelPreferences } from './types'

const WEIGHTS: Record<PlanStrategy, { interest: number; heritage: number; twin: number; cost: number; travel: number }> = {
  BEST_OVERALL: { interest: 7, heritage: 5, twin: 6, cost: 2.5, travel: 3 },
  LOWEST_COST: { interest: 4, heritage: 3, twin: 2, cost: 7, travel: 5 },
  MOST_IMMERSIVE: { interest: 5, heritage: 6, twin: 12, cost: 1.5, travel: 2 },
}

export function scorePlace(
  place: TravelPlace,
  preferences: TravelPreferences,
  strategy: PlanStrategy,
  travelMinutes: number,
  expectedCost: number,
): { score: number; reasons: string[] } {
  const weights = WEIGHTS[strategy]
  const matches = place.interests.filter((interest) => preferences.interests.includes(interest))
  const reasons: string[] = []
  if (matches.length) reasons.push(`Strong match: ${matches.slice(0, 2).map((item) => item.toLowerCase().replaceAll('_', ' ')).join(' · ')}`)
  if (place.experienceTier === 'IMMERSIVE_TWIN') reasons.push('Includes a Bharatverse immersive twin')
  if (preferences.mustSeePlaceIds.includes(place.id)) reasons.push('Pinned as a must-see destination')
  if (travelMinutes <= 90) reasons.push(`Geographically efficient: ${travelMinutes} min transfer`)
  if (preferences.preferences?.photography && place.interests.includes('PHOTOGRAPHY')) reasons.push('Fits your photography preference')

  return {
    score:
      matches.length * weights.interest +
      place.heritageValue * weights.heritage +
      (place.experienceTier === 'IMMERSIVE_TWIN' ? weights.twin : 0) +
      (preferences.mustSeePlaceIds.includes(place.id) ? 1_000 : 0) -
      (expectedCost / 1_000) * weights.cost -
      (travelMinutes / 60) * weights.travel,
    reasons,
  }
}
