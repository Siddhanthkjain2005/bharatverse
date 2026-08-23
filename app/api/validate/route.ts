import { allSites } from '@/lib/heritage/query'
import { shotsFor } from '@/lib/twin/cinematic'
import { checkReachability } from '@/lib/twin/reachability'
import { CROWN_HEIGHT, ARCH_SPEC } from '@/lib/twin/specs'
import { getWorld } from '@/lib/twin/world'
import { spaceAt, type WorldModel } from '@/lib/twin/model'
import { WALKER } from '@/lib/twin/collision'
import { spiralStairFor } from '@/lib/twin/spiral-stair'

function verticalTraversal(world: WorldModel) {
  if (world.site.slug !== 'qutb-minar') return null
  const room = world.spaces.find((s) => s.space.id === 'sp-q-minar')
  if (!room) return { id: 'qutb-spiral', reached: false, reason: 'room-missing' }
  const spiral = spiralStairFor(room)
  const first = spiral.treads[0]
  let x = room.rect.cx + first.x
  let z = room.rect.cz + first.z
  let y = world.collision.groundAt(x, z, room.floorY, WALKER.stepUp)
  // Overlapping pads may legitimately put the first footfall on a later tread,
  // provided the jump remains inside the walker's normal step-up.
  let reached = y > room.floorY && y <= room.floorY + WALKER.stepUp
  for (const tread of spiral.treads.slice(1)) {
    const nx = room.rect.cx + tread.x
    const nz = room.rect.cz + tread.z
    const solved = world.collision.solve(
      x,
      z,
      nx - x,
      nz - z,
      WALKER.radius,
      y,
      WALKER.height,
      WALKER.stepUp,
    )
    if (Math.hypot(solved.x - nx, solved.z - nz) > 0.1) reached = false
    x = solved.x
    z = solved.z
    y = solved.feetY
  }
  const expected = room.floorY + spiral.treads[spiral.treads.length - 1].top
  return {
    id: 'qutb-spiral',
    treadCount: spiral.treads.length,
    reached: reached && Math.abs(y - expected) < 0.08,
    reachedHeight: +y.toFixed(2),
    expectedHeight: +expected.toFixed(2),
  }
}

/**
 * Does each preset actually contain the monument? The subject's angular height
 * from the shot's own position is compared with its field of view, so a cropped
 * hero frame is a number in this report rather than something to notice in a
 * screenshot later.
 */
function framing(world: WorldModel) {
  const core = world.core
  const crown =
    (core ? core.floorY + core.wallH : 12) +
    CROWN_HEIGHT[ARCH_SPEC[world.site.twin.archetype].crown]
  const cx = core?.rect.cx ?? 0
  const cz = core?.rect.cz ?? 0
  return {
    crown: +crown.toFixed(1),
    core: core ? { w: +core.rect.w.toFixed(1), d: +core.rect.d.toFixed(1) } : null,
    shots: shotsFor(world)
      .filter((s) => s.id === 'hero' || s.id === 'approach' || s.id === 'aerial')
      .map((s) => {
        const d = Math.hypot(s.position[0] - cx, s.position[1] - crown * 0.5, s.position[2] - cz)
        // Half-angle the monument subtends from here, against the frame's own half-angle.
        const need = (Math.atan2(crown * 0.5, d) * 360) / Math.PI
        const r1 = (n: number) => +n.toFixed(1)
        return {
          id: s.id,
          pos: s.position.map(r1),
          target: s.target.map(r1),
          dist: Math.round(d),
          eye: Math.round(s.position[1]),
          fov: s.fov,
          needFov: +need.toFixed(1),
          fits: need <= s.fov,
        }
      }),
  }
}

/**
 * Did every documented hotspot land on the geometry it names? A marker's job is
 * to sit on the building, so the distance from the anchor to the surface of the
 * element it resolved onto is the number that matters: `far` is how many markers
 * are still floating clear of anything built.
 */
