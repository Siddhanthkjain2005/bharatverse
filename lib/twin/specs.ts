/**
 * Archetype specifications.
 *
 * An archetype is not a fixed model — it is a set of rules for how to roof,
 * articulate and surround the spaces a site actually documents. That is what
 * keeps a Mughal tomb and a rock-cut vihara from sharing a silhouette while both
 * stay honest to the same room graph.
 */

import type { TwinAsset } from '@/lib/heritage/types'
import type { StructureRole } from './model'

export type Archetype = TwinAsset['archetype']

export interface ArchSpec {
  /** Ground/terrain radius. */
  ground: number
  /** Plan span as a fraction of the ground radius — sets the metre scale. */
  planScale: number
  /** Clear interior width/depth limits for the monument core. */
  coreW: [number, number]
  coreD: [number, number]
  wallT: number
  wallH: Record<StructureRole, number>
  /** Plinth top — the walking surface inside each kind of space. */
  floorY: Record<StructureRole, number>
  door: { w: number; h: number }
  /** Superstructure over the core. */
  crown: 'ONION_DOME' | 'SHIKHARA' | 'MINAR' | 'ROCK' | 'DEUL' | 'VIMANA' | 'RATHA' | 'CHHATRI_ROW'
  /** Roof over the remaining documented buildings. */
  roof: 'DOMED_FLAT' | 'PYRAMID' | 'FLAT' | 'ROCK' | 'TIERED'
  /** Wall articulation. */
  facade: 'PISHTAQ' | 'JANGHA' | 'FLUTED' | 'ROCK' | 'DRAVIDIAN' | 'COLONNADE'
  /** Gate treatment for ENTRANCE spaces. */
  gate: 'DARWAZA' | 'GOPURAM' | 'TORANA' | 'RUIN' | 'VERANDAH' | 'BASTION_GATE'
  /** Landscape identity. */
  land:
    | 'CHARBAGH'
    | 'TEMPLE_COURT'
    | 'DESERT_COMPLEX'
    | 'GORGE'
    | 'COASTAL'
    | 'BOULDER_FIELD'
    | 'PLAZA'
    | 'FORT_BASTION'
  extras: (
    | 'MINARETS'
    | 'CHATTRIS'
    | 'WHEELS'
    | 'HORSES'
    | 'BOULDERS'
    | 'CLIFF'
    | 'PRAKARA'
    | 'STEP_TANK'
    | 'FRAGMENTS'
    | 'SCREEN'
    | 'BALCONIES'
    | 'BASTIONS'
  )[]
}

const H = (core: number, building: number, court: number, gate: number, terrace: number) =>
  ({ CORE: core, BUILDING: building, COURT: court, GATE: gate, TERRACE: terrace }) as Record<
    StructureRole,
    number
  >

