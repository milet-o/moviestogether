'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookMarked, CheckCircle, Trash2, Plus, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'

interface WatchlistItem {
  id: string
  imdb_id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  plot: string | null
  imdb_rating: string | null
  added_by: string | null
  created_at: string
  profiles?: { full_name: string; avatar_url: string | null }
}

export default function WatchlistPage() {
  const supabase = createClient()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    setUserName(profile?.full_name ?? user.email ?? '')
    setUserAvatar(profile?.avatar_url ?? null)

    const { data: couple } = await supabase.from('couples').select('id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle()
    if (!couple) { setLoading(false); return }
    setCoupleId(couple.id)

    const { data } = await supabase
      .from('watchlist')
      .select('*, profiles:added_by(full_name, avatar_url)')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: false })

    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()

    // Realtime subscription
    const channel = supabase.channel('watchlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load, supabase])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function markWatched(item: WatchlistItem) {
    if (!coupleId || !userId) return
    setActionLoading(item.id)

    await supabase.from('watched').insert({
      couple_id: coupleId,
      marked_by: userId,
      imdb_id: item.imdb_id,
      title: item.title,
      poster_url: item.poster_url,
      year: item.year,
      genre: item.genre,
      plot: item.plot,
      imdb_rating: item.imdb_rating,
    })

    await supabase.from('watchlist').delete().eq('id', item.id)
    setActionLoading(null)
  }

  async function removeItem(id: string) {
    setActionLoading(id)
    await supabase.from('watchlist').delete().eq('id', id)
    setActionLoading(null)
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
      <Navbar
        user={{ name: userName, avatar: userAvatar }}
        onSearch={() => setSearchOpen(true)}
      />

      {searchOpen && coupleId && userId && (
        <SearchModal
          isOpen={searchOpen}
          onClose={() => { setSearchOpen(false); load() }}
          coupleId={coupleId}
          userId={userId}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cinema-text flex items-center gap-2">
              <BookMarked size={22} className="text-cinema-accent" />
              Watchlist
            </h1>
            <p className="text-cinema-muted text-sm mt-0.5">{items.length} filme{items.length !== 1 ? 's' : ''} na lista</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 glass rounded-xl text-cinema-muted hover:text-cinema-text transition-colors" title="Atualizar">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-xl btn-glow transition-colors"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-cinema-accent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <BookMarked size={48} className="text-cinema-border mx-auto mb-4" />
            <h3 className="text-cinema-text font-semibold">Watchlist vazia</h3>
            <p className="text-cinema-muted text-sm mt-2 mb-6">Adicione filmes para assistir juntos!</p>
            <button
              onClick={() => setSearchOpen(true)}
              className="bg-cinema-accent hover:bg-cinema-accent-hover text-white font-semibold px-6 py-2.5 rounded-xl btn-glow transition-colors"
            >
              Buscar filmes
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="glass rounded-2xl p-4 flex gap-4 items-start group hover:border-cinema-accent/30 transition-colors fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                {/* Poster */}
                <div className="relative w-14 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-cinema-card">
                  {item.poster_url ? (
                    <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-cinema-muted text-xl">🎬</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-cinema-text font-semibold truncate">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-cinema-muted">
                    {item.year && <span>{item.year}</span>}
                    {item.genre && <span>• {item.genre.split(',')[0]}</span>}
                    {item.imdb_rating && item.imdb_rating !== 'N/A' && <span>• ⭐ {item.imdb_rating}</span>}
                  </div>
                  {item.plot && (
                    <p className="text-cinema-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">{item.plot}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {item.profiles?.avatar_url ? (
                      <Image src={item.profiles.avatar_url} alt="" width={16} height={16} className="rounded-full" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-cinema-accent/30 text-cinema-accent text-xs flex items-center justify-center">
                        {item.profiles?.full_name?.[0] ?? '?'}
                      </div>
                    )}
                    <span className="text-cinema-muted text-xs">
                      {item.profiles?.full_name ?? 'Você'} •{' '}
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => markWatched(item)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-1.5 bg-cinema-green/10 hover:bg-cinema-green/20 border border-cinema-green/20 text-cinema-green text-xs font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                    title="Marcar como assistido"
                  >
                    {actionLoading === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    <span className="hidden sm:inline">Assistido</span>
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={actionLoading === item.id}
                    className="p-2 text-cinema-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
