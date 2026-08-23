export type DataFreshness = 'LIVE' | 'VERIFIED' | 'ESTIMATED' | 'DEMO' | 'UNVERIFIED'

export interface OperationalFact<T> {
  value: T | null
  freshness: DataFreshness
  source?: string
  checkedAt?: string
  validUntil?: string
  note?: string
}

export interface MoneyRange {
  min: number
  expected: number
  max: number
  currency: 'INR'
  freshness: DataFreshness
}

export type ExperienceTier = 'IMMERSIVE_TWIN' | 'HERITAGE_RECORD' | 'TRAVEL_LISTING'
export type Interest =
  | 'ARCHITECTURE'
  | 'HISTORY'
  | 'ARCHAEOLOGY'
  | 'PHOTOGRAPHY'
  | 'SPIRITUAL_HERITAGE'
  | 'ART'
  | 'CRAFTS'
  | 'LOCAL_FOOD'
  | 'NATURE'
  | 'MUSEUMS'
  | 'FAMILY_FRIENDLY'
  | 'HIDDEN_HERITAGE'

export type TransportMode = 'WALKING' | 'PUBLIC_TRANSPORT' | 'CAB' | 'SELF_DRIVE' | 'RAIL' | 'FLIGHT'
export type Pace = 'RELAXED' | 'BALANCED' | 'PACKED'
export type TravelStyle = 'BUDGET' | 'BALANCED' | 'COMFORTABLE' | 'PREMIUM'
export type PlanStrategy = 'BEST_OVERALL' | 'LOWEST_COST' | 'MOST_IMMERSIVE'

export interface PlaceRef {
  id: string
  name: string
  coordinates: { lat: number; lon: number }
}

export interface TravelPreferences {
  origin: PlaceRef
  days: number
  travelers: number
  budget: { currency: 'INR'; max: number }
  style: TravelStyle
  pace: Pace
  interests: Interest[]
  transportModes: TransportMode[]
  mustSeePlaceIds: string[]
  maxDailyTravelMinutes: number
  accessibility?: {
    wheelchairEntranceRequired?: boolean
    reducedWalking?: boolean
    avoidStairs?: boolean
    frequentRest?: boolean
  }
  preferences?: {
    fewerHotelChanges?: boolean
    lowCarbon?: boolean
    avoidEarlyMorning?: boolean
    photography?: boolean
    supportLocalEconomy?: boolean
    heatSensitive?: boolean
  }
}

export interface TravelPlace {
  id: string
  heritageSiteId?: string
  slug?: string
  name: string
  localName?: string | null
  city: string
  state: string
  coordinates: { lat: number; lon: number }
  experienceTier: ExperienceTier
  interests: Interest[]
  heritageValue: number
  visitDurationMinutes: OperationalFact<number>
  entryCost: OperationalFact<MoneyRange>
  accessibility: OperationalFact<{
    wheelchairEntrance: boolean | null
    reducedWalkingSuitable: boolean | null
    note?: string
  }>
  sourceIds: string[]
}

export interface TransferEstimate {
  minutes: number
  distanceKm: number
  mode: TransportMode
  cost: MoneyRange
  freshness: DataFreshness
  note: string
}

export interface PlannedStop {
  place: TravelPlace
  arrivalMinute: number
  departureMinute: number
  transfer: TransferEstimate
  cost: MoneyRange
  score: number
  reasons: string[]
}

export interface PlannedDay {
  day: number
  region: string
  stops: PlannedStop[]
  travelMinutes: number
  flexibleMinutes: number
  expectedSpend: number
}

export interface CostBreakdown {
  intercityTransport: MoneyRange
  localTransport: MoneyRange
  accommodation: MoneyRange
  attractionEntry: MoneyRange
  foodAllowance: MoneyRange
  experiences: MoneyRange
  contingency: MoneyRange
  total: MoneyRange
  remaining: number
}

export interface PlanValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface TravelPlan {
  id: string
  strategy: PlanStrategy
  title: string
  summary: string
  days: PlannedDay[]
  costs: CostBreakdown
  totalTransitMinutes: number
  heritageStops: number
  immersiveTwins: number
  score: number
  routingFreshness: DataFreshness
  validation: PlanValidation
  assumptions: string[]
}

export interface PlanResponse {
  feasible: boolean
  plans: TravelPlan[]
  bindingConstraints: string[]
  suggestions: string[]
  generatedAt: string
}