export const ARCH_SPEC: Record<Archetype, ArchSpec> = {
  TOMB_DOME: {
    ground: 132,
    planScale: 0.6,
    coreW: [13, 18],
    coreD: [11, 18],
    wallT: 1.6,
    wallH: H(13, 8.5, 1.1, 9.5, 1.0),
    floorY: H(3.9, 1.5, 0.35, 1.2, 2.4),
    door: { w: 4.2, h: 7.4 },
    crown: 'ONION_DOME',
    roof: 'DOMED_FLAT',
    facade: 'PISHTAQ',
    gate: 'DARWAZA',
    land: 'CHARBAGH',
    extras: ['MINARETS', 'CHATTRIS'],
  },
  SHIKHARA: {
    ground: 120,
    planScale: 0.58,
    coreW: [9, 14],
    coreD: [9, 14],
    wallT: 1.4,
    wallH: H(9, 7.5, 1.2, 6.5, 1.0),
    floorY: H(4.4, 4.4, 0.4, 1.6, 2.6),
    door: { w: 3.4, h: 4.6 },
    crown: 'SHIKHARA',
    roof: 'PYRAMID',
    facade: 'JANGHA',
    gate: 'TORANA',
    land: 'TEMPLE_COURT',
    extras: ['BALCONIES', 'FRAGMENTS'],
  },
  MINARET: {
    ground: 122,
    planScale: 0.55,
    coreW: [9, 13],
    coreD: [9, 13],
    wallT: 2.2,
    wallH: H(7, 7, 1.3, 8, 1.0),
    floorY: H(1.5, 1.1, 0.3, 1.0, 1.6),
    door: { w: 2.8, h: 4.4 },
    crown: 'MINAR',
    roof: 'FLAT',
    facade: 'FLUTED',
    gate: 'DARWAZA',
    land: 'DESERT_COMPLEX',
    extras: ['SCREEN', 'FRAGMENTS'],
  },
  ROCK_CUT: {
    ground: 186,
    planScale: 0.3,
    coreW: [7, 12],
    coreD: [6, 12],
    wallT: 2.6,
    wallH: H(6.5, 7.5, 1.0, 6, 1.0),
    floorY: H(1.3, 1.3, 0.5, 1.3, 1.3),
    door: { w: 3.2, h: 4.4 },
    crown: 'ROCK',
    roof: 'ROCK',
    facade: 'ROCK',
    gate: 'VERANDAH',
    land: 'GORGE',
    extras: ['CLIFF', 'BOULDERS'],
  },
  CHARIOT: {
    ground: 168,
    planScale: 0.56,
    coreW: [14, 26],
    coreD: [12, 24],
    wallT: 2.4,
    wallH: H(12, 10, 1.2, 7, 1.0),
    floorY: H(4.7, 4.7, 0.4, 1.4, 2.8),
    door: { w: 3.6, h: 5.6 },
    crown: 'DEUL',
    roof: 'PYRAMID',
    facade: 'JANGHA',
    gate: 'TORANA',
    land: 'COASTAL',
    extras: ['WHEELS', 'HORSES', 'FRAGMENTS'],
  },
  GOPURAM: {
    ground: 236,
    planScale: 0.52,
    coreW: [16, 28],
    coreD: [16, 28],
    wallT: 3.2,
    wallH: H(15, 10.5, 1.4, 10, 1.0),
    floorY: H(1.6, 1.6, 0.5, 1.4, 2.2),
    door: { w: 4, h: 6.4 },
    crown: 'VIMANA',
    roof: 'TIERED',
    facade: 'DRAVIDIAN',
    gate: 'GOPURAM',
    land: 'TEMPLE_COURT',
    extras: ['PRAKARA', 'FRAGMENTS'],
  },
  /**
   * A fortified Mughal palace, not a single-building shrine: the core is the
   * great audience hall rather than a domed tomb or a temple sanctum, the
   * facade is the cusped-arch colonnade of that tradition, the roofline is flat
   * with a parapet and a row of chhatris rather than one tall crown, and the
   * defining silhouette — the thick red sandstone curtain wall, its bastions
   * and its monumental gate — comes from the FORT_BASTION land profile in
   * environment.ts rather than from the core building alone.
   */
  RED_FORT: {
    ground: 250,
    planScale: 0.46,
    coreW: [18, 30],
    coreD: [13, 20],
    wallT: 1.9,
    wallH: H(11, 8.5, 1.3, 13, 1.0),
    floorY: H(1.6, 1.3, 0.4, 1.8, 1.6),
    door: { w: 5.2, h: 7.6 },
    crown: 'CHHATRI_ROW',
    roof: 'FLAT',
    facade: 'PISHTAQ',
    gate: 'BASTION_GATE',
    land: 'FORT_BASTION',
    extras: ['BALCONIES', 'BASTIONS'],
  },
  RUIN_COMPLEX: {
    ground: 214,
    planScale: 0.5,
    coreW: [9, 16],
    coreD: [9, 16],
    wallT: 1.5,
    wallH: H(7.5, 6.5, 1.1, 6, 1.0),
    floorY: H(1.9, 1.9, 0.35, 1.2, 1.9),
    door: { w: 3.2, h: 4.4 },
    crown: 'RATHA',
    roof: 'PYRAMID',
    facade: 'COLONNADE',
    gate: 'RUIN',
    land: 'BOULDER_FIELD',
    extras: ['BOULDERS', 'STEP_TANK', 'FRAGMENTS'],
  },
}

/** Height of the crown above the core wall head — used for camera framing. */
export const CROWN_HEIGHT: Record<ArchSpec['crown'], number> = {
  ONION_DOME: 20,
  SHIKHARA: 26,
  MINAR: 52,
  ROCK: 14,
  DEUL: 34,
  VIMANA: 46,
  RATHA: 14,
  CHHATRI_ROW: 5,
}