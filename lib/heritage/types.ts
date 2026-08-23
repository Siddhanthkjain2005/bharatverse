/**
 * BHARATVERSE AI — domain model for the living heritage digital twin.
 *
 * Every factual field carries provenance. Anything the platform cannot
 * substantiate is represented as `null` and rendered as
 * "Information not yet verified." — never invented.
 */

export type EvidenceLevel =
  | 'VERIFIED_FACT'
  | 'INTERPRETATION'
  | 'ORAL_TRADITION'
  | 'FOLKLORE'
  | 'RECONSTRUCTION'
  | 'AI_ASSISTED_SUMMARY'

/** Provenance ladder from §13 — strongest evidence first. */
export type ProvenanceType =
  | 'OFFICIAL_SCAN'
  | 'AUTHORIZED_MODEL'
  | 'LIDAR'
  | 'PHOTOGRAMMETRY'
  | 'INSTITUTIONAL_DOCUMENTATION'
  | 'REFERENCE_RECONSTRUCTION'
  | 'AI_ASSISTED_RECONSTRUCTION'
  | 'CONCEPTUAL_VISUALIZATION'

/** Interior availability ladder from §16. */
export type InteriorLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type DataClass = 'VERIFIED' | 'DEMO_SYNTHETIC' | 'UNVERIFIED'

export interface SourceRef {
  id: string
  title: string
  publisher: string
  url: string
  /** Reuse posture determined by the source discovery engine (§14). */
  license: string
  reuse: 'LINK_ONLY' | 'ATTRIBUTION_REQUIRED' | 'PUBLIC_DOMAIN' | 'RESTRICTED'
  lastChecked: string
  scope: 'NATIONAL' | 'STATE' | 'SITE' | 'GLOBAL'
}

export interface Fact {
  id: string
  label: string
  value: string | null
  evidence: EvidenceLevel
  sourceIds: string[]
}

export interface Hotspot {
  id: string
  name: string
  kind:
    | 'ARCHITECTURE'
    | 'INSCRIPTION'
    | 'SCULPTURE'
    | 'MATERIAL'
    | 'ARTEFACT'
    | 'HISTORICAL_EVENT'
    | 'RESTORATION'
    | 'CONSERVATION'
    | 'CULTURAL'
  /** Position in twin-local space (metres, y up). */
  position: [number, number, number]
  /** Camera preset used when the hotspot is focused. */
  camera: { position: [number, number, number]; target: [number, number, number] }
  summary: string
  evidence: EvidenceLevel
  sourceIds: string[]
  spaceId?: string
}

export interface InteriorSpace {
  id: string
  name: string
  /** Parent node in the interior room graph (§19). */
  parentId: string | null
  kind: 'ENTRANCE' | 'COURTYARD' | 'HALL' | 'SANCTUM' | 'GALLERY' | 'CHAMBER' | 'TERRACE'
  /** Footprint on the interior floor plan, normalised 0–1. */
  plan: { x: number; y: number; w: number; h: number }
  narrative: string
  evidence: EvidenceLevel
  accessibility: string | null
  sourceIds: string[]
}

export interface TimelinePhase {
  id: string
  year: string
  /** Sortable numeric anchor; negative for BCE. */
  anchor: number
  title: string
  detail: string
  evidence: EvidenceLevel
  sourceIds: string[]
  /** Optional twin state applied when this phase is active. */
  twinState?: 'FOUNDATION' | 'CONSTRUCTION' | 'COMPLETE' | 'DAMAGED' | 'RESTORED'
}

export interface StoryVariant {
  mode: 'THIRTY_SECOND' | 'FIVE_MINUTE' | 'CHILD' | 'SCHOLAR' | 'FOLKLORE'
  label: string
  body: string
  evidence: EvidenceLevel
  sourceIds: string[]
}

export interface ConservationIndicator
  extends Record<'id' | 'label' | 'note', string> {
  /** 0–100, higher is healthier. */
  score: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN'
}

export interface InspectionRecord {
  id: string
  date: string
  inspector: string
  zone: string
  finding: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'CANDIDATE' | 'UNDER_REVIEW' | 'CONFIRMED' | 'REJECTED'
  /** Confidence of the CV candidate detector, if machine-proposed. */
  cvConfidence: number | null
  reviewedBy: string | null
  dataClass: DataClass
}

export interface ConservationProfile {
  dataClass: DataClass
  /** Composite health index — only meaningful with the dataClass caveat. */
  healthIndex: number | null
  indicators: ConservationIndicator[]
  inspections: InspectionRecord[]
  /** Ordered pair of comparison layers for the before/after inspector. */
  comparison: {
    label: string
    beforeLabel: string
    afterLabel: string
    note: string
  } | null
}

export interface TwinAsset {
  /** Which visual archetype the procedural twin uses. */
  archetype: 'TOMB_DOME' | 'SHIKHARA' | 'MINARET' | 'ROCK_CUT' | 'CHARIOT' | 'GOPURAM' | 'RUIN_COMPLEX'
  provenance: ProvenanceType
  provenanceNote: string
  interiorLevel: InteriorLevel
  interiorNote: string
}

export interface VisitInfo {
  openingHours: string | null
  ticketing: string | null
  bestTime: string | null
  accessibility: string | null
  nearestTransit: string | null
}

export interface HeritageSite {
  id: string
  slug: string
  name: string
  localName: string | null
  state: string
  city: string
  /** WGS84. */
  lat: number
  lon: number
  /** UNESCO World Heritage reference number when inscribed. */
  unescoRef: string | null
  inscribed: string | null
  era: string
  period: string
  tradition: string
  summary: string
  heroLine: string
  materials: string[]
  facts: Fact[]
  twin: TwinAsset
  hotspots: Hotspot[]
  spaces: InteriorSpace[]
  timeline: TimelinePhase[]
  stories: StoryVariant[]
  conservation: ConservationProfile
  visit: VisitInfo
  sourceIds: string[]
  /** Palette hint used by the twin renderer, in linear-friendly hex. */
  palette: { stone: string; accent: string; sky: string }
}

export interface EvidenceChunk {
  id: string
  siteId: string
  siteName: string
  spaceId?: string
  hotspotId?: string
  kind: string
  text: string
  evidence: EvidenceLevel
  sourceIds: string[]
}

export interface Citation {
  id: string
  title: string
  publisher: string
  url: string
  lastChecked: string
}

/** Exact evidence-to-source mapping returned with a guide response. */
export interface EvidenceCitation {
  evidenceId: string
  evidenceLevel: EvidenceLevel
  sourceIds: string[]
  sources: Citation[]
}

export interface GuideHistoryTurn {
  question: string
  answer: string
}

export interface AssistantContext {
  siteId?: string
  spaceId?: string
  hotspotId?: string
  language: string
  historicalPhase?: string
  depth?: 'BRIEF' | 'STANDARD' | 'SCHOLAR' | 'CHILD'
}
