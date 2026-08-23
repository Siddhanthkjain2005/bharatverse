'use client'

/**
 * Navigation map.
 *
 * Drawn from the documented room graph, north-up, with the visitor's position and
 * heading. It exists so nobody gets lost inside a monument — and it deliberately
 * stays small, because the monument is the thing worth looking at.
 */

import { useEffect, useRef } from 'react'
import type { WorldModel } from '@/lib/twin/model'
import type { WalkReport } from '../controls/walk-camera'
import { cn } from '@/lib/utils'

const ROLE_FILL: Record<string, string> = {
  CORE: 'rgba(233,183,110,0.34)',
  BUILDING: 'rgba(214,196,168,0.2)',
  GATE: 'rgba(201,138,92,0.26)',
  COURT: 'rgba(120,142,120,0.16)',
  TERRACE: 'rgba(190,180,160,0.16)',
}

export function MiniMap({
  world,
  walkRef,
  currentSpaceId,
  discovered,
  className,
}: {
  world: WorldModel
  walkRef: React.RefObject<WalkReport | null>
  currentSpaceId: string | null
  discovered: Set<string>
  className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    let raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = 168
    el.width = size * dpr
    el.height = size * dpr
    ctx.scale(dpr, dpr)

    const span = world.extent * 1.16
    const toX = (x: number) => size / 2 + (x / span) * (size / 2 - 8)
    const toY = (z: number) => size / 2 + (z / span) * (size / 2 - 8)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = 'rgba(16,14,12,0.82)'
      ctx.fillRect(0, 0, size, size)

      // paths
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      for (const p of world.paths) {
        ctx.fillRect(toX(p.x - p.w / 2), toY(p.z - p.d / 2), (p.w / span) * (size / 2 - 8), (p.d / span) * (size / 2 - 8))
      }

      // spaces
      for (const s of world.spaces) {
        const x = toX(s.rect.cx - s.rect.w / 2)
        const y = toY(s.rect.cz - s.rect.d / 2)
        const w = (s.rect.w / span) * (size / 2 - 8)
        const h = (s.rect.d / span) * (size / 2 - 8)
        ctx.fillStyle = ROLE_FILL[s.role] ?? 'rgba(255,255,255,0.1)'
        ctx.fillRect(x, y, w, h)
        const here = s.space.id === currentSpaceId
        ctx.strokeStyle = here ? 'rgba(233,183,110,0.95)' : 'rgba(255,255,255,0.2)'
        ctx.lineWidth = here ? 1.6 : 0.7
        ctx.strokeRect(x, y, w, h)
      }

      // portals
      for (const p of world.portals) {
        ctx.fillStyle = 'rgba(233,183,110,0.75)'
        ctx.fillRect(toX(p.position[0]) - 1.5, toY(p.position[2]) - 1.5, 3, 3)
      }

      // hotspots, at the anchor each one resolved onto
      for (const a of world.anchors) {
        const seen = discovered.has(a.id)
        ctx.beginPath()
        ctx.arc(toX(a.position[0]), toY(a.position[2]), seen ? 2.8 : 2, 0, Math.PI * 2)
        ctx.fillStyle = seen ? 'rgba(201,138,92,0.95)' : 'rgba(201,138,92,0.35)'
        ctx.fill()
      }

      // visitor
      const r = walkRef.current
      if (r) {
        const px = toX(r.x)
        const py = toY(r.z)
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(-r.yaw)
        ctx.beginPath()
        ctx.moveTo(0, -8)
        ctx.lineTo(5, 5)
        ctx.lineTo(0, 2.5)
        ctx.lineTo(-5, 5)
        ctx.closePath()
        ctx.fillStyle = '#f6e3c4'
        ctx.fill()
        ctx.restore()
      }

      // north
      ctx.fillStyle = 'rgba(246,227,196,0.65)'
      ctx.font = '9px ui-monospace, monospace'
      ctx.fillText('N', size / 2 - 3, 11)
      ctx.beginPath()
      ctx.moveTo(size / 2, 13)
      ctx.lineTo(size / 2, 20)
      ctx.strokeStyle = 'rgba(246,227,196,0.45)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [world, currentSpaceId, discovered, walkRef])

  return (
    <div
      className={cn(
        'border border-border/70 bg-background/70 p-1.5 backdrop-blur-md',
        className,
      )}
    >
      <canvas
        ref={canvas}
        style={{ width: 168, height: 168 }}
        role="img"
        aria-label="Navigation map of the monument grounds"
      />
      <p className="mt-1 px-0.5 font-sans text-[0.5625rem] uppercase tracking-[0.16em] text-muted-foreground">
        Schematic · not to scale
      </p>
    </div>
  )
}
