'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EvidenceCitation } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'fr', label: 'Français' },
] as const

interface Turn {
  id: string
  question: string
  answer: string
  citations: EvidenceCitation[]
  pending: boolean
  error?: string
}

/** Where the visitor is standing, so the guide can answer deictic questions. */
export interface GuideContext {
  spaceId?: string | null
  hotspotId?: string | null
  phaseId?: string | null
  indoors?: boolean
  /** Human-readable standpoint shown in the panel header. */
  label?: string | null
}

export function GuidePanel({
  siteSlug,
  siteName,
  suggestions,
  context,
  seedQuestion,
  className,
}: {
  siteSlug?: string
  siteName?: string
  suggestions: string[]
  context?: GuideContext
  /** Asked automatically when it changes — used by demonstration mode. */
  seedQuestion?: string | null
  className?: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [lang, setLang] = useState<string>('en')
  const [listening, setListening] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<any>(null)
  const contextRef = useRef<GuideContext | undefined>(context)
  contextRef.current = context

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim()
      if (!q) return
      const id = crypto.randomUUID()
      setInput('')
      setTurns((prev) => [
        ...prev,
        { id, question: q, answer: '', citations: [], pending: true },
      ])

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const ctx = contextRef.current
        const res = await fetch('/api/guide', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            question: q,
            siteSlug,
            lang,
            spaceId: ctx?.spaceId ?? null,
            hotspotId: ctx?.hotspotId ?? null,
            phaseId: ctx?.phaseId ?? null,
            indoors: ctx?.indoors,
            history: turns
              .slice(-4)
              .filter((turn) => !turn.pending && !turn.error)
              .map((turn) => ({
                question: turn.question,
                answer: turn.answer.slice(0, 1200),
              })),
          }),
          signal: controller.signal,
        })

        if (!res.ok) throw new Error(await res.text())

        const raw = res.headers.get('x-evidence-map')
        const citations: EvidenceCitation[] = raw
          ? JSON.parse(decodeURIComponent(raw))
          : []

        // The no-evidence path answers as JSON rather than a stream.
        if (res.headers.get('content-type')?.includes('application/json')) {
          const data = (await res.json()) as {
            text: string
            evidence?: EvidenceCitation[]
          }
          setTurns((prev) =>
            prev.map((t) =>
              t.id === id
                ? {
                    ...t,
                    answer: data.text,
                    citations: data.evidence ?? [],
                    pending: false,
                  }
                : t,
            ),
          )
          return
        }

        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, citations } : t)),
        )

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response stream.')
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setTurns((prev) =>
            prev.map((t) => (t.id === id ? { ...t, answer: text } : t)),
          )
        }
        setTurns((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  pending: false,
                  citations: citations.filter((citation) =>
                    text.includes(`[e:${citation.evidenceId}]`),
                  ),
                }
              : t,
          ),
        )
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setTurns((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  pending: false,
                  error:
                    'The guide could not answer just now. Please try again.',
                }
              : t,
          ),
        )
      }
    },
    [lang, siteSlug, turns],
  )

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang =
      lang === 'hi'
        ? 'hi-IN'
        : lang === 'ta'
          ? 'ta-IN'
          : lang === 'bn'
            ? 'bn-IN'
            : 'en-IN'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('')
      setInput(transcript)
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false)
        void ask(transcript)
      }
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [ask, lang, listening])

  const lastSeed = useRef<string | null>(null)
  useEffect(() => {
    if (!seedQuestion || seedQuestion === lastSeed.current) return
    lastSeed.current = seedQuestion
    void ask(seedQuestion)
  }, [seedQuestion, ask])

  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label-meta">Ask the guide</span>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            Answers are drawn only from{' '}
            {siteName ? `the cited record for ${siteName}` : 'the cited records'}.
            When the record is silent, the guide says so.
          </p>
          {context?.label && (
            <p className="mt-1 inline-flex w-fit items-center gap-2 border border-accent/35 bg-accent/8 px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-accent">
              <span aria-hidden className="size-1 rounded-full bg-current" />
              Standpoint · {context.label}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={cn(
                'local-name border px-2 py-1 text-[0.6875rem] transition-colors',
                lang === l.code
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      {turns.length === 0 && (
        <ul className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => void ask(s)}
                className="border border-border/70 px-3 py-1.5 text-left font-sans text-xs text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {turns.length > 0 && (
        <ol className="flex flex-col gap-6">
          {turns.map((t) => (
            <li key={t.id} className="flex flex-col gap-3">
              <p className="border-l-2 border-accent/60 pl-3 font-sans text-sm text-foreground">
                {t.question}
              </p>
              {t.error ? (
                <p className="font-sans text-sm text-destructive">{t.error}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                    {t.answer}
                    {t.pending && (
                      <span
                        aria-hidden
                        className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-accent [animation:bv-pulse-ring_1.2s_ease-in-out_infinite]"
                      />
                    )}
                  </p>
                  {t.pending && !t.answer && (
                    <span className="label-meta">Retrieving evidence…</span>
                  )}
                  {!t.pending && t.citations.length > 0 && (
                    <ol className="flex flex-col gap-1.5 border-l border-border/70 pl-3">
                      {t.citations.map((citation) => (
                        <li key={citation.evidenceId} className="flex flex-col gap-1.5">
                          <span className="font-mono text-[0.625rem] text-accent">
                            [e:{citation.evidenceId}] · {citation.evidenceLevel.replaceAll('_', ' ')}
                          </span>
                          {citation.sources.map((source) => (
                            <span key={source.id} className="flex flex-col">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-sans text-xs text-foreground underline decoration-border underline-offset-2 hover:decoration-accent"
                              >
                                {source.title}
                              </a>
                              <span className="font-sans text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
                                {source.publisher} · checked {source.lastChecked}
                              </span>
                            </span>
                          ))}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask(input)
        }}
        className="flex items-center gap-2 border border-border/70 bg-card/40 p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              void ask(input)
            }
          }}
          placeholder={
            siteName ? `Ask about ${siteName}…` : 'Ask about a monument…'
          }
          aria-label="Ask the guide a question"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-sans text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={toggleVoice}
          aria-label={listening ? 'Stop voice input' : 'Ask by voice'}
          className={cn('shrink-0', listening && 'text-accent')}
        >
          {listening ? (
            <Square className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </Button>
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim()}
          aria-label="Send question"
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </section>
  )
}
