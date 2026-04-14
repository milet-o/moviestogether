import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MoviesTogether — Watch Together, Remember Together',
  description: 'The cinematic watchlist app for couples. Track movies you want to watch and review the ones you\'ve seen together.',
  keywords: ['movies', 'couples', 'watchlist', 'film', 'reviews'],
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
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-cinema-bg text-cinema-text min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