function anchoring(world: WorldModel) {
  const rects = world.spaces.map((s) => s.rect)
  const near = (x: number, z: number) => {
    let best = Infinity
    for (const r of rects) {
      const dx = Math.max(0, Math.abs(x - r.cx) - r.w / 2)
      const dz = Math.max(0, Math.abs(z - r.cz) - r.d / 2)
      best = Math.min(best, Math.hypot(dx, dz))
    }
    for (const mn of world.extras.minarets) {
      best = Math.min(best, Math.max(0, Math.hypot(x - mn.x, z - mn.z) - mn.r))
    }
    return best
  }
  const r1 = (n: number) => +n.toFixed(1)
  const inside = (x: number, z: number) => {
    const hit = world.spaces.filter(
      (s) => Math.abs(x - s.rect.cx) <= s.rect.w / 2 && Math.abs(z - s.rect.cz) <= s.rect.d / 2,
    )
    return hit.length ? hit[hit.length - 1].space.id : null
  }
  const list = world.anchors.map((a) => ({
    id: a.id,
    on: a.on,
    pos: a.position.map(r1),
    spaceId: a.spaceId,
    onFloor: a.onFloor,
    /** Room footprint the anchor actually stands in, if any. */
    in: inside(a.position[0], a.position[2]),
    /** Metres from the nearest built footprint; 0 means inside one. */
    gap: r1(near(a.position[0], a.position[2])),
  }))
  return {
    count: list.length,
    far: list.filter((a) => a.gap > 6).length,
    worst: r1(Math.max(0, ...list.map((a) => a.gap))),
    list,
  }
}

/**
 * Development-only walkability report.
 *
 * Every documented space has to be somewhere a visitor can actually walk to, and
 * that is a property of the geometry, so it is checked rather than eyeballed:
 * `unreachable` and `stuckSpawns` must be empty for every site. Not a product
 * surface — it solves every world in the catalogue on demand, so it answers 404
 * outside development.
 */

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const report = allSites().map((site) => {
    const world = getWorld(site)
    const check = checkReachability(world)
    const finite = (n: number) => Number.isFinite(n)
    return {
      site: site.slug,
      archetype: site.twin.archetype,
      extent: Math.round(world.extent),
      counts: {
        spaces: world.spaces.length,
        walls: world.walls.length,
        doorways: world.doorways.length,
        portals: world.portals.length,
        paths: world.paths.length,
        steps: world.steps.length,
        colliders: world.collision.colliders.length,
        platforms: world.collision.platforms.length,
        columns: world.columns.reduce((n, g) => n + g.positions.length, 0),
        trees: world.props.trees.length,
        rocks: world.props.rocks.length,
        water: world.water.length,
      },
      nan:
        world.walls.some((w) => !finite(w.x) || !finite(w.h)) ||
        world.spaces.some((s) => !finite(s.rect.cx) || !finite(s.rect.w)) ||
        !finite(world.extent),
      framing: framing(world),
      anchors: anchoring(world),
      verticalTraversal: verticalTraversal(world),
      /**
       * Where every documented space ended up. `InteriorSpace.plan` is authored in
       * normalised plan coordinates, so this is the only place the solved metres
       * are legible — it is what makes an anchor or a collision report diagnosable
       * without opening the scene.
       */
      plan: world.spaces.map((s) => ({
        spawn: world.spawns[s.space.id],
        spawnSpaceId: spaceAt(
          world,
          world.spawns[s.space.id].x,
          world.spawns[s.space.id].z,
        )?.space.id ?? null,
        id: s.space.id,
        role: s.role,
        roofed: s.roofed,
        cx: +s.rect.cx.toFixed(1),
        cz: +s.rect.cz.toFixed(1),
        w: +s.rect.w.toFixed(1),
        d: +s.rect.d.toFixed(1),
        floorY: +s.floorY.toFixed(1),
        wallH: +s.wallH.toFixed(1),
        depth: s.depth,
      })),
      ...check,
    }
  })

  return Response.json(report)
}
