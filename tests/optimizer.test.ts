import test from 'node:test'
import assert from 'node:assert/strict'
import { optimizeJourney } from '../lib/travel/optimizer'
import { validatePreferences } from '../lib/travel/validate'
import type { TravelPlace, TravelPreferences } from '../lib/travel/types'

const place = (id: string, lat: number, lon: number, value = 250): TravelPlace => ({
  id,
  name: id,
  city: id,
  state: 'Test',
  coordinates: { lat, lon },
  experienceTier: 'IMMERSIVE_TWIN',
  interests: ['ARCHITECTURE', 'HISTORY'],
  heritageValue: 9,
  visitDurationMinutes: { value: 120, freshness: 'ESTIMATED' },
  entryCost: { value: { min: value, expected: value, max: value, currency: 'INR', freshness: 'ESTIMATED' }, freshness: 'ESTIMATED' },
  accessibility: { value: { wheelchairEntrance: true, reducedWalkingSuitable: true }, freshness: 'VERIFIED' },
  sourceIds: ['test-source'],
})

const preferences: TravelPreferences = {
  origin: { id: 'origin', name: 'Origin', coordinates: { lat: 12.97, lon: 77.59 } },
  days: 2,
  travelers: 1,
  budget: { currency: 'INR', max: 20_000 },
  style: 'BALANCED',
  pace: 'BALANCED',
  interests: ['ARCHITECTURE'],
  transportModes: ['CAB', 'RAIL'],
  mustSeePlaceIds: ['must-see'],
  maxDailyTravelMinutes: 360,
}

test('optimizer is deterministic, has no duplicate stops and honors must-see', () => {
  const places = [place('must-see', 13.2, 77.8), place('nearby', 13.4, 77.9), place('other', 13.6, 78.1)]
  const first = optimizeJourney(preferences, places)
  const second = optimizeJourney(preferences, places)
  assert.equal(first.feasible, true)
  assert.deepEqual(first.plans.map((plan) => plan.days), second.plans.map((plan) => plan.days))
  first.plans.forEach((plan) => {
    const ids = plan.days.flatMap((day) => day.stops.map((stop) => stop.place.id))
    assert.ok(ids.includes('must-see'))
    assert.equal(ids.length, new Set(ids).size)
    assert.ok(plan.days.every((day) => day.travelMinutes <= preferences.maxDailyTravelMinutes))
    assert.ok(plan.costs.total.max <= preferences.budget.max)
  })
})

test('optimizer reports an infeasible conservative budget instead of overspending', () => {
  const result = optimizeJourney({ ...preferences, budget: { currency: 'INR', max: 1_000 } }, [place('must-see', 13.2, 77.8, 5_000)])
  assert.equal(result.feasible, false)
  assert.ok(result.plans.every((plan) => !plan.validation.valid))
})

test('strict verified wheelchair requirement excludes unknown accessibility', () => {
  const unknown = place('must-see', 13.2, 77.8)
  unknown.accessibility = { value: { wheelchairEntrance: null, reducedWalkingSuitable: null }, freshness: 'UNVERIFIED' }
  const result = optimizeJourney({ ...preferences, accessibility: { wheelchairEntranceRequired: true } }, [unknown])
  assert.equal(result.feasible, false)
})

test('API input validation rejects malformed trip constraints', () => {
  const result = validatePreferences({ days: 0, travelers: 0, budget: { currency: 'USD', max: -1 } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.errors.length >= 4)
})
