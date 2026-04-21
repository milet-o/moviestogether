'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'
import { useRouter } from 'next/navigation'

interface WatchlistItem {
  id: string
  imdb_id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  plot: string | null
  imdb_rating: string | null
  created_at?: string
  profiles?: { full_name: string; avatar_url: string | null }
}

interface WatchedItem {
  id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  watched_at: string
  reviews?: { user_id: string; rating: number | null }[]
}

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('')
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null)
  
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [recentWatched, setRecentWatched] = useState<WatchedItem[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    setUserName(profile?.full_name ?? user.email ?? '')
    setUserAvatar(profile?.avatar_url ?? null)

    const { data: couple } = await supabase.from('couples').select('id, user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle()

    if (!couple) { router.push('/couple'); return }
    setCoupleId(couple.id)

    const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
    const { data: partner } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', partnerId).single()
    setPartnerName(partner?.full_name ?? '')
    setPartnerAvatar(partner?.avatar_url ?? null)

    // Watchlist
    const { data: wl } = await supabase
      .from('watchlist')
      .select('*, profiles:added_by(full_name, avatar_url)')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: true })

    setWatchlist(wl ?? [])

    // Recent watched
    const { data: watched } = await supabase
      .from('watched')
      .select('*, reviews(user_id, rating)')
      .eq('couple_id', couple.id)
      .order('watched_at', { ascending: false })
      .limit(10) // show up to 10 recently watched

    setRecentWatched(watched ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
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
    setWatchlist(prev => prev.filter(w => w.id !== item.id))
    setActionLoading(null)
    load() // Refresh history 
  }

  async function removeItem(id: string) {
    setActionLoading(id)
    await supabase.from('watchlist').delete().eq('id', id)
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cinema-rose" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-8 pt-20 md:pt-24 w-full">
      <Navbar 
        user={{ name: userName, avatar: userAvatar }} 
        partner={{ name: partnerName, avatar: partnerAvatar }}
        onSearch={() => setSearchOpen(true)} 
      />

      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 md:px-12 fade-in">
        
        {/* Simple Add Button */}
        <div className="mb-12 flex justify-center">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-cinema-surface border-2 border-cinema-border hover:border-cinema-rose hover:text-cinema-rose hover:shadow-lg text-cinema-text text-sm font-bold uppercase tracking-wider px-8 py-4 rounded-full transition-all duration-300"
            >
              <Plus size={18} /> Procurar e Adicionar
            </button>
        </div>

        {/* Watchlist Grid */}
        <div className="mb-16">
          <h2 className="text-xl font-bold uppercase tracking-widest text-cinema-text mb-6 border-b border-cinema-border pb-2 border-dashed">
            Nossa Fila ({watchlist.length})
          </h2>
          {watchlist.length === 0 ? (
            <p className="text-cinema-muted text-center py-10">A fila está vazia. Comecem a buscar juntos!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {watchlist.map(item => (
                <div key={item.id} className="flex flex-col group relative">
                  <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-cinema-surface border border-cinema-border shadow-sm group-hover:shadow-md transition-all relative">
                    {item.poster_url ? (
                      <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
                    ) : (
                      <div className="flex w-full h-full items-center justify-center text-cinema-muted bg-gray-100">Sem Poster</div>
                    )}
                    
                    {/* Hover Card Actions */}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pb-3">
                         <button
                          onClick={() => markWatched(item)}
                          disabled={actionLoading === item.id}
                          className="w-full bg-cinema-surface text-cinema-text text-xs font-bold uppercase tracking-wider py-1.5 rounded disabled:opacity-50 hover:bg-cinema-rose hover:text-white transition-colors mb-1 shadow-sm"
                        >
                          {actionLoading === item.id ? '...' : 'Assistido'}
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={actionLoading === item.id}
                          className="w-full bg-white/20 hover:bg-red-500/80 text-white text-[10px] uppercase font-bold py-1 rounded transition-colors"
                        >
                          Remover
                        </button>
                    </div>
                  </div>
                  
                  {/* Poster Meta */}
                  <div className="mt-2 flex flex-col">
                    <p className="text-sm font-bold text-cinema-text line-clamp-1 leading-tight">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {item.profiles?.avatar_url ? (
                        <Image src={item.profiles.avatar_url} width={14} height={14} alt="" className="rounded-full" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-cinema-rose/20 text-[8px] font-bold text-cinema-rose flex justify-center items-center">
                          {item.profiles?.full_name?.[0]}
                        </div>
                      )}
                      <span className="text-[10px] font-medium text-cinema-muted uppercase tracking-wider">
                        Adicionado por {item.profiles?.full_name?.split(' ')[0] || '?' }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diário / Assistidos Recentes */}
        <div className="mb-16">
          <h2 className="text-xl font-bold uppercase tracking-widest text-cinema-text mb-6 border-b border-cinema-border pb-2 border-dashed">
            Diário Recente
          </h2>
          {recentWatched.length === 0 ? (
            <p className="text-cinema-muted text-center py-10">Vocês ainda não registraram nenhum filme assistido.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {recentWatched.map(item => {
                  const myRating = item.reviews?.find(r => r.user_id === userId)?.rating
                  const partnerRating = item.reviews?.find(r => r.user_id !== userId)?.rating
                  
                  return (
                    <div key={item.id} className="flex flex-col group">
                      <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-cinema-surface border border-cinema-border shadow-sm group-hover:shadow-md transition-all relative grayscale-[20%] group-hover:grayscale-0">
                        {item.poster_url ? (
                          <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
                        ) : (
                          <div className="flex w-full h-full items-center justify-center text-cinema-muted bg-gray-100">Sem Poster</div>
                        )}
                      </div>
                      
                      {/* Poster Meta */}
                      <div className="mt-2 flex flex-col">
                        <p className="text-sm font-bold text-cinema-text line-clamp-1 leading-tight">{item.title}</p>
                        
                        {/* Data Logs */}
                        <p className="text-[10px] font-semibold text-cinema-muted uppercase tracking-wider mt-1">
                          Visto em: {new Date(item.watched_at).toLocaleDateString('pt-BR')}
                        </p>

                        {/* Notas do casal lado a lado */}
                        <div className="flex items-center gap-2 mt-1.5 w-full bg-cinema-surface border border-cinema-border rounded-md px-2 py-1 shadow-sm">
                           {/* Eu */}
                           <div className="flex items-center gap-1 flex-1 overflow-hidden" title={userName}>
                              {userAvatar ? (
                                <Image src={userAvatar} width={10} height={10} alt="" className="rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-cinema-muted/20 flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-0.5" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                                 {myRating ? (
                                   [...Array(5)].map((_, i) => <Star key={i} size={10} className={i < myRating ? "fill-cinema-gold text-cinema-gold" : "text-cinema-border"} />)
                                 ) : <span className="text-[10px] text-cinema-muted">?</span>}
                              </div>
                           </div>
                           
                           {/* Parceiro */}
                           <div className="flex items-center gap-1 flex-1 overflow-hidden" title={partnerName}>
                              {partnerAvatar ? (
                                <Image src={partnerAvatar} width={10} height={10} alt="" className="rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-cinema-muted/20 flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-0.5" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                                 {partnerRating ? (
                                    [...Array(5)].map((_, i) => <Star key={i} size={10} className={i < partnerRating ? "fill-cinema-rose text-cinema-rose" : "text-cinema-border"} />)
                                 ) : <span className="text-[10px] text-cinema-muted">?</span>}
                              </div>
                           </div>
                        </div>

                      </div>
                    </div>
                  )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
