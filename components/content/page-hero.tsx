export function PageHero({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="border-b border-border/70 pb-12">
      <span className="label-meta">{eyebrow}</span>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
        <h1 className="display max-w-[18ch] text-[clamp(3.25rem,7vw,7rem)] leading-[.86]">{title}</h1>
        <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground md:text-lg">{lede}</p>
      </div>
    </header>
  )
}
