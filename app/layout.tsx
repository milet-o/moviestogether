import type { Metadata } from 'next'
import { Inter, VT323, Caveat } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-win95',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MoviesTogether — Nosso Diário de Filmes',
  description: 'O álbum de recortes dos filmes do casal.',
  keywords: ['movies', 'couples', 'watchlist', 'film', 'reviews', 'scrapbook'],
  openGraph: {
    title: 'MoviesTogether',
    description: 'Watch together, remember together.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${vt323.variable} ${caveat.variable} font-sans antialiased text-cinema-text min-h-screen w-full overflow-x-hidden relative bg-[#e4d5b7]`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')] opacity-80 mix-blend-multiply z-[0] pointer-events-none"></div>
        {children}
      </body>
    </html>
  )
}
