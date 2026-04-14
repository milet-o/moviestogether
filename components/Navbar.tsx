'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Home, BookMarked, History, Heart, LogOut, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  user: { name: string; avatar: string | null }
  onSearch?: () => void
}

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/watchlist', label: 'Watchlist', icon: BookMarked },
  { href: '/history', label: 'Histórico', icon: History },
]

export default function Navbar({ user, onSearch }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 glass border-b border-cinema-border items-center px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <Heart size={20} className="text-cinema-rose fill-cinema-rose" />
          <span className="font-bold text-cinema-text text-sm tracking-wide">MoviesTogether</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'text-cinema-accent bg-cinema-accent/10'
                  : 'text-cinema-muted hover:text-cinema-text hover:bg-cinema-card'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <button
          onClick={onSearch}
          className="flex items-center gap-2 text-cinema-muted hover:text-cinema-text bg-cinema-card border border-cinema-border rounded-lg px-3 py-1.5 text-sm mr-4 transition-colors"
        >
          <Search size={14} />
          <span className="text-xs">Buscar filme...</span>
          <kbd className="text-xs text-cinema-muted bg-cinema-surface px-1 rounded">⌘K</kbd>
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.name} width={32} height={32} className="rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-cinema-accent/20 flex items-center justify-center text-cinema-accent text-xs font-bold">
              {user.name?.[0] ?? '?'}
            </div>
          )}
          <span className="text-cinema-text text-sm font-medium hidden lg:block">{user.name}</span>
          <button
            onClick={signOut}
            className="text-cinema-muted hover:text-cinema-text transition-colors ml-2"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 glass border-t border-cinema-border flex items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
              pathname === href ? 'text-cinema-accent' : 'text-cinema-muted'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
        <button
          onClick={onSearch}
          className="flex flex-col items-center gap-0.5 px-4 py-2 text-cinema-muted"
        >
          <Search size={20} />
          <span className="text-xs">Buscar</span>
        </button>
      </nav>
    </>
  )
}
