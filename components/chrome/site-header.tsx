'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/explore', label: 'Discover' },
  { href: '/plan', label: 'Plan Trip' },
  { href: '/atlas', label: 'Atlas' },
  { href: '/explore?view=twins', label: 'Digital Twins' },
  { href: '/conservation', label: 'Stewardship' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-border/70 bg-background/85 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-[110rem] items-center gap-6 px-5 md:px-8">
        <Link href="/" className="group flex items-center">
          <span className="font-sans text-[0.8125rem] font-medium uppercase tracking-[0.26em] text-foreground">
            Bharatverse
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative px-3 py-2 font-sans text-xs uppercase tracking-[0.16em] transition-colors',
                  active
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('bharatverse:open-command'))
          }
          className="ml-auto flex min-h-11 items-center gap-2 border border-border/80 px-2.5 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground md:ml-0"
        >
          <span>Search</span>
          <kbd className="hidden border border-border/70 px-1 font-mono text-[0.625rem] not-italic md:inline">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 place-items-center border border-border/80 md:hidden"
        >
          <span aria-hidden className="flex flex-col gap-1">
            <span
              className={cn(
                'block h-px w-3.5 bg-foreground transition-transform',
                open && 'translate-y-[3px] rotate-45',
              )}
            />
            <span
              className={cn(
                'block h-px w-3.5 bg-foreground transition-transform',
                open && '-translate-y-[3px] -rotate-45',
              )}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-border/70 bg-background/95 px-5 pb-5 pt-2 backdrop-blur-xl md:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="block border-b border-border/50 py-3 font-serif text-2xl font-light text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
