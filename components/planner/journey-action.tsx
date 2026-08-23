import Link from 'next/link'
import { MapPinPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function JourneyAction({ slug, className, compact = false }: { slug: string; className?: string; compact?: boolean }) {
  return (
    <Link href={`/plan?mustSee=${encodeURIComponent(slug)}`} className={cn('inline-flex min-h-11 items-center justify-center gap-2 border border-primary bg-primary px-4 font-sans text-xs uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent', className)}>
      <MapPinPlus className="size-4" />{compact ? 'Add' : 'Add to journey'}
    </Link>
  )
}
