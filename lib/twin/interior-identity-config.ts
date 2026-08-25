export interface InteriorIdentityConfig {
  spaceId: string
  label: string
  caption: string
}

/**
 * A site-appropriate interior identity. Funerary and Islamic monuments receive
 * their own architectural focal objects rather than invented sacred sculpture.
 */
const IDENTITY_BY_SITE: Record<string, InteriorIdentityConfig> = {
  'taj-mahal': {
    spaceId: 'sp-cenotaph',
    label: 'Cenotaph chamber',
    caption: 'Paired cenotaph reference forms, a carved jali enclosure and floral inlay fields identify the chamber.',
  },
  hampi: {
    spaceId: 'sp-h-sanctum',
    label: 'Vitthala sanctum',
    caption: 'A clearly labelled Vitthala reference icon, doorway guardians and Vaishnava emblems identify the temple’s Vishnu dedication without claiming to reproduce the lost cult image.',
  },
  'konark-sun-temple': {
    spaceId: 'sp-k-jagamohana',
    label: 'Surya hall',
    caption: 'A monumental Surya reference image and carved registers make the solar identity visible inside the surviving hall.',
  },
  'ajanta-caves': {
    spaceId: 'sp-a-apse',
    label: 'Stupa and Buddha apse',
    caption: 'The apsidal stupa, Buddha gallery and offering forms identify the rock-cut Buddhist interior.',
  },
  khajuraho: {
    spaceId: 'sp-kh-garbha',
    label: 'Sanctum linga',
    caption: 'A linga, lotus ceiling, guardians and ritual furnishings form the focal identity of the sanctum.',
  },
  'qutb-minar': {
    spaceId: 'sp-q-minar',
    label: 'Minaret spiral stair',
    caption: 'The central newel and walkable spiral stair identify the virtual interior of the minaret base.',
  },
  'red-fort': {
    spaceId: 'sp-rf-palace',
    label: 'Marble palace pavilion',
    caption: 'A marble jharokha reference, low imperial platform and the Nahr-i-Behisht water channel identify the private palace sequence.',
  },
  'brihadisvara-thanjavur': {
    spaceId: 'sp-t-sanctum',
    label: 'Great linga sanctum',
    caption: 'The monumental Shiva linga, lamp ring, guardians and ritual furnishings identify the garbhagriha.',
  },
  mahabalipuram: {
    spaceId: 'sp-m-shrine',
    label: 'Shore shrine sanctum',
    caption: 'A linga, guardian pair and Nandi frieze establish the identity of the compact coastal shrine interior.',
  },
  sanchi: {
    spaceId: 'sanchi-main-complex',
    label: 'Great Stupa court',
    caption: 'A hemispherical stupa reference, harmika, triple chattra and carved torana establish Sanchi’s Buddhist monument identity.',
  },
}

export function interiorIdentityConfigFor(siteSlug: string): InteriorIdentityConfig | null {
  return IDENTITY_BY_SITE[siteSlug] ?? null
}
