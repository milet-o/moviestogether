'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Star, BookMarked, Film, TrendingUp, Plus, Loader2, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'
import { useRouter } from 'next/navigation'

interface WatchlistItem {
  id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  plot: string | null
  imdb_rating: string | null
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
  const [nextUp, setNextUp] = useState<WatchlistItem | null>(null)
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [recentWatched, setRecentWatched] = useState<WatchedItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, avgRating: 0, favoriteGenre: '—' })
  const [searchOpen, setSearchOpen] = useState(false)

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

    // Watchlist: next up
    const { data: wl } = await supabase
      .from('watchlist')
      .select('*, profiles:added_by(full_name, avatar_url)')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: true })

    setNextUp(wl?.[0] ?? null)
    setWatchlistCount(wl?.length ?? 0)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart size={32} className="text-cinema-rose fill-cinema-rose mx-auto mb-3 animate-pulse" />
          <Loader2 size={20} className="animate-spin text-cinema-accent mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
      <Navbar user={{ name: userName, avatar: userAvatar }} onSearch={() => setSearchOpen(true)} />

      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Couple greeting */}
        <div className="flex items-center gap-3 mb-8 fade-in">
          <div className="flex -space-x-2">
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} width={36} height={36} className="rounded-full border-2 border-cinema-bg" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-cinema-accent/30 border-2 border-cinema-bg flex items-center justify-center text-cinema-accent text-sm font-bold">
                {userName?.[0] ?? '?'}
              </div>
            )}
            {partnerAvatar ? (
              <Image src={partnerAvatar} alt={partnerName} width={36} height={36} className="rounded-full border-2 border-cinema-bg" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-cinema-rose/30 border-2 border-cinema-bg flex items-center justify-center text-cinema-rose text-sm font-bold">
                {partnerName?.[0] ?? '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-cinema-text font-semibold text-sm">{userName} & {partnerName}</p>
            <p className="text-cinema-muted text-xs">Bem-vindos de volta 🎬</p>
          </div>
        </div>

        {/* HERO — Next Up */}
        {nextUp ? (
          <div className="relative rounded-3xl overflow-hidden mb-8 glass fade-in" style={{ minHeight: '260px' }}>
            {/* Blurred poster background */}
            {nextUp.poster_url && (
              <div className="absolute inset-0">
                <Image src={nextUp.poster_url} alt="" fill className="object-cover blur-2xl opacity-20 scale-110" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-surface/95 via-cinema-surface/80 to-transparent" />

            <div className="relative z-10 flex gap-6 p-6 md:p-8">
              {/* Poster */}
              {nextUp.poster_url && (
                <div className="relative w-28 md:w-36 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl"
                  style={{ aspectRatio: '2/3' }}>
                  <Image src={nextUp.poster_url} alt={nextUp.title} fill className="object-cover" sizes="144px" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-cinema-accent bg-cinema-accent/10 px-2 py-0.5 rounded-full border border-cinema-accent/20">
                    ▶ Próximo na fila
                  </span>
                </div>
                <h2 className="text-cinema-text font-bold text-xl md:text-3xl leading-tight">{nextUp.title}</h2>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-cinema-muted">
                  {nextUp.year && <span>{nextUp.year}</span>}
                  {nextUp.genre && <span>• {nextUp.genre.split(',').slice(0,2).join(', ')}</span>}
                  {nextUp.imdb_rating && nextUp.imdb_rating !== 'N/A' && (
                    <span>• ⭐ {nextUp.imdb_rating} IMDb</span>
                  )}
                </div>
                {nextUp.plot && (
                  <p className="text-cinema-muted text-sm mt-3 leading-relaxed line-clamp-2 md:line-clamp-3 max-w-xl">
                    {nextUp.plot}
                  </p>
                )}
                {nextUp.profiles && (
                  <p className="text-cinema-muted text-xs mt-3">
                    Adicionado por <span className="text-cinema-accent">{nextUp.profiles.full_name}</span>
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <Link
                    href="/watchlist"
                    className="flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-xl btn-glow transition-colors"
                  >
                    <BookMarked size={16} /> Ver watchlist
                  </Link>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-2 glass border border-cinema-border hover:border-cinema-accent/60 text-cinema-text text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 mb-8 text-center fade-in">
            <Film size={40} className="text-cinema-border mx-auto mb-3" />
            <h2 className="text-cinema-text font-bold text-xl mb-1">Watchlist vazia</h2>
            <p className="text-cinema-muted text-sm mb-5">Que filme vocês querem assistir?</p>
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white font-semibold px-6 py-3 rounded-xl btn-glow transition-colors"
            >
              <Plus size={18} /> Buscar filmes
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8 fade-in">
          {[
            { icon: <Film size={18} className="text-cinema-accent" />, label: 'Assistidos', value: stats.total.toString() },
            { icon: <Star size={18} className="text-cinema-gold fill-cinema-gold" />, label: 'Nota média', value: stats.avgRating ? `${stats.avgRating}★` : '—' },
            { icon: <TrendingUp size={18} className="text-cinema-green" />, label: 'Gênero fav.', value: stats.favoriteGenre },
          ].map(({ icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">{icon}</div>
              <p className="text-cinema-text font-bold text-lg truncate">{value}</p>
              <p className="text-cinema-muted text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent watched */}
        {recentWatched.length > 0 && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-cinema-text font-bold text-lg flex items-center gap-2">
                <Heart size={18} className="text-cinema-rose fill-cinema-rose" />
                Últimos assistidos
              </h2>
              <Link href="/history" className="flex items-center gap-1 text-cinema-muted hover:text-cinema-accent text-xs transition-colors">
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>

            <div className="scroll-x flex gap-4 pb-4">
              {recentWatched.map(item => {
                const myR = item.reviews?.find(r => r.user_id === userId)?.rating
                const partnerR = item.reviews?.find(r => r.user_id !== userId)?.rating
                return (
                  <Link
                    key={item.id}
                    href="/history"
                    className="snap-start flex-shrink-0 w-32 group"
                  >
                    <div className="relative w-32 aspect-[2/3] rounded-xl overflow-hidden bg-cinema-card poster-hover">
                      {item.poster_url ? (
                        <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="128px" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-cinema-muted text-2xl">🎬</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <div className="space-y-0.5">
                          {myR && <p className="text-cinema-gold text-xs">{'★'.repeat(myR)}</p>}
                          {partnerR && <p className="text-cinema-rose text-xs">{'★'.repeat(partnerR)}</p>}
                        </div>
                      </div>
                    </div>
                    <p className="text-cinema-text text-xs font-medium mt-1.5 line-clamp-1">{item.title}</p>
                    <p className="text-cinema-muted text-xs">
                      {new Date(item.watched_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Watchlist count chip */}
        {watchlistCount > 1 && (
          <Link
            href="/watchlist"
            className="mt-6 flex items-center justify-between glass rounded-2xl p-4 hover:border-cinema-accent/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cinema-accent/10 rounded-xl flex items-center justify-center">
                <BookMarked size={18} className="text-cinema-accent" />
              </div>
              <div>
                <p className="text-cinema-text font-semibold text-sm">{watchlistCount} filmes na fila</p>
                <p className="text-cinema-muted text-xs">Clique para ver a watchlist completa</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-cinema-muted group-hover:text-cinema-accent transition-colors" />
          </Link>
        )}
      </div>
    </div>
  )
}
