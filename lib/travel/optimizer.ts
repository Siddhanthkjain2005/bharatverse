import { scorePlace } from './scoring'
import type {
  CostBreakdown,
  MoneyRange,
  PlanResponse,
  PlanStrategy,
  PlannedDay,
  TravelPlace,
  TravelPlan,
  TravelPreferences,
  TransportMode,
} from './types'

const STRATEGIES: PlanStrategy[] = ['BEST_OVERALL', 'LOWEST_COST', 'MOST_IMMERSIVE']

function money(expected: number, spread = 0.16): MoneyRange {
  return {
    min: Math.round(expected * (1 - spread)),
    expected: Math.round(expected),
    max: Math.round(expected * (1 + spread)),
    currency: 'INR',
    freshness: 'ESTIMATED',
  }
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (value: number) => (value * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6_371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function routeEstimate(distanceKm: number, modes: TransportMode[]) {
  const options: Array<{ mode: TransportMode; minutes: number; rate: number; base: number }> = []
  if (modes.includes('WALKING') && distanceKm < 12) options.push({ mode: 'WALKING', minutes: (distanceKm / 4.5) * 60, rate: 0, base: 0 })
  if (modes.includes('PUBLIC_TRANSPORT')) options.push({ mode: 'PUBLIC_TRANSPORT', minutes: 35 + (distanceKm / 34) * 60, rate: 1.3, base: 40 })
  if (modes.includes('CAB')) options.push({ mode: 'CAB', minutes: 20 + (distanceKm / 58) * 60, rate: 15, base: 120 })
  if (modes.includes('SELF_DRIVE')) options.push({ mode: 'SELF_DRIVE', minutes: 15 + (distanceKm / 64) * 60, rate: 8.5, base: 0 })
  if (modes.includes('RAIL') && distanceKm > 120) options.push({ mode: 'RAIL', minutes: 55 + (distanceKm / 78) * 60, rate: 2.2, base: 160 })
  if (modes.includes('FLIGHT') && distanceKm > 420) options.push({ mode: 'FLIGHT', minutes: 150 + (distanceKm / 620) * 60, rate: 6.5, base: 2_000 })
  const best = options.sort((a, b) => a.minutes - b.minutes)[0] ?? { mode: 'CAB' as const, minutes: 20 + (distanceKm / 58) * 60, rate: 15, base: 120 }
  const expected = best.base + distanceKm * best.rate
  return {
    minutes: Math.max(8, Math.round(best.minutes)),
    distanceKm: Math.round(distanceKm),
    mode: best.mode,
    cost: money(expected),
    freshness: 'ESTIMATED' as const,
    note: 'Estimated routing · live routing unavailable',
  }
}

function sumMoney(ranges: MoneyRange[]): MoneyRange {
  return {
    min: Math.round(ranges.reduce((sum, range) => sum + range.min, 0)),
    expected: Math.round(ranges.reduce((sum, range) => sum + range.expected, 0)),
    max: Math.round(ranges.reduce((sum, range) => sum + range.max, 0)),
    currency: 'INR',
    freshness: 'ESTIMATED',
  }
}

function buildCosts(days: PlannedDay[], preferences: TravelPreferences): CostBreakdown {
  const transfers = days.flatMap((day) => day.stops.map((stop) => stop.transfer.cost))
  const entries = days.flatMap((day) => day.stops.map((stop) => stop.cost))
  const styleFactor = { BUDGET: 0.75, BALANCED: 1, COMFORTABLE: 1.55, PREMIUM: 2.5 }[preferences.style]
  const accommodation = money(Math.max(0, preferences.days - 1) * 1_400 * styleFactor * preferences.travelers)
  const foodAllowance = money(preferences.days * 750 * styleFactor * preferences.travelers, 0.12)
  const localTransport = money(preferences.days * 380 * styleFactor)
  const experiences = money(days.flatMap((day) => day.stops).length * 220)
  const contingency = money(preferences.budget.max * 0.1, 0)
  const intercityTransport = sumMoney(transfers)
  const attractionEntry = sumMoney(entries)
  const total = sumMoney([intercityTransport, localTransport, accommodation, attractionEntry, foodAllowance, experiences, contingency])
  return {
    intercityTransport,
    localTransport,
    accommodation,
    attractionEntry,
    foodAllowance,
    experiences,
    contingency,
    total,
    remaining: Math.round(preferences.budget.max - total.max),
  }
}

function createPlan(strategy: PlanStrategy, preferences: TravelPreferences, places: TravelPlace[]): TravelPlan | null {
  const days: PlannedDay[] = []
  const visited = new Set<string>()
  let current = preferences.origin.coordinates
  const mustSee = new Set(preferences.mustSeePlaceIds)
  let totalScore = 0

  for (let dayIndex = 0; dayIndex < preferences.days; dayIndex += 1) {
    const candidates = places
      .filter((place) => !visited.has(place.id))
      .map((place) => {
        const distance = haversineKm(current, place.coordinates)
        const transfer = routeEstimate(distance, preferences.transportModes)
        const entry = place.entryCost.value ?? money(300)
        const scored = scorePlace(place, preferences, strategy, transfer.minutes, entry.expected + transfer.cost.expected)
        return { place, transfer, entry, ...scored }
      })
      .filter(({ place, transfer }) => {
        if (transfer.minutes > preferences.maxDailyTravelMinutes) return false
        if (preferences.accessibility?.wheelchairEntranceRequired) {
          return place.accessibility.value?.wheelchairEntrance === true
        }
        return true
      })
      .sort((a, b) => b.score - a.score)

    const pinned = candidates.find((candidate) => mustSee.has(candidate.place.id))
    const selected = pinned ?? (
      strategy === 'LOWEST_COST'
        ? [...candidates].sort((a, b) =>
            (a.transfer.cost.expected + a.entry.expected) -
            (b.transfer.cost.expected + b.entry.expected) || b.score - a.score,
          )[0]
        : strategy === 'MOST_IMMERSIVE'
          ? [...candidates].sort((a, b) =>
              b.place.heritageValue - a.place.heritageValue ||
              b.score - a.score,
            )[0]
          : candidates[0]
    )
    if (!selected) break
    const visit = selected.place.visitDurationMinutes.value ?? 120
    const start = Math.max(preferences.preferences?.avoidEarlyMorning ? 600 : 540, 540 + selected.transfer.minutes)
    const flexibleMinutes = Math.max(45, Math.round((720 - selected.transfer.minutes - visit) * 0.12))
    const stop = {
      place: selected.place,
      arrivalMinute: start,
      departureMinute: start + visit,
      transfer: selected.transfer,
      cost: selected.entry,
      score: selected.score,
      reasons: [...selected.reasons, `Keeps Day ${dayIndex + 1} under your travel limit`],
    }
    days.push({
      day: dayIndex + 1,
      region: `${selected.place.city} · ${selected.place.state}`,
      stops: [stop],
      travelMinutes: selected.transfer.minutes,
      flexibleMinutes,
      expectedSpend: selected.entry.expected + selected.transfer.cost.expected,
    })
    totalScore += selected.score
    visited.add(selected.place.id)
    current = selected.place.coordinates
  }

  if ([...mustSee].some((id) => !visited.has(id))) return null
  const costs = buildCosts(days, preferences)
  const errors: string[] = []
  if (costs.total.max > preferences.budget.max) errors.push(`Conservative spend exceeds budget by ₹${Math.round(costs.total.max - preferences.budget.max).toLocaleString('en-IN')}.`)
  if (days.length === 0) errors.push('No destination fits the daily travel constraint.')
  const titles = { BEST_OVERALL: 'Best overall', LOWEST_COST: 'Save money', MOST_IMMERSIVE: 'Maximum heritage' }
  return {
    id: `${strategy.toLowerCase()}-${preferences.origin.id}-${preferences.days}`,
    strategy,
    title: titles[strategy],
    summary: strategy === 'LOWEST_COST' ? 'Prioritises fewer, shorter and lower-cost transfers.' : strategy === 'MOST_IMMERSIVE' ? 'Prioritises the strongest heritage and digital-twin experiences.' : 'Balances heritage value, interest fit, cost and transit time.',
    days,
    costs,
    totalTransitMinutes: days.reduce((sum, day) => sum + day.travelMinutes, 0),
    heritageStops: days.reduce((sum, day) => sum + day.stops.length, 0),
    immersiveTwins: days.flatMap((day) => day.stops).filter((stop) => stop.place.experienceTier === 'IMMERSIVE_TWIN').length,
    score: Math.round(totalScore),
    routingFreshness: 'ESTIMATED',
    validation: {
      valid: errors.length === 0,
      errors,
      warnings: ['Opening hours and accessibility are not yet verified; confirm them before travel.'],
    },
    assumptions: [
      'Routes use conservative distance-based estimates because live routing is unavailable.',
      'Costs are planning ranges, not quotes. A 10% contingency is reserved.',
      'One primary heritage experience is scheduled per day with a 10–15% serendipity window.',
    ],
  }
}

export function optimizeJourney(preferences: TravelPreferences, places: TravelPlace[]): PlanResponse {
  const plans = STRATEGIES.map((strategy) => createPlan(strategy, preferences, places)).filter((plan): plan is TravelPlan => Boolean(plan))
  const validPlans = plans.filter((plan) => plan.validation.valid)
  return {
    feasible: validPlans.length > 0,
    plans: validPlans.length ? validPlans : plans,
    bindingConstraints: validPlans.length ? [] : [
      plans.some((plan) => plan.validation.errors.some((error) => error.includes('budget'))) ? 'Trip budget' : 'Daily travel time',
      ...(preferences.mustSeePlaceIds.length ? ['Must-see destinations'] : []),
    ],
    suggestions: validPlans.length ? [] : [
      'Increase the budget',
      'Add one day',
      'Raise the daily travel limit',
      'Keep only the closest must-see destination',
    ],
    generatedAt: new Date().toISOString(),
  }
}
