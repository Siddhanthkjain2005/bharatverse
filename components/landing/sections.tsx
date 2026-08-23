import Link from 'next/link'
import { HeritageMap } from '@/components/atlas/heritage-map'
import { EvidenceBadge } from '@/components/provenance'
import { INTERIOR_LABEL, scriptLang } from '@/lib/heritage/query'
import { SOURCES } from '@/lib/heritage/sources'
import type { HeritageSite } from '@/lib/heritage/types'

export function SectionHead({
  index,
  kicker,
  title,
  lede,
}: {
  index: string
  kicker: string
  title: string
  lede: string
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.6875rem] tabular-nums text-primary">{index}</span>
        <span aria-hidden className="h-px w-8 bg-border" />
        <span className="label-meta">{kicker}</span>
      </div>
      <h2 className="display max-w-[26ch] text-[clamp(2rem,4.4vw,3.5rem)] leading-[0.95] text-balance">
        {title}
      </h2>
      <p className="max-w-[62ch] font-sans text-base leading-relaxed text-muted-foreground">
        {lede}
      </p>
    </header>
  )
}

/* ------------------------------------------------------------------ */

const CAPABILITIES = [
  {
    id: 'twin',
    title: 'Heritage Twin',
    body: 'Every monument is a navigable three-dimensional twin with labelled hotspots, camera choreography, and a provenance chip that states exactly how the geometry was derived.',
    detail: 'Reference reconstruction · Never presented as survey data',
  },
  {
    id: 'interior',
    title: 'Interior room graph',
    body: 'Move through courtyards, halls, sanctums and galleries as a connected graph rather than a photo carousel. Each space declares its own interior availability level.',
    detail: 'L1 official scan → L7 not represented',
  },
  {
    id: 'time',
    title: 'Time machine',
    body: 'Scrub across construction, completion, damage and restoration. The twin rebuilds itself tier by tier as the century changes beneath your hand.',
    detail: 'Phase states drive geometry, not just captions',
  },
  {
    id: 'guide',
    title: 'Grounded AI guide',
    body: 'Ask in your language and receive a cited answer assembled only from the indexed record. When the record is silent, the guide says so instead of inventing detail.',
    detail: 'Retrieval-bound · Citations on every response',
  },
  {
    id: 'conservation',
    title: 'Conservation mode',
    body: 'Condition indicators, inspection findings and before/after comparison, each carrying a data class so demonstration values can never be mistaken for measurements.',
    detail: 'Human review required before any finding is confirmed',
  },
  {
    id: 'evidence',
    title: 'Evidence ladder',
    body: 'Verified fact, scholarly interpretation, oral tradition, folklore and reconstruction are visually distinct everywhere they appear — including inside the assistant.',
    detail: 'Six levels · Applied at field granularity',
  },
]

