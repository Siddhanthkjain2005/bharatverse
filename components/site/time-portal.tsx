'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Camera, Move, RotateCcw, Scale, ShieldAlert } from 'lucide-react'

export function TimePortal({ site }: { site: { name: string; slug: string; timeline: Array<{ id: string; year: string; title: string }> } }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED'>('IDLE')
  const [opacity, setOpacity] = useState(52)
  const [scale, setScale] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [phase, setPhase] = useState(site.timeline.at(-1)?.id ?? '')

  const stop = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null }
  useEffect(() => stop, [])
  async function start() {
    setStatus('REQUESTING')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setStatus('ACTIVE')
    } catch { setStatus('DENIED') }
  }
  return <div className="grid gap-8 lg:grid-cols-[1fr_20rem]"><div className="relative min-h-[34rem] overflow-hidden border border-border/70 bg-[#0c0b0a]">{status === 'ACTIVE' ? <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,oklch(0.63_0.135_44/.24),transparent_28%),linear-gradient(#211c17,#0c0b0a)] p-8 text-center"><div><Camera className="mx-auto size-11 text-primary" /><h2 className="mt-5 font-serif text-3xl">Place the monument in view.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Camera access begins only when you ask. The stream remains in this browser and stops when you leave.</p><button type="button" onClick={() => void start()} disabled={status === 'REQUESTING'} className="mt-6 min-h-12 border border-primary bg-primary px-5 text-xs uppercase tracking-[0.16em] text-primary-foreground">{status === 'REQUESTING' ? 'Requesting camera…' : status === 'DENIED' ? 'Try camera again' : 'Allow camera'}</button>{status === 'DENIED' && <p className="mt-4 text-xs text-primary">Camera unavailable. Use the reconstruction fallback below.</p>}</div></div>}<div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[54%] w-[58%] -translate-x-1/2 -translate-y-1/2 border-x-2 border-t-2 border-accent bg-primary/15 shadow-[0_0_60px_oklch(0.63_0.135_44/.15)] [clip-path:polygon(5%_100%,5%_48%,18%_48%,18%_31%,34%_31%,41%_14%,50%_0,59%_14%,66%_31%,82%_31%,82%_48%,95%_48%,95%_100%)]" style={{ opacity: opacity / 100, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale / 100}) rotate(${rotation}deg)` }} /><div className="absolute left-4 top-4 border border-accent/60 bg-background/80 px-3 py-2 backdrop-blur"><p className="text-[0.625rem] uppercase tracking-[0.14em] text-accent">Interpretive reconstruction overlay</p><p className="mt-1 font-serif text-lg">{site.timeline.find((item) => item.id === phase)?.year} · {site.name}</p></div><div className="absolute bottom-4 left-4 right-4 border border-border bg-background/85 p-3 text-xs leading-relaxed text-muted-foreground backdrop-blur"><ShieldAlert className="mr-2 inline size-4 text-accent" />Historical overlay is an interpretive alignment of the Bharatverse reconstruction, not a survey-grade AR model.</div></div><aside className="flex flex-col gap-6 border border-border/70 bg-card/20 p-5"><div><span className="label-meta">Historical phase</span><select value={phase} onChange={(event) => setPhase(event.target.value)} className="mt-3 min-h-11 w-full border border-border bg-background px-3 text-sm outline-none">{site.timeline.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.title}</option>)}</select></div>{[["Present ↔ past", opacity, setOpacity, 0, 100, 1], ["Scale", scale, setScale, 60, 160, 2], ["Rotate", rotation, setRotation, -30, 30, 1], ["Move left / right", x, setX, -120, 120, 4], ["Move up / down", y, setY, -120, 120, 4]].map(([label, value, setter, min, max, step]) => <label key={String(label)} className="flex flex-col gap-2"><span className="flex items-center justify-between text-xs text-muted-foreground"><span>{String(label)}</span><span className="font-mono text-accent">{Number(value)}</span></span><input type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={Number(value)} onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))} className="accent-[var(--primary)]" /></label>)}<button type="button" onClick={() => { setOpacity(52); setScale(100); setRotation(0); setX(0); setY(0) }} className="flex min-h-11 items-center justify-center gap-2 border border-border text-xs uppercase tracking-[0.14em]"><RotateCcw className="size-4" />Reset alignment</button><p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Move className="mt-0.5 size-4 shrink-0" />Manual alignment keeps the claim honest when spatial registration is not available.</p><p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Scale className="mt-0.5 size-4 shrink-0" />The overlay is a visual reference, not measurement.</p><Link href={`/site/${site.slug}`} className="mt-auto flex min-h-11 items-center justify-center border border-accent text-xs uppercase tracking-[0.14em] text-accent">Use Then / Now fallback</Link></aside></div>
}
