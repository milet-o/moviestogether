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
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased text-cinema-text min-h-screen w-full flex flex-col overflow-x-hidden relative`}>
        <div className="absolute inset-0 bg-paper z-[-1]"></div>
        {children}
      </body>
    </html>
  )
}
