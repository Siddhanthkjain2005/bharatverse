import { SITES } from './sites'
import { getSources } from './sources'
import type {
  Citation,
  EvidenceChunk,
  EvidenceCitation,
  HeritageSite,
  InteriorSpace,
} from './types'

export const NOT_VERIFIED = 'Information not yet verified.'

export function allSites(): HeritageSite[] {
  return SITES
}

export function siteBySlug(slug: string): HeritageSite | undefined {
  return SITES.find((s) => s.slug === slug)
}

export function siteById(id: string): HeritageSite | undefined {
  return SITES.find((s) => s.id === id)
}

export function states(): string[] {
  return Array.from(new Set(SITES.map((s) => s.state))).sort()
}

export function traditions(): string[] {
  return Array.from(new Set(SITES.map((s) => s.tradition))).sort()
}

export function eras(): string[] {
  return Array.from(new Set(SITES.map((s) => s.era))).sort()
}

export interface SiteFilter {
  q?: string
  state?: string | null
  tradition?: string | null
  era?: string | null
  unescoOnly?: boolean
  /** Highest accepted ladder number. L3 or better means L1, L2 and L3. */
  maxInteriorLevel?: number
}

export function filterSites(filter: SiteFilter): HeritageSite[] {
  const q = filter.q?.trim().toLowerCase() ?? ''
  return SITES.filter((s) => {
    if (filter.state && s.state !== filter.state) return false
    if (filter.tradition && s.tradition !== filter.tradition) return false
    if (filter.era && s.era !== filter.era) return false
    if (filter.unescoOnly && !s.unescoRef) return false
    if (
      filter.maxInteriorLevel &&
      s.twin.interiorLevel > filter.maxInteriorLevel
    ) return false
    if (!q) return true
    const haystack = [
      s.name,
      s.localName ?? '',
      s.state,
      s.city,
      s.era,
      s.period,
      s.tradition,
      s.summary,
      ...s.materials,
      ...s.hotspots.map((h) => h.name),
      ...s.spaces.map((p) => p.name),
    ]
      .join(' ')
      .toLowerCase()
    return q.split(/\s+/).every((token) => haystack.includes(token))
  })
}

/** Space graph helpers for the interior navigator (§19). */
export function spaceChildren(site: HeritageSite, parentId: string | null): InteriorSpace[] {
  return site.spaces.filter((s) => s.parentId === parentId)
}

export function spacePath(site: HeritageSite, spaceId: string): InteriorSpace[] {
  const chain: InteriorSpace[] = []
  let current = site.spaces.find((s) => s.id === spaceId)
  while (current) {
    chain.unshift(current)
    current = current.parentId
      ? site.spaces.find((s) => s.id === current!.parentId)
      : undefined
  }
  return chain
}

/**
 * Flattens the dataset into a retrievable evidence corpus. The assistant may
 * only speak from these chunks — that is what keeps answers grounded (§9).
 */