export function CapabilitiesSection() {
  return (
    <section className="border-b border-border/70 py-20 md:py-28">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-12 px-5 md:px-8">
        <SectionHead
          index="01"
          kicker="What the platform does"
          title="Six systems, one continuous record."
          lede="Bharatverse is not a gallery of renders. It is an interpretive apparatus: geometry, narrative, provenance and condition held together so that a claim can always be traced back to the material that supports it."
        />
        <ul className="grid gap-px bg-border/70 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <li
              key={c.id}
              className="group flex flex-col gap-3 bg-background p-6 transition-colors hover:bg-card md:p-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-serif text-2xl font-light">{c.title}</h3>
                <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground/60">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
              <p className="mt-auto pt-3 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary/80">
                {c.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export function AtlasSection({ sites }: { sites: HeritageSite[] }) {
  const unesco = sites.filter((s) => s.unescoRef).length
  const states = new Set(sites.map((s) => s.state)).size
  const hotspots = sites.reduce((a, s) => a + s.hotspots.length, 0)
  const spaces = sites.reduce((a, s) => a + s.spaces.length, 0)

  return (
    <section className="border-b border-border/70 py-20 md:py-28">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-12 px-5 md:px-8">
        <SectionHead
          index="02"
          kicker="The atlas"
          title="Geography is the first argument."
          lede="Monuments are not isolated objects. The atlas places each twin in relation to its neighbours, its region and its tradition — because a Chalukyan doorway in Karnataka explains a Hoysala one three hundred kilometres away."
        />
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className="border border-border/70 bg-card/40 p-4 md:p-6">
            <HeritageMap sites={sites} />
          </div>
          <div className="flex flex-col gap-8">
            <dl className="grid grid-cols-2 gap-px bg-border/70">
              {[
                ['Monuments indexed', String(sites.length)],
                ['UNESCO inscribed', String(unesco)],
                ['States represented', String(states)],
                ['Labelled hotspots', String(hotspots)],
                ['Interior spaces', String(spaces)],
                ['Registered sources', String(SOURCES.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 bg-background p-4">
                  <dt className="label-meta">{label}</dt>
                  <dd className="font-serif text-3xl font-light tabular-nums text-accent">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-3">
              <span className="label-meta">Interior availability ladder</span>
              <ul className="flex flex-col gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                  <li
                    key={l}
                    className="flex items-center gap-3 border-l border-border/70 pl-3 font-sans text-xs text-muted-foreground"
                  >
                    <span className="h-1 w-6 bg-primary" style={{ opacity: 1 - (l - 1) * 0.12 }} />
                    {INTERIOR_LABEL[l]}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/atlas"
              className="self-start border border-border px-5 py-2.5 font-sans text-xs uppercase tracking-[0.2em] transition-colors hover:border-accent hover:text-accent"
            >
              Explore the atlas
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export function EvidenceSection() {
  return (
    <section className="border-b border-border/70 bg-card/30 py-20 md:py-28">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-12 px-5 md:px-8">
        <SectionHead
          index="03"
          kicker="Evidence policy"
          title="An honest interface refuses to guess."
          lede="Heritage misinformation is cheap to generate and expensive to undo. Bharatverse grades every claim, shows the grade beside the claim, and treats “we do not know” as a legitimate — often the most accurate — answer."
        />
        <div className="grid gap-px bg-border/70 md:grid-cols-3">
          {[
            {
              level: 'VERIFIED_FACT' as const,
              title: 'Substantiated',
              body: 'Attested by institutional documentation, inscription, or published survey. Cited inline and in the source registry.',
            },
            {
              level: 'INTERPRETATION' as const,
              title: 'Argued',
              body: 'A reading advanced by scholars, presented as a reading — with the disagreement preserved rather than smoothed away.',
            },
            {
              level: 'ORAL_TRADITION' as const,
              title: 'Transmitted',
              body: 'Community memory and living practice, honoured as its own category of knowledge and never silently upgraded to fact.',
            },
            {
              level: 'FOLKLORE' as const,
              title: 'Told',
              body: 'Legend that shapes how a place is understood. Included because omitting it would falsify the culture around the stone.',
            },
            {
              level: 'RECONSTRUCTION' as const,
              title: 'Reconstructed',
              body: 'Geometry and states inferred from plans, dimensions and typology. Interpretive by definition and labelled as such.',
            },
            {
              level: 'AI_ASSISTED_SUMMARY' as const,
              title: 'Summarised',
              body: 'Language generated from retrieved passages only. Where retrieval returns nothing, the guide reports the gap.',
            },
          ].map((c) => (
            <div key={c.level} className="flex flex-col gap-3 bg-background p-6 md:p-8">
              <EvidenceBadge level={c.level} className="self-start" />
              <h3 className="font-serif text-2xl font-light">{c.title}</h3>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/method"
          className="self-start border border-primary/70 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Read the full method
        </Link>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export function IndexSection({ sites }: { sites: HeritageSite[] }) {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-12 px-5 md:px-8">
        <SectionHead
          index="04"
          kicker="The index"
          title="Choose a monument. Step inside."
          lede="Each entry opens a twin, an interior graph, a timeline, a conservation profile and a guide that only speaks from what has been indexed for that site."
        />
        <ul className="flex flex-col border-t border-border/70">
          {sites.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/site/${s.slug}`}
                className="group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2 border-b border-border/70 py-6 transition-colors hover:bg-card/60 md:grid-cols-[4rem_1.6fr_1fr_1fr_auto] md:py-7"
              >
                <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground/60">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-serif text-3xl font-light leading-none transition-colors group-hover:text-accent md:text-4xl">
                    {s.name}
                  </span>
                  {s.localName && (
                    <span
                      lang={scriptLang(s.localName)}
                      className="local-name text-xs text-muted-foreground"
                    >
                      {s.localName}
                    </span>
                  )}
                </span>
                <span className="col-start-2 font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground md:col-start-auto">
                  {s.city}, {s.state}
                </span>
                <span className="col-start-2 font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground md:col-start-auto">
                  {s.period}
                </span>
                <span className="col-start-2 flex items-center gap-2 md:col-start-auto">
                  {s.unescoRef && (
                    <span className="border border-primary/50 px-2 py-0.5 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-primary">
                      UNESCO
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="font-sans text-lg text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent"
                  >
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
