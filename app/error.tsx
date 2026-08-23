'use client'

import { useEffect } from 'react'
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <main className="grid min-h-[80svh] place-items-center px-5 pt-20"><div className="max-w-xl border border-border bg-card/30 p-8 text-center"><span className="label-meta">A recoverable interruption</span><h1 className="mt-4 font-serif text-4xl">This part of Bharatverse could not load.</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your saved journey and source material remain on this device. Try the section again.</p><button type="button" onClick={reset} className="mt-6 min-h-11 border border-primary bg-primary px-5 text-xs uppercase tracking-[0.14em] text-primary-foreground">Try again</button></div></main>
}