export function evidenceCorpus(siteId?: string): EvidenceChunk[] {
  const chunks: EvidenceChunk[] = []
  const scope = siteId ? SITES.filter((s) => s.id === siteId) : SITES

  for (const site of scope) {
    chunks.push({
      id: `${site.id}:overview`,
      siteId: site.id,
      siteName: site.name,
      kind: 'OVERVIEW',
      text: `${site.name}${site.localName ? ` (${site.localName})` : ''} stands at ${site.city}, ${site.state}. ${site.summary} Period: ${site.period}. Tradition: ${site.tradition}. Principal materials: ${site.materials.join(', ')}.`,
      evidence: 'VERIFIED_FACT',
      sourceIds: site.sourceIds,
    })

    for (const fact of site.facts) {
      chunks.push({
        id: `${site.id}:fact:${fact.id}`,
        siteId: site.id,
        siteName: site.name,
        kind: 'FACT',
        text: `${fact.label}: ${fact.value ?? NOT_VERIFIED}`,
        evidence: fact.evidence,
        sourceIds: fact.sourceIds,
      })
    }

    for (const phase of site.timeline) {
      chunks.push({
        id: `${site.id}:phase:${phase.id}`,
        siteId: site.id,
        siteName: site.name,
        kind: 'TIMELINE',
        text: `${phase.year} — ${phase.title}. ${phase.detail}`,
        evidence: phase.evidence,
        sourceIds: phase.sourceIds,
      })
    }

    for (const hotspot of site.hotspots) {
      chunks.push({
        id: `${site.id}:hotspot:${hotspot.id}`,
        siteId: site.id,
        siteName: site.name,
        hotspotId: hotspot.id,
        spaceId: hotspot.spaceId,
        kind: `HOTSPOT_${hotspot.kind}`,
        text: `${hotspot.name}: ${hotspot.summary}`,
        evidence: hotspot.evidence,
        sourceIds: hotspot.sourceIds,
      })
    }

    for (const space of site.spaces) {
      chunks.push({
        id: `${site.id}:space:${space.id}`,
        siteId: site.id,
        siteName: site.name,
        spaceId: space.id,
        kind: `SPACE_${space.kind}`,
        text: `${space.name}: ${space.narrative}${space.accessibility ? ` Accessibility: ${space.accessibility}` : ''}`,
        evidence: space.evidence,
        sourceIds: space.sourceIds,
      })
    }

    for (const story of site.stories) {
      chunks.push({
        id: `${site.id}:story:${story.mode}`,
        siteId: site.id,
        siteName: site.name,
        kind: `STORY_${story.mode}`,
        text: story.body,
        evidence: story.evidence,
        sourceIds: story.sourceIds,
      })
    }

    const v = site.visit
    chunks.push({
      id: `${site.id}:visit`,
      siteId: site.id,
      siteName: site.name,
      kind: 'VISIT',
      text: [
        `Opening hours: ${v.openingHours ?? NOT_VERIFIED}`,
        `Ticketing: ${v.ticketing ?? NOT_VERIFIED}`,
        `Best time to visit: ${v.bestTime ?? NOT_VERIFIED}`,
        `Accessibility: ${v.accessibility ?? NOT_VERIFIED}`,
        `Nearest transit: ${v.nearestTransit ?? NOT_VERIFIED}`,
      ].join(' '),
      evidence: 'VERIFIED_FACT',
      sourceIds: site.sourceIds,
    })

    const c = site.conservation
    chunks.push({
      id: `${site.id}:conservation`,
      siteId: site.id,
      siteName: site.name,
      kind: 'CONSERVATION',
      text: `Conservation data class: ${c.dataClass}. ${
        c.dataClass === 'DEMO_SYNTHETIC'
          ? 'These conservation indicators are demonstration values generated to exercise the monitoring interface. They are not measurements and must not be cited as the condition of the monument.'
          : ''
      } Indicators: ${c.indicators
        .map((i) => `${i.label} ${i.score}/100 (${i.trend.toLowerCase()}) — ${i.note}`)
        .join('; ')}.`,
      evidence: c.dataClass === 'DEMO_SYNTHETIC' ? 'RECONSTRUCTION' : 'VERIFIED_FACT',
      sourceIds: site.sourceIds,
    })
  }

  return chunks
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'is', 'was', 'were', 'and', 'or', 'to', 'in', 'on',
  'at', 'for', 'with', 'about', 'what', 'who', 'when', 'where', 'why', 'how',
  'tell', 'me', 'this', 'that', 'it', 'its', 'do', 'does', 'did', 'can', 'you',
  'i', 'my', 'we', 'are', 'be', 'been', 'from', 'by', 'as', 'more', 'please',
])

const RETRIEVAL_ALIASES: Record<string, string[]> = {
  'निर्माण': ['built', 'construction'],
  'बनाया': ['built'],
  'स्थापत्य': ['architecture'],
  'इतिहास': ['history'],
  'கட்டிடக்கலை': ['architecture'],
  'வரலாறு': ['history'],
  'கட்டியது': ['built'],
  'নির্মাণ': ['built', 'construction'],
  'ইতিহাস': ['history'],
}

