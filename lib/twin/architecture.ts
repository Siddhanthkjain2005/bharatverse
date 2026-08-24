/**
 * Architecture Inspector.
 *
 * A component list for the monument in front of the visitor, derived from the
 * world model rather than authored per site. Each entry explains what the element
 * *does* in its tradition — a typological reading, graded INTERPRETATION — and
 * frames the camera on the geometry that represents it. Elements that depend on
 * site-specific evidence (an inscription, a sculpture programme) only appear when
 * the record actually documents one.
 */

import type { EvidenceLevel } from '@/lib/heritage/types'
import { anchorFor } from './anchors'
import type { WorldModel } from './model'
import { ARCH_SPEC, CROWN_HEIGHT } from './specs'

export interface ArchBox {
  cx: number
  cz: number
  w: number
  d: number
  y0: number
  y1: number
}

export interface ArchComponent {
  id: string
  name: string
  /** Term of art in the building's own tradition, when there is one. */
  term: string | null
  purpose: string
  evidence: EvidenceLevel
  sourceIds: string[]
  box: ArchBox
  camera: { position: [number, number, number]; target: [number, number, number] }
}

type Lex = Record<string, string>

const LEXICON: Record<string, Lex> = {
  TOMB_DOME: { plinth: 'chabutra', wall: 'facade', door: 'pishtaq', cornice: 'chhajja', crown: 'gumbad', column: 'sutun' },
  SHIKHARA: { plinth: 'adhisthana', wall: 'jangha', door: 'dvara', cornice: 'kapota', crown: 'shikhara', column: 'stambha' },
  MINARET: { plinth: 'platform', wall: 'shaft', door: 'entrance', cornice: 'muqarnas balcony', crown: 'minar', column: 'sutun' },
  ROCK_CUT: { plinth: 'rock floor', wall: 'excavated face', door: 'cave entrance', cornice: 'eave band', crown: 'living rock', column: 'stambha' },
  CHARIOT: { plinth: 'pista', wall: 'jangha', door: 'dvara', cornice: 'kapota', crown: 'deul', column: 'stambha' },
  GOPURAM: { plinth: 'upapitha', wall: 'jangha', door: 'dvara', cornice: 'kapota', crown: 'vimana', column: 'stambha' },
  RUIN_COMPLEX: { plinth: 'jagati', wall: 'wall', door: 'dvara', cornice: 'kapota', crown: 'ratha vimana', column: 'stambha' },
  RED_FORT: { plinth: 'chabutra', wall: 'facade', door: 'naqqar khana', cornice: 'chhajja', crown: 'chhatri row', column: 'sutun' },
}

const CROWN_PURPOSE: Record<string, string> = {
  ONION_DOME: 'The bulbous dome is carried on a drum above the chamber and is read as a double shell — an outer profile shaped for the skyline, an inner one shaped for the room below.',
  SHIKHARA: 'The curvilinear spire rises directly over the sanctum, its receding vertical bands drawing the eye from the image chamber to the finial.',
  MINAR: 'The tapering tower marks the mosque from a distance and carries a stair between corbelled balconies.',
  ROCK: 'There is no built superstructure: the ceiling is the living rock the chamber was cut from, so the mountain itself is the roof.',
  DEUL: 'The sanctum tower rises over the image chamber as the tallest element of the complex, its horizontal courses stepping inward as it climbs.',
  VIMANA: 'The pyramidal tower over the sanctum stacks diminishing storeys, each articulated like a miniature shrine, under a domical cap.',
  RATHA: 'The shrine is crowned by a small tiered tower in the form of a temple chariot, the pattern repeated across the complex at different scales.',
  CHHATRI_ROW: 'A row of domed kiosks lines the roof parapet, marking the ceremonial hall beneath rather than rising as a single tower — the skyline of a Mughal audience hall rather than a temple or a tomb.',
}


function frame(box: ArchBox, away: number, up: number): ArchComponent['camera'] {
  const cy = (box.y0 + box.y1) / 2
  const span = Math.max(box.w, box.d, box.y1 - box.y0)
  const dist = span * away + 12
  return {
    position: [box.cx + dist * 0.55, cy + span * up + 6, box.cz + dist],
    target: [box.cx, cy, box.cz],
  }
}

