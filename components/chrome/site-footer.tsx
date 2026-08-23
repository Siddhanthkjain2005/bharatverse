import Link from 'next/link'
import { allSites } from '@/lib/heritage/query'
import { SOURCES } from '@/lib/heritage/sources'

export function SiteFooter() {
  const sites = allSites()
  const institutions = Array.from(
    new Set(SOURCES.filter((s) => s.scope !== 'SITE').map((s) => s.publisher)),
  ).slice(0, 8)

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto max-w-[110rem] px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <span className="font-sans text-[0.8125rem] font-medium uppercase tracking-[0.26em]">
              Bharatverse AI
            </span>
            <p className="max-w-[38ch] font-sans text-sm leading-relaxed text-muted-foreground">
              A living digital twin of Indian heritage. Every claim carries its
              evidence level and its source. Where the record is silent, the
              platform says so rather than inventing an answer.
            </p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Reconstructions are interpretive · Not survey geometry
            </p>
          </div>

          <nav aria-label="Monuments" className="flex flex-col gap-3">
            <span className="label-meta">Monuments</span>
            <ul className="flex flex-col gap-2">
              {sites.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/site/${s.slug}`}
                    className="font-sans text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Platform" className="flex flex-col gap-3">
            <span className="label-meta">Platform</span>
            <ul className="flex flex-col gap-2">
              {[
                { href: '/explore', label: 'Explore' },
                { href: '/plan', label: 'Plan a journey' },
                { href: '/trips', label: 'Saved journeys' },
                { href: '/atlas', label: 'Atlas' },
                { href: '/conservation', label: 'Conservation' },
                { href: '/method', label: 'Method & evidence' },
                { href: '/sources', label: 'Source registry' },
                { href: '/about/data-policy', label: 'Data & privacy' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="font-sans text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <span className="label-meta">Referenced institutions</span>
            <ul className="flex flex-wrap gap-1.5">
              {institutions.map((i) => (
                <li
                  key={i}
                  className="border border-border/70 px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {i}
                </li>
              ))}
            </ul>
            <p className="font-sans text-[0.6875rem] leading-relaxed text-muted-foreground/70">
              Bharatverse AI is an independent research interface. Listing an
              institution indicates that its published material is cited — not
              endorsement, partnership, or affiliation.
            </p>
          </div>
        </div>

        <div className="rule mt-12" />
        <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            Built for cultural stewardship · Evidence before spectacle
          </p>
          <p className="font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            Not an official ASI or UNESCO product
          </p>
        </div>
      </div>
    </footer>
  )
}
