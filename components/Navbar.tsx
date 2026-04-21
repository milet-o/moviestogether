'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookMarked, History, LogOut, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  user: { name: string; avatar: string | null }
  partner?: { name: string; avatar: string | null }
  onSearch?: () => void
}

const navItems = [
  { href: '/', label: 'Nossa Fila', icon: Home },
  { href: '/history', label: 'Diário (Já Vimos)', icon: History },
]

export default function Navbar({ user, partner, onSearch }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const firstName = user.name?.split(' ')[0] || 'Você'
  const partnerFirstName = partner?.name?.split(' ')[0] || ''

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="win95-window w-full shadow-md pointer-events-auto border-t-0 border-l-0 border-r-0">
        
        {/* Title Bar */}
        <div className="win95-titlebar font-win95 text-[22px] py-1 px-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/80 shrink-0 w-4 h-4 shadow-[1px_1px_rgba(0,0,0,0.5)]"></span>
            <span className="font-bold tracking-wider">Nosso Diário de Filmes - {partnerFirstName ? `${firstName} & ${partnerFirstName}` : firstName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="win95-btn flex items-center justify-center w-7 h-7 p-0 leading-none" onClick={onSearch}>?</button>
            <button className="win95-btn flex items-center justify-center w-7 h-7 p-0 leading-none">_</button>
            <button className="win95-btn flex items-center justify-center w-7 h-7 p-0 pb-1 leading-none">□</button>
            <button className="win95-btn flex items-center justify-center w-7 h-7 p-0 font-bold leading-none text-red-700" onClick={signOut}>X</button>
          </div>
        </div>

        {/* Toolbar / Menu */}
        <div className="py-2 px-3 flex items-center gap-3 font-win95 text-xl bg-[#c0c0c0] border-t border-[#dfdfdf]">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href}>
                <button 
                  className={`win95-btn flex items-center gap-1.5 px-3 py-0.5 ${isActive ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNjMGMwYzAiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjODA4MDgwIi8+PC9zdmc+")] border-color-[#808080_#ffffff_#ffffff_#808080] box-shadow-[inset_1px_1px_0px_#808080]' : ''}`}
                  style={isActive ? { borderColor: '#808080 #ffffff #ffffff #808080', boxShadow: 'inset 1px 1px 0px #808080' } : {}}
                >
                  <Icon size={14} className={isActive ? 'text-black' : 'text-black'} strokeWidth={2.5}/>
                  {label}
                </button>
              </Link>
            )
          })}
          
          <button 
            className="win95-btn flex items-center gap-1.5 px-3 py-0.5 ml-auto"
            onClick={onSearch}
          >
            <Search size={14} strokeWidth={2.5}/> Buscar
          </button>
        </div>
        
      </div>
    </div>
  )
}
