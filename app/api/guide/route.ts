import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import {
  evidenceCitationsFor,
  evidenceCorpus,
  retrieve,
  siteBySlug,
} from '@/lib/heritage/query'
import type { EvidenceChunk, GuideHistoryTurn } from '@/lib/heritage/types'
import { configuredGroqKeys, selectGroqApiKey } from '@/lib/ai/groq-key-pool'

export const maxDuration = 30

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  bn: 'Bengali',
  fr: 'French',
} as const

type LanguageCode = keyof typeof LANGUAGE_NAMES
const requestWindows = new Map<string, { count: number; resetAt: number }>()

function withinRateLimit(request: Request): boolean {
  const now = Date.now()
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const current = requestWindows.get(key)
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (current.count >= 20) return false
  current.count += 1
  return true
}

function validHistory(value: unknown): GuideHistoryTurn[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 4) return null
  const result: GuideHistoryTurn[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const { question, answer } = item as Record<string, unknown>
    if (
      typeof question !== 'string' ||
      typeof answer !== 'string' ||
      question.length > 500 ||
      answer.length > 1_200
    ) return null
    result.push({ question, answer })
  }
  return result
}

const SYSTEM = `You are the Bharatverse guide, an expert on Indian architectural heritage.

ABSOLUTE GROUNDING RULE
Only state claims found in the supplied EVIDENCE block. If the evidence does not
answer the question, say what the record does not cover. Never fill a gap from
memory, guess a date, patron or attribution, or treat visible reconstruction as
evidence.

EVIDENCE GRADES
VERIFIED_FACT may be stated directly. Attribute INTERPRETATION. Mark
ORAL_TRADITION and FOLKLORE as told traditions. Call RECONSTRUCTION reconstructed
or indicative. Repeat "Information not yet verified" when that is the record.

SPATIAL AND CONVERSATIONAL CONTEXT
Use STANDPOINT for deictic questions. RECENT CONTEXT only resolves immediate
referents; it is not evidence and cannot introduce factual claims.

CITING
Cite every factual claim with the exact stable evidence token supplied, for
example [e:taj:fact:f-build]. Never invent or shorten a token.

VOICE
Answer in the requested language in two or three short paragraphs. Be concrete,
calm and concise. No headings, filler, or invented present-day condition.`

export async function POST(req: Request) {
  if (!withinRateLimit(req)) {
    return Response.json(
      { error: 'Too many guide questions. Please wait a minute and try again.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON request.' }, { status: 400 })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const siteSlug = typeof body.siteSlug === 'string' ? body.siteSlug : null
  const lang = typeof body.lang === 'string' ? body.lang : 'en'
  const spaceId = typeof body.spaceId === 'string' ? body.spaceId : null
  const hotspotId = typeof body.hotspotId === 'string' ? body.hotspotId : null
  const phaseId = typeof body.phaseId === 'string' ? body.phaseId : null
  const indoors = typeof body.indoors === 'boolean' ? body.indoors : undefined
  const history = validHistory(body.history)

  if (question.length < 2 || question.length > 500) {
    return Response.json(
      { error: 'Question must contain between 2 and 500 characters.' },
      { status: 400 },
    )
  }
  if (!(lang in LANGUAGE_NAMES)) {
    return Response.json({ error: 'Unsupported guide language.' }, { status: 400 })
  }
  if (history === null) {
    return Response.json({ error: 'Invalid conversation context.' }, { status: 400 })
  }

  const site = siteSlug ? siteBySlug(siteSlug) : undefined
  if (siteSlug && !site) {
    return Response.json({ error: 'Unknown heritage site.' }, { status: 400 })
  }

  const space = site?.spaces.find((item) => item.id === spaceId) ?? null
  const hotspot = site?.hotspots.find((item) => item.id === hotspotId) ?? null
  const phase = site?.timeline.find((item) => item.id === phaseId) ?? null
  if ((spaceId && !space) || (hotspotId && !hotspot) || (phaseId && !phase)) {
    return Response.json({ error: 'Context does not belong to this site.' }, { status: 400 })
  }

  const expanded = [
    question,
    history.at(-1)?.question,
    space?.name,
    space?.kind,
    hotspot?.name,
    hotspot?.kind,
    phase?.title,
  ].filter(Boolean).join(' ')
  const retrieved = retrieve(expanded, { siteId: site?.id, limit: 10 })

  const pinned: EvidenceChunk[] = []
  if (site) {
    const all = evidenceCorpus(site.id)
    for (const id of [
      space ? `${site.id}:space:${space.id}` : null,
      hotspot ? `${site.id}:hotspot:${hotspot.id}` : null,
      phase ? `${site.id}:phase:${phase.id}` : null,
    ]) {
      const hit = id ? all.find((chunk) => chunk.id === id) : undefined
      if (hit) pinned.push(hit)
    }
  }
  const chunks = [
    ...pinned,
    ...retrieved.filter((chunk) => !pinned.some((item) => item.id === chunk.id)),
  ].slice(0, 12)

  if (chunks.length === 0) {
    return Response.json({
      text: site
        ? `The indexed record for ${site.name} does not cover that. Bharatverse will not guess.`
        : 'That is outside the indexed heritage record. Bharatverse will not guess.',
      evidence: [],
      mode: 'NO_EVIDENCE',
    })
  }

  const groqApiKey = selectGroqApiKey()
  if (!groqApiKey) {
    const fallback = chunks.slice(0, 2)
    return Response.json({
      text: `The live guide is temporarily unavailable. The closest cited record says: ${fallback
        .map((chunk) => `${chunk.text} [e:${chunk.id}]`)
        .join(' ')}`,
      evidence: evidenceCitationsFor(fallback),
      mode: 'CITED_FALLBACK',
    })
  }

  const evidence = chunks.map((chunk) =>
    `[e:${chunk.id}] (${chunk.siteName} · ${chunk.kind} · grade: ${chunk.evidence})\n${chunk.text}`,
  ).join('\n\n')
  const standpoint = [
    space ? `Standing in: ${space.name} (${space.kind.toLowerCase()}).` : null,
    indoors === true ? 'The visitor is inside a roofed space.' : null,
    indoors === false ? 'The visitor is outdoors on the grounds.' : null,
    hotspot ? `Nearest documented feature: ${hotspot.name}.` : null,
    phase ? `Twin phase: ${phase.year} — ${phase.title}.` : null,
  ].filter(Boolean).join('\n')
  const recent = history.map((turn) =>
    `Visitor: ${turn.question}\nGuide: ${turn.answer}`,
  ).join('\n\n')

  const groq = createGroq({ apiKey: groqApiKey })
  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    system: SYSTEM,
    prompt: `${site ? `SITE\n${site.name}, ${site.city}, ${site.state}.\n` : ''}
${standpoint ? `STANDPOINT\n${standpoint}\n` : ''}
${recent ? `RECENT CONTEXT\n${recent}\n` : ''}
QUESTION\n${question}

ANSWER LANGUAGE\n${LANGUAGE_NAMES[lang as LanguageCode]}

EVIDENCE\n${evidence}`,
    temperature: 0.2,
  })

  return result.toTextStreamResponse({
    headers: {
      'x-evidence-map': encodeURIComponent(
        JSON.stringify(evidenceCitationsFor(chunks)),
      ),
      'x-evidence-count': String(chunks.length),
      'x-groq-pool-size': String(configuredGroqKeys().length),
    },
  })
}
