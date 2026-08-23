'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SiteEntry {
  slug: string
  name: string
  state: string
  era: string
}

interface Command {
  id: string
  label: string
  hint: string
  href: string
  group: 'Monuments' | 'Platform'
}

export function CommandPalette({ sites }: { sites: SiteEntry[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Command[]>(
    () => [
      ...sites.map((s) => ({
        id: `site-${s.slug}`,
        label: s.name,
        hint: `${s.state} · ${s.era}`,
        href: `/site/${s.slug}`,
        group: 'Monuments' as const,
      })),
      {
        id: 'plan',
        label: 'Plan a new journey',
        hint: 'Budget & time optimizer',
        href: '/plan',
        group: 'Platform',
      },
      {
        id: 'today',
        label: "Open today's journey",
        hint: 'On-trip mode',
        href: '/today',
        group: 'Platform',
      },
      {
        id: 'trips',
        label: 'Continue a saved journey',
        hint: 'Local trip library',
        href: '/trips',
        group: 'Platform',
      },
      {
        id: 'explore',
        label: 'Explore all monuments',
        hint: 'Filterable index',
        href: '/explore',
        group: 'Platform',
      },
      {
        id: 'atlas',
        label: 'Open the heritage atlas',
        hint: 'Geographic explorer',
        href: '/atlas',
        group: 'Platform',
      },
      {
        id: 'conservation',
        label: 'Conservation monitoring',
        hint: 'Condition indicators',
        href: '/conservation',
        group: 'Platform',
      },
      {
        id: 'method',
        label: 'Method & evidence policy',
        hint: 'How claims are graded',
        href: '/method',
        group: 'Platform',
      },
      {
        id: 'sources',
        label: 'Source registry',
        hint: 'Every citation, with reuse posture',
        href: '/sources',
        group: 'Platform',
      },
    ],
    [sites],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) =>
      `${c.label} ${c.hint}`.toLowerCase().includes(q),
    )
  }, [commands, query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setCursor(0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') close()
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('bharatverse:open-command', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('bharatverse:open-command', onOpen)
    }
  }, [close])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => setCursor(0), [query])

  if (!open) return null

  const go = (href: string) => {
    close()
    router.push(href)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Bharatverse"
      className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[12vh]"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={close}
        className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-md"
      />
      <div className="relative w-full max-w-xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border/70 px-4">
          <span aria-hidden className="text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (e.key === 'Enter' && results[cursor]) {
                e.preventDefault()
                go(results[cursor].href)
              }
            }}
            placeholder="Search monuments, states, eras, platform…"
            className="h-12 w-full bg-transparent font-sans text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <ul className="scrollbar-thin max-h-[52vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 font-sans text-sm text-muted-foreground">
              No match. Bharatverse only answers from its indexed record.
            </li>
          )}
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(c.href)}
                className={cn(
                  'flex w-full items-baseline gap-3 px-4 py-2.5 text-left transition-colors',
                  i === cursor ? 'bg-primary/12' : 'hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'font-sans text-sm',
                    i === cursor ? 'text-accent' : 'text-foreground',
                  )}
                >
                  {c.label}
                </span>
                <span className="ml-auto font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {c.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-border/70 px-4 py-2">
          {[
            ['↑↓', 'navigate'],
            ['↵', 'open'],
            ['esc', 'close'],
          ].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <kbd className="border border-border/70 px-1 font-mono text-[0.625rem]">
                {k}
              </kbd>
              <span className="font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                {l}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
