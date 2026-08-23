import type { TravelPlan, TravelPreferences } from './types'

export const STORAGE_KEY = 'bharatverse.state.v1'

export interface SavedTrip {
  id: string
  savedAt: string
  preferences: TravelPreferences
  plan: TravelPlan
  actualSpend: Array<{ id: string; label: string; amount: number; date: string }>
}

export interface StoredBharatverseState {
  version: 1
  trips: SavedTrip[]
  activeTripId?: string
  passport: { visitedSiteIds: string[] }
}

const EMPTY: StoredBharatverseState = {
  version: 1,
  trips: [],
  passport: { visitedSiteIds: [] },
}

export function readStoredState(): StoredBharatverseState {
  if (typeof window === 'undefined') return EMPTY
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '') as StoredBharatverseState
    return parsed?.version === 1 && Array.isArray(parsed.trips) ? parsed : EMPTY
  } catch {
    return EMPTY
  }
}

export function saveTrip(preferences: TravelPreferences, plan: TravelPlan): SavedTrip {
  const state = readStoredState()
  const trip: SavedTrip = {
    id: `${plan.id}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    preferences,
    plan,
    actualSpend: [],
  }
  const next: StoredBharatverseState = {
    ...state,
    activeTripId: trip.id,
    trips: [trip, ...state.trips].slice(0, 12),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return trip
}

export function updateStoredState(state: StoredBharatverseState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