export function architectureFor(world: WorldModel): ArchComponent[] {
  const site = world.site
  const spec = ARCH_SPEC[site.twin.archetype]
  const lex = LEXICON[site.twin.archetype] ?? LEXICON.RUIN_COMPLEX
  const core = world.core
  const src = site.sourceIds
  const out: ArchComponent[] = []
  if (!core) return out

  const r = core.rect
  const wallTop = core.floorY + core.wallH
  const add = (
    id: string,
    name: string,
    term: string | null,
    purpose: string,
    box: ArchBox,
    evidence: EvidenceLevel = 'INTERPRETATION',
    away = 1.6,
    up = 0.35,
  ) => out.push({ id, name, term, purpose, evidence, sourceIds: src, box, camera: frame(box, away, up) })

  add(
    'ac-plinth', 'Plinth', lex.plinth,
    'The raised base lifts the building clear of the ground plane, sheds water away from the walls, and sets the platform from which the whole composition is read.',
    { cx: r.cx, cz: r.cz, w: r.w + 6, d: r.d + 6, y0: 0, y1: core.floorY },
    'INTERPRETATION', 2.2, 0.9,
  )
  add(
    'ac-wall', 'Wall register', lex.wall,
    'The load-bearing wall between plinth and cornice carries the surface programme of this tradition — recesses, bands and framed panels that break the mass into readable registers.',
    { cx: r.cx, cz: r.cz, w: r.w + spec.wallT * 2, d: r.d + spec.wallT * 2, y0: core.floorY, y1: wallTop - 1.5 },
    'INTERPRETATION', 1.7,
  )
  add(
    'ac-door', 'Entrance opening', lex.door,
    'The threshold controls how the interior is revealed: a deep reveal, a shading head, and a raised sill that separates outside ground from inside floor.',
    { cx: r.cx, cz: r.cz + r.d / 2 + spec.wallT, w: spec.door.w + 2, d: spec.wallT * 2 + 1, y0: core.floorY, y1: core.floorY + spec.door.h },
    'VERIFIED_FACT', 2.4, 0.4,
  )
  add(
    'ac-cornice', 'Cornice', lex.cornice,
    'The projecting course throws rain clear of the wall face and casts the deep horizontal shadow that reads the building against the sky.',
    { cx: r.cx, cz: r.cz, w: r.w + spec.wallT * 2 + 1.6, d: r.d + spec.wallT * 2 + 1.6, y0: wallTop - 1.6, y1: wallTop + 0.6 },
    'INTERPRETATION', 2, 0.3,
  )
  add(
    'ac-crown', 'Superstructure', lex.crown,
    CROWN_PURPOSE[spec.crown] ?? CROWN_PURPOSE.VIMANA,
    { cx: r.cx, cz: r.cz, w: r.w, d: r.d, y0: wallTop, y1: wallTop + CROWN_HEIGHT[spec.crown] },
    'INTERPRETATION', 1.5, 0.45,
  )

  const colonnaded = world.spaces.find((s) => s.columns)
  if (colonnaded) {
    add(
      'ac-column', 'Column and capital', lex.column,
      'Columns carry the roof of the pillared hall on a repeating rhythm; the capital spreads the load into the beam above and is where carving concentrates.',
      { cx: colonnaded.rect.cx, cz: colonnaded.rect.cz, w: colonnaded.rect.w, d: colonnaded.rect.d, y0: colonnaded.floorY, y1: colonnaded.floorY + colonnaded.wallH },
      'INTERPRETATION', 1.4, 0.2,
    )
  }

  const gate = world.spaces.find((s) => s.role === 'GATE')
  if (gate) {
    add(
      'ac-gate', 'Gateway', spec.gate === 'GOPURAM' ? 'gopuram' : spec.gate === 'DARWAZA' ? 'darwaza' : spec.gate === 'BASTION_GATE' ? 'gateway bastion' : 'gateway',
      'The gate is a building in its own right: it holds the first framed view of the monument and marks the passage from the ordinary world into the enclosure.',
      { cx: gate.rect.cx, cz: gate.rect.cz, w: gate.rect.w, d: gate.rect.d, y0: gate.floorY, y1: gate.floorY + gate.wallH },
      gate.space.evidence, 2, 0.5,
    )
  }

  const court = world.spaces.find((s) => s.role === 'COURT')
  if (court) {
    add(
      'ac-court', 'Enclosure', spec.land === 'CHARBAGH' ? 'charbagh' : 'prakara',
      'The open enclosure sets the viewing distance for the monument and organises the approach; its axes are the lines the whole composition is designed to be seen along.',
      { cx: court.rect.cx, cz: court.rect.cz, w: court.rect.w, d: court.rect.d, y0: court.floorY, y1: court.floorY + 2 },
      court.space.evidence, 1.1, 3.2,
    )
  }

  /**
   * Evidence-gated: only offered when the record documents one. The box comes
   * from the hotspot's resolved anchor, not from the record's authored point —
   * the record's coordinate is a direction hint in a monument-at-origin frame,
   * so highlighting it directly would draw a box in mid-air beside the building.
   */
  for (const kind of ['INSCRIPTION', 'SCULPTURE', 'MATERIAL'] as const) {
    const h = site.hotspots.find((x) => x.kind === kind)
    if (!h) continue
    const a = anchorFor(world.anchors, h.id)
    if (!a) continue
    const label = kind === 'INSCRIPTION' ? 'Inscription' : kind === 'SCULPTURE' ? 'Sculpture' : 'Surface material'
    const half = Math.max(1.6, a.size)
    out.push({
      id: `ac-${kind.toLowerCase()}`,
      name: label,
      term: null,
      purpose: h.summary,
      evidence: h.evidence,
      sourceIds: h.sourceIds,
      box: {
        cx: a.position[0],
        cz: a.position[2],
        w: half * 2,
        d: half * 2,
        y0: a.position[1] - half,
        y1: a.position[1] + half,
      },
      camera: a.camera,
    })
  }

  return out
}
