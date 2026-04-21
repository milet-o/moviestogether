'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Star, BookMarked, Film, TrendingUp, Plus, Loader2, ChevronRight, CheckCircle, Trash2, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
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

interface Stats {
  total: number
  avgRating: number
  favoriteGenre: string
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
  const [stats, setStats] = useState<Stats>({ total: 0, avgRating: 0, favoriteGenre: '—' })
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
      .limit(8)

    setRecentWatched(watched ?? [])

    // Stats
    const { data: allWatched } = await supabase.from('watched').select('genre').eq('couple_id', couple.id)
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating, watched:watched_id(couple_id)')
      .eq('watched.couple_id', couple.id)
      .not('rating', 'is', null)

    const total = allWatched?.length ?? 0
    const ratings = allReviews?.map(r => r.rating).filter(Boolean) as number[] ?? []
    const avgRating = ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0

    const genreCounts: Record<string, number> = {}
    allWatched?.forEach(w => {
      w.genre?.split(',').forEach((g: string) => {
        const genre = g.trim()
        if (genre) genreCounts[genre] = (genreCounts[genre] ?? 0) + 1
      })
    })
    const favoriteGenre = Object.entries(genreCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '—'

    setStats({ total, avgRating, favoriteGenre })
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
    load() // Refresh stats and history
  }

