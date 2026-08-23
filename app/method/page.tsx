import type { Metadata } from 'next'
import { PageHero } from '@/components/content/page-hero'

export const metadata: Metadata = { title: 'Method & evidence', description: 'How Bharatverse grades evidence, reconstructs monuments, grounds AI and calculates travel estimates.' }

const METHODS = [
  ['01', 'Evidence levels', 'Verified facts, interpretation, oral tradition, folklore, reconstruction and AI-assisted summary remain distinct at field level. The interface never silently upgrades one category into another.'],
  ['02', 'Source policy', 'Institutional and official records are registered with publisher, scope, reuse posture and a last-checked date. Link-only sources are cited without rehosting restricted media.'],
  ['03', 'Reconstruction', 'Procedural twins are reference reconstructions driven by plans, typology and documented phases. Geometry changes through time; it is never described as survey-grade unless its provenance supports that claim.'],
  ['04', 'Grounded AI', 'The guide retrieves a bounded evidence corpus and cites stable evidence IDs. Conversation context can resolve “this arch,” but it cannot supply facts. If retrieval is silent, the guide is silent.'],
  ['05', 'Operational data', 'Travel information ages independently from heritage facts. Live, verified, estimated, demo and unverified values keep their own source and freshness path.'],
  ['06', 'Cost ranges', 'Planning costs are conservative ranges, never decorative single prices. The Journey Engine reserves a 10% safety buffer and validates against the upper range.'],
  ['07', 'Optimization', 'Deterministic TypeScript scoring evaluates interest fit, heritage value, route efficiency, cost and uncertainty. Hard constraints are checked again after planning; an LLM does not choose the route.'],
  ['08', 'Privacy', 'Draft trips, passport stamps and spending remain local to the device in this build. Camera and location permissions are optional and requested only at the moment they are useful.'],
]

export default function MethodPage() {
  return <main className="mx-auto max-w-[110rem] px-5 pb-24 pt-28 md:px-8"><PageHero eyebrow="How Bharatverse knows" title="Uncertainty is not a defect to hide." lede="The method keeps historical evidence, reconstructed geometry, operational travel data and generated language in separate trust domains—then reconnects them through explicit provenance." /><ol className="grid gap-px bg-border/70 py-12 md:grid-cols-2">{METHODS.map(([index, title, body]) => <li key={index} className="flex gap-5 bg-background p-6 md:p-8"><span className="font-mono text-xs text-primary">{index}</span><div><h2 className="font-serif text-3xl font-light">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p></div></li>)}</ol></main>
}