export function tokenizeForRetrieval(text: string): string[] {
  const tokens = text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  return tokens.flatMap((token) => [token, ...(RETRIEVAL_ALIASES[token] ?? [])])
}

/**
 * Lexical BM25-flavoured retrieval over the evidence corpus. Deliberately
 * dependency-free and deterministic so grounding is auditable.
 */
export function retrieve(
  question: string,
  opts: { siteId?: string; limit?: number } = {},
): EvidenceChunk[] {
  const corpus = evidenceCorpus(opts.siteId)
  const queryTokens = tokenizeForRetrieval(question)
  if (queryTokens.length === 0) return corpus.slice(0, opts.limit ?? 8)

  const docTokens = corpus.map((c) =>
    tokenizeForRetrieval(`${c.kind} ${c.siteName} ${c.text}`),
  )
  const avgLen = docTokens.reduce((a, d) => a + d.length, 0) / (docTokens.length || 1)
  const df = new Map<string, number>()
  for (const tokens of docTokens) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }

  const k1 = 1.4
  const b = 0.75
  const scored = corpus.map((chunk, i) => {
    const tokens = docTokens[i]
    const tf = new Map<string, number>()
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)

    let score = 0
    for (const q of queryTokens) {
      const f = tf.get(q)
      if (!f) continue
      const n = df.get(q) ?? 0
      const idf = Math.log(1 + (corpus.length - n + 0.5) / (n + 0.5))
      score +=
        idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * tokens.length) / avgLen)))
    }
    return { chunk, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, opts.limit ?? 8)
    .map((s) => s.chunk)
}

export function citationsFor(chunks: EvidenceChunk[]): Citation[] {
  const ids = Array.from(new Set(chunks.flatMap((c) => c.sourceIds)))
  return getSources(ids).map((s) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    url: s.url,
    lastChecked: s.lastChecked,
  }))
}

export function evidenceCitationsFor(chunks: EvidenceChunk[]): EvidenceCitation[] {
  return chunks.map((chunk) => ({
    evidenceId: chunk.id,
    evidenceLevel: chunk.evidence,
    sourceIds: chunk.sourceIds,
    sources: citationsFor([chunk]),
  }))
}

/**
 * Derives a BCP-47 language tag from the script a local name is written in, so
 * screen readers and font fallback both get the right hint without storing a
 * separate field on every record.
 */
export function scriptLang(text: string | null): string | undefined {
  if (!text) return undefined
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or'
  return undefined
}

export const EVIDENCE_LABEL: Record<string, string> = {
  VERIFIED_FACT: 'Verified fact',
  INTERPRETATION: 'Scholarly interpretation',
  ORAL_TRADITION: 'Oral tradition',
  FOLKLORE: 'Folklore',
  RECONSTRUCTION: 'Reconstruction',
  AI_ASSISTED_SUMMARY: 'AI-assisted summary',
}

export const PROVENANCE_LABEL: Record<string, string> = {
  OFFICIAL_SCAN: 'Official scan',
  AUTHORIZED_MODEL: 'Authorised model',
  LIDAR: 'LiDAR survey',
  PHOTOGRAMMETRY: 'Photogrammetry',
  INSTITUTIONAL_DOCUMENTATION: 'Institutional documentation',
  REFERENCE_RECONSTRUCTION: 'Reference-based reconstruction',
  AI_ASSISTED_RECONSTRUCTION: 'AI-assisted reconstruction',
  CONCEPTUAL_VISUALIZATION: 'Conceptual visualisation',
}

export const INTERIOR_LABEL: Record<number, string> = {
  1: 'L1 — Official interior scan',
  2: 'L2 — Licensed interior imagery',
  3: 'L3 — Documented interior reconstruction',
  4: 'L4 — Schematic interior from plans',
  5: 'L5 — Typological interior',
  6: 'L6 — Exterior only',
  7: 'L7 — Interior not represented',
}
