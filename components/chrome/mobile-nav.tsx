'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpenText, Compass, House, MapPinned, Route } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/plan', label: 'Plan', icon: Route },
  { href: '/trips', label: 'Trips', icon: MapPinned },
  { href: '/guide', label: 'Guide', icon: BookOpenText },
]

export function MobileNav() {
  const pathname = usePathname()
  return <nav aria-label="Mobile primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"><ul className="grid grid-cols-5">{ITEMS.map((item) => { const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href); const Icon = item.icon; return <li key={item.href}><Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground', active && 'text-accent')}><Icon className="size-4" />{item.label}</Link></li> })}</ul></nav>
}
