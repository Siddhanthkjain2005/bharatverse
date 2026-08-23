export default function Loading() {
  return <main className="min-h-[80svh] px-5 pt-28 md:px-8"><div className="mx-auto max-w-[110rem]"><span className="label-meta">Preparing Bharatverse</span><div className="mt-5 h-20 max-w-3xl animate-pulse bg-card motion-reduce:animate-none" /><div className="mt-10 grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse border border-border bg-card/40 motion-reduce:animate-none" />)}</div></div></main>
}
