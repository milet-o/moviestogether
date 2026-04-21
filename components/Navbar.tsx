'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Home, BookMarked, History, Heart, LogOut, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  user: { name: string; avatar: string | null }
  partner?: { name: string; avatar: string | null }
  onSearch?: () => void
}

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/watchlist', label: 'Lista', icon: BookMarked },
  { href: '/history', label: 'Diário', icon: History },
]

export default function Navbar({ user, partner, onSearch }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Get first name
  const firstName = user.name?.split(' ')[0] || 'Você'
  const partnerFirstName = partner?.name?.split(' ')[0] || ''

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-cinema-border flex items-center px-6 justify-between text-cinema-text">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Heart size={20} className="text-cinema-rose fill-cinema-rose group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm tracking-widest uppercase hidden sm:block">
              {partnerFirstName ? `${firstName} & ${partnerFirstName}` : 'MoviesTogether'}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  pathname === href
                    ? 'text-cinema-rose bg-cinema-rose/10'
                    : 'text-cinema-muted hover:text-cinema-text hover:bg-cinema-surface'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onSearch}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-cinema-surface border border-cinema-border hover:border-cinema-rose/50 text-cinema-muted hover:text-cinema-rose transition-colors"
            title="Buscar filme"
          >
            <Search size={16} />
          </button>
          
          <div className="flex -space-x-2">
            {user.avatar ? (
               <Image src={user.avatar} alt="User" width={32} height={32} className="rounded-full border-2 border-white shadow-sm z-10" />
            ) : (
               <div className="w-8 h-8 rounded-full border-2 border-white bg-cinema-accent/20 flex items-center justify-center text-xs font-bold text-cinema-accent z-10">
                 {firstName[0]}
               </div>
            )}
            {partner && (
              partner.avatar ? (
                <Image src={partner.avatar} alt="Partner" width={32} height={32} className="rounded-full border-2 border-white shadow-sm z-0" />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-cinema-rose/20 flex items-center justify-center text-xs font-bold text-cinema-rose z-0">
                  {partnerFirstName[0] ?? '?'}
                </div>
              )
            )}
          </div>
          
          <button
            onClick={signOut}
            className="text-cinema-muted hover:text-cinema-rose transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav - now hidden inside the new minimal layout, but keeping for very small screens if needed, replacing text colors */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 glass border-t border-cinema-border flex items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              pathname === href ? 'text-cinema-rose' : 'text-cinema-muted'
            }`}
          >
            <Icon size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
