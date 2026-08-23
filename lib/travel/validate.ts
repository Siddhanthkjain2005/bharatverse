import type { TravelPreferences } from './types'

export function validatePreferences(value: unknown): { ok: true; value: TravelPreferences } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!value || typeof value !== 'object') return { ok: false, errors: ['Request body must be an object.'] }
  const input = value as Partial<TravelPreferences>
  if (!input.origin || typeof input.origin.name !== 'string' || !input.origin.coordinates) errors.push('A valid origin is required.')
  if (!Number.isInteger(input.days) || (input.days ?? 0) < 1 || (input.days ?? 0) > 14) errors.push('Days must be between 1 and 14.')
  if (!Number.isInteger(input.travelers) || (input.travelers ?? 0) < 1 || (input.travelers ?? 0) > 12) errors.push('Travellers must be between 1 and 12.')
  if (!input.budget || input.budget.currency !== 'INR' || !Number.isFinite(input.budget.max) || input.budget.max < 1_000 || input.budget.max > 5_000_000) errors.push('Budget must be between ₹1,000 and ₹50,00,000.')
  const interests = new Set(['ARCHITECTURE', 'HISTORY', 'ARCHAEOLOGY', 'PHOTOGRAPHY', 'SPIRITUAL_HERITAGE', 'ART', 'CRAFTS', 'LOCAL_FOOD', 'NATURE', 'MUSEUMS', 'FAMILY_FRIENDLY', 'HIDDEN_HERITAGE'])
  const modes = new Set(['WALKING', 'PUBLIC_TRANSPORT', 'CAB', 'SELF_DRIVE', 'RAIL', 'FLIGHT'])
  if (!Array.isArray(input.interests) || input.interests.length === 0 || input.interests.some((item) => !interests.has(item))) errors.push('Select valid interests.')
  if (!Array.isArray(input.transportModes) || input.transportModes.length === 0 || input.transportModes.some((item) => !modes.has(item))) errors.push('Select valid transport modes.')
  if (!['BUDGET', 'BALANCED', 'COMFORTABLE', 'PREMIUM'].includes(input.style ?? '')) errors.push('Select a valid travel style.')
  if (!['RELAXED', 'BALANCED', 'PACKED'].includes(input.pace ?? '')) errors.push('Select a valid pace.')
  if (!Array.isArray(input.mustSeePlaceIds) || input.mustSeePlaceIds.some((item) => typeof item !== 'string' || item.length > 80)) errors.push('Must-see IDs are invalid.')
  if (!Number.isFinite(input.maxDailyTravelMinutes) || (input.maxDailyTravelMinutes ?? 0) < 30 || (input.maxDailyTravelMinutes ?? 0) > 900) errors.push('Daily travel limit must be between 30 and 900 minutes.')
  return errors.length ? { ok: false, errors } : { ok: true, value: input as TravelPreferences }
}
