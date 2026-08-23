import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import {
  Cormorant_Garamond,
  Inter,
  Noto_Sans,
  Noto_Sans_Kannada,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
} from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/chrome/site-header'
import { SiteFooter } from '@/components/chrome/site-footer'
import { CommandPalette } from '@/components/chrome/command-palette'
import { MobileNav } from '@/components/chrome/mobile-nav'
import { allSites } from '@/lib/heritage/query'

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
})

const interface_ = Inter({
  subsets: ['latin'],
  variable: '--font-interface',
  display: 'swap',
})

/**
 * Local monument names are written in their own scripts. The dataset spans
 * Devanagari, Kannada, Odia and Tamil, so each needs real coverage or the
 * names render as tofu boxes.
 */
const indic = Noto_Sans({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500'],
  variable: '--font-indic',
  display: 'swap',
})

const tamil = Noto_Sans_Tamil({
  subsets: ['tamil', 'latin'],
  weight: ['400', '500'],
  variable: '--font-tamil',
  display: 'swap',
})

const kannada = Noto_Sans_Kannada({
  subsets: ['kannada', 'latin'],
  weight: ['400', '500'],
  variable: '--font-kannada',
  display: 'swap',
})

const odia = Noto_Sans_Oriya({
  subsets: ['oriya', 'latin'],
  weight: ['400', '500'],
  variable: '--font-odia',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  title: {
    default: 'Bharatverse AI — the living digital twin of Indian heritage',
    template: '%s · Bharatverse AI',
  },
  description:
    'Preview India’s heritage in evidence-grounded digital twins, then build an honest journey around your time, interests and budget.',
  keywords: [
    'Indian heritage',
    'digital twin',
    'UNESCO World Heritage India',
    'conservation monitoring',
    'archaeology',
    'cultural heritage AI',
  ],
  openGraph: {
    title: 'Bharatverse AI',
    description:
      'A living digital twin of Indian heritage — cited, navigable, and conservation-aware.',
    type: 'website',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Bharatverse AI — See India before you go. Understand it when you arrive.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bharatverse AI',
    description: 'See India before you go. Understand it when you arrive.',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1a1713',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const sites = allSites().map((s) => ({
    slug: s.slug,
    name: s.name,
    state: s.state,
    era: s.era,
  }))

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${interface_.variable} ${indic.variable} ${tamil.variable} ${kannada.variable} ${odia.variable} bg-background`}
    >
      <body className="min-h-dvh pb-16 antialiased md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:border focus:border-primary focus:bg-background focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main">{children}</div>
        <SiteFooter />
        <CommandPalette sites={sites} />
        <MobileNav />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