  async function removeItem(id: string) {
    setActionLoading(id)
    await supabase.from('watchlist').delete().eq('id', id)
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart size={36} className="text-cinema-rose fill-cinema-rose mx-auto mb-4 animate-pulse-glow" />
          <Loader2 size={24} className="animate-spin text-cinema-accent mx-auto" />
        </div>
      </div>
    )
  }

  const nextUp = watchlist[0] ?? null
  const queueItems = watchlist.slice(1, 10)

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-16 w-full max-w-[100vw] overflow-x-hidden">
      <Navbar user={{ name: userName, avatar: userAvatar }} onSearch={() => setSearchOpen(true)} />

      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      {/* Main Container - Ensuring w-full and centered content while not squishing into a corner */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 lg:py-10">

        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 fade-in">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} width={44} height={44} className="rounded-full border-2 border-cinema-bg shadow-lg z-10" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-cinema-accent/30 border-2 border-cinema-bg shadow-lg flex items-center justify-center text-cinema-accent text-sm font-bold z-10">
                  {userName?.[0] ?? '?'}
                </div>
              )}
              {partnerAvatar ? (
                <Image src={partnerAvatar} alt={partnerName} width={44} height={44} className="rounded-full border-2 border-cinema-bg shadow-lg z-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-cinema-rose/30 border-2 border-cinema-bg shadow-lg flex items-center justify-center text-cinema-rose text-sm font-bold z-0">
                  {partnerName?.[0] ?? '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-cinema-text font-bold text-lg md:text-xl">{userName} & {partnerName}</p>
              <p className="text-cinema-muted text-sm flex items-center gap-1.5">
                Bem-vindos de volta <Heart size={14} className="text-cinema-rose fill-cinema-rose" />
              </p>
            </div>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-cinema-accent/10 hover:bg-cinema-accent/20 border border-cinema-accent/30 text-cinema-accent text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-cinema-accent/10"
          >
            <Plus size={16} /> Adicionar Filme
          </button>
        </div>

        {/* Home Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
          
          {/* Main Column - Hero & Queue */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* HERO — Next Up */}
            <div className="flex flex-col gap-4 fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex justify-between items-end">
                <h2 className="text-cinema-text font-bold text-xl flex items-center gap-2">
                  <PlayIcon className="text-cinema-accent" />
                  Sessão Principal
                </h2>
              </div>
              
              {nextUp ? (
                <div className="relative rounded-3xl overflow-hidden glass shadow-2xl group w-full" style={{ minHeight: '320px' }}>
                  {/* Blurred poster background */}
                  {nextUp.poster_url && (
                    <div className="absolute inset-0 z-0">
                      <Image src={nextUp.poster_url} alt="" fill className="object-cover blur-[40px] opacity-25 scale-110" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-cinema-surface via-cinema-surface/90 to-transparent z-0" />

                  <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6 md:p-8 h-full">
                    {/* Poster */}
                    <div className="w-32 md:w-48 lg:w-56 mx-auto md:mx-0 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border flex items-center justify-center border-cinema-border/50 poster-hover bg-cinema-card"
                      style={{ aspectRatio: '2/3' }}>
                      {nextUp.poster_url ? (
                        <Image src={nextUp.poster_url} alt={nextUp.title} fill className="object-cover" sizes="(max-width: 768px) 128px, 224px" priority />
                      ) : (
                         <Film className="w-12 h-12 text-cinema-muted opacity-50" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
                      <div className="inline-flex items-center gap-2 mb-3 mx-auto md:mx-0">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-cinema-accent bg-cinema-accent/10 px-2.5 py-1 rounded-full border border-cinema-accent/20 backdrop-blur-sm">
                          Próximo na fila
                        </span>
                      </div>
                      
                      <h3 className="text-cinema-text font-bold text-2xl md:text-4xl leading-tight mb-2 tracking-tight">
                        {nextUp.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 mt-1 text-sm text-cinema-muted font-medium mb-4">
                        {nextUp.year && <span>{nextUp.year}</span>}
                        {nextUp.genre && <><span className="w-1 h-1 rounded-full bg-cinema-border"></span><span>{nextUp.genre.split(',').slice(0, 2).join(', ')}</span></>}
                        {nextUp.imdb_rating && nextUp.imdb_rating !== 'N/A' && (
                          <><span className="w-1 h-1 rounded-full bg-cinema-border"></span><span className="flex items-center gap-1"><Star size={14} className="text-cinema-gold fill-cinema-gold" /> {nextUp.imdb_rating}</span></>
                        )}
                      </div>
                      
                      {nextUp.plot && (
                        <p className="text-cinema-text/80 text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl mb-6 font-light">
                          {nextUp.plot}
                        </p>
                      )}
                      
                      <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => markWatched(nextUp)}
                          disabled={actionLoading === nextUp.id}
                          className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white text-sm font-semibold px-6 py-3 rounded-xl btn-glow transition-all disabled:opacity-50 shadow-lg shadow-cinema-accent/20"
                        >
                          {actionLoading === nextUp.id ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                          Assistimos!
                        </button>
                        <button
                          onClick={() => removeItem(nextUp.id)}
                          disabled={actionLoading === nextUp.id}
                          className="flex-1 sm:flex-none flex justify-center items-center gap-2 glass border border-cinema-border hover:border-red-500/50 hover:bg-red-500/10 text-cinema-text hover:text-red-400 text-sm font-medium px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                          {actionLoading === nextUp.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          Remover
                        </button>
                      </div>
                      
                      {nextUp.profiles && (
                        <p className="text-cinema-muted/60 text-xs mt-4">
                          Dica do(a) <strong className="text-cinema-muted">{nextUp.profiles.full_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-3xl p-10 text-center w-full shadow-lg border-dashed border-2 border-cinema-border">
                  <div className="w-20 h-20 bg-cinema-card rounded-full flex items-center justify-center mx-auto mb-5 border border-cinema-border shadow-inner">
                    <Film size={32} className="text-cinema-muted" />
                  </div>
                  <h3 className="text-cinema-text font-bold text-2xl mb-2">Cineminha Vazio</h3>
                  <p className="text-cinema-muted text-base mb-8 max-w-md mx-auto">
                    A fila está vazia. Busquem um filme de terror, romance ou comédia para assistirem grudadinhos.
                  </p>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="inline-flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white font-semibold px-8 py-3.5 rounded-xl btn-glow transition-all shadow-lg shadow-cinema-accent/20"
                  >
                    <Search size={18} /> Procurar nosso próximo filme
                  </button>
                </div>
              )}
            </div>

            {/* WATCHLIST ROW - SUA FILA */}
            {queueItems.length > 0 && (
              <div className="flex flex-col gap-4 mt-2 fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-cinema-text font-bold text-lg flex items-center gap-2">
                    <BookMarked size={18} className="text-cinema-accent" />
                    Sua Fila
                  </h2>
                  <Link href="/watchlist" className="flex items-center gap-1 text-cinema-muted hover:text-cinema-accent text-sm font-medium transition-colors">
                    Ver todos ({watchlist.length}) <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="scroll-x flex gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {queueItems.map((item) => (
                    <div key={item.id} className="snap-start flex-shrink-0 w-[140px] md:w-[160px] group flex flex-col gap-3">
                      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-cinema-card/50 border border-cinema-border/50 shadow-md group-hover:border-cinema-accent/50 group-hover:shadow-cinema-accent/10 transition-all duration-300">
                        {item.poster_url ? (
                          <Image src={item.poster_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="160px" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-cinema-muted">🎬</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <div className="flex gap-2 w-full">
                             <button
                              onClick={(e) => { e.preventDefault(); markWatched(item); }}
                              disabled={actionLoading === item.id}
                              className="flex-1 bg-cinema-accent/90 hover:bg-cinema-accent text-white py-1.5 rounded-lg flex justify-center transition-colors disabled:opacity-50"
                              title="Marcar Assistido"
                            >
                              {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); removeItem(item.id); }}
                              disabled={actionLoading === item.id}
                              className="bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg flex justify-center transition-colors disabled:opacity-50"
                              title="Remover"
                            >
                               {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-cinema-text text-sm font-semibold truncate px-1">{item.title}</p>
                        <p className="text-cinema-muted text-xs truncate px-1 mt-0.5">{item.genre?.split(',')[0]} {item.year ? `• ${item.year}` : ''}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Plus Card */}
                  <div 
                    onClick={() => setSearchOpen(true)}
                    className="snap-start flex-shrink-0 w-[140px] md:w-[160px] aspect-[2/3] rounded-2xl border-2 border-dashed border-cinema-border hover:border-cinema-accent/50 hover:bg-cinema-accent/5 flex flex-col items-center justify-center cursor-pointer transition-all text-cinema-muted hover:text-cinema-accent group"
                  >
                     <div className="w-12 h-12 bg-cinema-surface rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus size={20} />
                     </div>
                     <span className="text-xs font-semibold">Adicionar Novo</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats & History */}
          <div className="lg:col-span-4 flex flex-col gap-8 fade-in" style={{ animationDelay: '0.3s' }}>
            
            {/* Stats */}
            <div className="flex flex-col gap-4">
               <h2 className="text-cinema-text font-bold text-lg flex items-center gap-2">
                 <TrendingUp size={18} className="text-cinema-green" />
                 Métricas do Casal
               </h2>
               <div className="grid grid-cols-2 gap-3">
                 <div className="col-span-2 glass flex items-center justify-between p-4 rounded-2xl shadow-sm border border-cinema-border/60">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-cinema-accent/10 flex items-center justify-center">
                       <Film size={18} className="text-cinema-accent" />
                     </div>
                     <div>
                       <p className="text-cinema-muted text-xs font-medium uppercase tracking-wider">Filmes Assistidos</p>
                       <p className="text-cinema-text font-bold text-2xl">{stats.total}</p>
                     </div>
                   </div>
                 </div>
                 
                 <div className="glass flex flex-col p-4 rounded-2xl shadow-sm border border-cinema-border/60 justify-center items-start">
                    <div className="w-8 h-8 rounded-full bg-cinema-gold/10 flex items-center justify-center mb-2">
                       <Star size={14} className="text-cinema-gold" />
                    </div>
                    <p className="text-cinema-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Média Geral</p>
                    <p className="text-cinema-text font-bold text-xl">{stats.avgRating ? `${stats.avgRating}` : '—'}</p>
                 </div>
                 
                 <div className="glass flex flex-col p-4 rounded-2xl shadow-sm border border-cinema-border/60 justify-center items-start">
                    <div className="w-8 h-8 rounded-full bg-cinema-rose/10 flex items-center justify-center mb-2">
                       <Heart size={14} className="text-cinema-rose" />
                    </div>
                    <p className="text-cinema-muted text-[10px] font-medium uppercase tracking-wider mb-0.5">Top Gênero</p>
                    <p className="text-cinema-text font-bold text-sm leading-tight truncate w-full">{stats.favoriteGenre}</p>
                 </div>
               </div>
            </div>

            {/* Recent watched */}
            {recentWatched.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-cinema-text font-bold text-lg flex items-center gap-2">
                    <HistoryIcon className="text-cinema-muted" />
                    Últimas Sessões
                  </h2>
                  <Link href="/history" className="text-cinema-muted hover:text-cinema-accent text-sm font-medium transition-colors">
                    Histórico
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 md:gap-4">
                  {recentWatched.slice(0, 4).map(item => {
                    const myR = item.reviews?.find(r => r.user_id === userId)?.rating
                    const partnerR = item.reviews?.find(r => r.user_id !== userId)?.rating
                    
                    return (
                      <Link
                        key={item.id}
                        href="/history"
                        className="group flex flex-col gap-2"
                      >
                        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-cinema-card border border-cinema-border/40 group-hover:border-cinema-accent/30 transition-all shadow-sm group-hover:shadow-md">
                          {item.poster_url ? (
                            <Image src={item.poster_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-cinema-muted opacity-50">🎬</div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cinema-bg to-transparent pt-8 pb-2 px-2 flex justify-between items-end opacity-90">
                              <div className="flex gap-1 items-center">
                                {myR ? <span className="text-cinema-accent text-[10px] font-bold bg-cinema-accent/20 px-1 rounded flex gap-0.5 items-center"><Star size={8} className="fill-cinema-accent" />{myR}</span> : null}
                                {partnerR ? <span className="text-cinema-rose text-[10px] font-bold bg-cinema-rose/20 px-1 rounded flex gap-0.5 items-center"><Star size={8} className="fill-cinema-rose" />{partnerR}</span> : null}
                              </div>
                          </div>
                        </div>
                        <p className="text-cinema-text text-xs font-semibold line-clamp-1 group-hover:text-cinema-accent transition-colors">{item.title}</p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M7 4v16l13-8z" />
    </svg>
  )
}

function HistoryIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}
