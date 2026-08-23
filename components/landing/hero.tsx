'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { HeritageSite } from '@/lib/heritage/types'
import { cn } from '@/lib/utils'

const TwinShowcase = dynamic(
  () => import('@/components/twin/showcase').then((module) => module.TwinShowcase),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[radial-gradient(circle_at_70%_38%,oklch(0.63_0.135_44/.26),transparent_26%),linear-gradient(145deg,#211c17,#0f0d0b)]" />,
  },
)

/** Pushes the subject toward the right side of wide viewports so the headline keeps clean space. */
function useSubjectOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setOffset(mq.matches ? 0.3 : 0)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return offset
}

export function LandingHero({ sites }: { sites: HeritageSite[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const site = sites[index]

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIndex((i) => (i + 1) % sites.length), 11000)
    return () => clearInterval(t)
  }, [paused, sites.length])

  const offset = useSubjectOffset()

  useEffect(() => {
    const node = sectionRef.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Bharatverse AI introduction"
      className="relative grain vignette min-h-[100svh] overflow-hidden border-b border-border/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="absolute inset-0 transition-[left] duration-700"
        style={{ left: `${offset * 100}%`, right: `${offset * -34}%` }}
      >
        {visible ? <TwinShowcase key={site.id} site={site} timeOfDay="DUSK" className="h-full w-full" /> : <div className="h-full bg-card" />}
      </div>

      {/* readability scrim — vertical on narrow screens, horizontal once the subject moves right */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/80 lg:hidden"
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-gradient-to-r from-background via-background/75 to-transparent lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 hidden h-48 bg-gradient-to-t from-background to-transparent lg:block"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[110rem] flex-col justify-end px-5 pb-14 pt-28 md:px-8 md:pb-20">
        <div className="flex flex-col gap-7 lg:max-w-[60%]">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-primary" />
            <span className="label-meta">
              Living digital twin · {sites.length} monuments indexed
            </span>
          </div>

          <h1 className="display max-w-[20ch] text-[clamp(2.75rem,7vw,6.5rem)] leading-[0.88] text-balance">
            See India
            <span className="block text-primary">before you go.</span>
            Understand it when you arrive.
          </h1>

          <p className="max-w-[58ch] font-sans text-base leading-relaxed text-muted-foreground md:text-lg">
            Step inside living digital twins of India’s heritage, then let
            Bharatverse build a journey around your time, interests and budget.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/plan"
              className="group relative overflow-hidden border border-primary bg-primary px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] text-primary-foreground"
            >
              <span className="relative z-10">Plan my journey</span>
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-accent/40 [animation:bv-sweep_2.6s_ease-in-out_infinite]"
              />
            </Link>
            <Link
              href={`/site/${site.slug}`}
              className="border border-border px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Enter a digital twin
            </Link>
          </div>

          <div className="rule mt-4" />

          {/* monument ticker */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
                {String(index + 1).padStart(2, '0')}/{String(sites.length).padStart(2, '0')}
              </span>
              <p className="font-serif text-lg font-light text-foreground/90">
                {site.name}
                <span className="text-muted-foreground"> — {site.heroLine}</span>
              </p>
            </div>
            <ul className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
              {sites.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? 'true' : undefined}
                    className={cn(
                      'whitespace-nowrap border px-2.5 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.14em] transition-colors',
                      i === index
                        ? 'border-accent text-accent'
                        : 'border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    )}
                  >
                    {s.city}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
