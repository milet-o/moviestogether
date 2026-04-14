'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, History, Star, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'
import RatingStars from '@/components/RatingStars'

interface WatchedItem {
  id: string
  imdb_id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  plot: string | null
  imdb_rating: string | null
  watched_at: string
  reviews?: Review[]
}

interface Review {
  id: string
  user_id: string
  rating: number | null
  comment: string | null
  profiles?: { full_name: string; avatar_url: string | null }
}

type SortKey = 'watched_at' | 'avg_rating' | 'title'
type FilterRating = 0 | 1 | 2 | 3 | 4 | 5

export default function HistoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<WatchedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WatchedItem | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('watched_at')
  const [filterRating, setFilterRating] = useState<FilterRating>(0)
  const [filterGenre, setFilterGenre] = useState('')
  const [showFilters, setShowFilters] = useState(false)

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

    const { data: watched } = await supabase
      .from('watched')
      .select('*')
      .eq('couple_id', couple.id)
      .order('watched_at', { ascending: false })

    if (!watched) { setLoading(false); return }

    // Fetch reviews for each watched item
    const watchedIds = watched.map(w => w.id)
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .in('watched_id', watchedIds)

    const itemsWithReviews = watched.map(w => ({
      ...w,
      reviews: reviews?.filter(r => r.watched_id === w.id) ?? [],
    }))

    setItems(itemsWithReviews)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedItem) {
      const myReview = selectedItem.reviews?.find(r => r.user_id === userId)
      setMyRating(myReview?.rating ?? 0)
      setMyComment(myReview?.comment ?? '')
    }
  }, [selectedItem, userId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (e.key === 'Escape') { setSelectedItem(null); setSearchOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function saveReview() {
    if (!selectedItem || !userId) return
    setReviewLoading(true)

    await supabase.from('reviews').upsert({
      watched_id: selectedItem.id,
      user_id: userId,
      rating: myRating || null,
      comment: myComment || null,
    }, { onConflict: 'watched_id,user_id' })

    await load()
    setSelectedItem(null)
    setReviewLoading(false)
  }

  // Filtering and sorting
  const genres = [...new Set(items.flatMap(i => i.genre?.split(',').map(g => g.trim()) ?? []).filter(Boolean))]

  const filtered = items
    .filter(item => {
      if (filterGenre && !item.genre?.includes(filterGenre)) return false
      if (filterRating > 0) {
        const myR = item.reviews?.find(r => r.user_id === userId)?.rating ?? 0
        if (myR < filterRating) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'avg_rating') {
        const aRevs = a.reviews ?? []
        const bRevs = b.reviews ?? []
        const avgA = aRevs.length ? aRevs.reduce((s, r) => s + (r.rating ?? 0), 0) / aRevs.length : 0
        const avgB = bRevs.length ? bRevs.reduce((s, r) => s + (r.rating ?? 0), 0) / bRevs.length : 0
        return avgB - avgA
      }
      return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()
    })

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
      <Navbar user={{ name: userName, avatar: userAvatar }} onSearch={() => setSearchOpen(true)} />

      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-lg glass rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Movie header */}
            <div className="relative h-40 overflow-hidden">
              {selectedItem.poster_url && (
                <Image src={selectedItem.poster_url} alt={selectedItem.title} fill className="object-cover blur-sm opacity-40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cinema-surface" />
              <div className="absolute bottom-0 left-0 p-5 flex gap-4 items-end">
                {selectedItem.poster_url && (
                  <div className="relative w-16 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                    <Image src={selectedItem.poster_url} alt={selectedItem.title} fill className="object-cover" />
                  </div>
                )}
                <div>
                  <h2 className="text-cinema-text font-bold text-xl">{selectedItem.title}</h2>
                  <p className="text-cinema-muted text-sm">{selectedItem.year} {selectedItem.genre && `• ${selectedItem.genre.split(',')[0]}`}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-cinema-muted hover:text-cinema-text">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {/* Existing reviews */}
              {selectedItem.reviews && selectedItem.reviews.filter(r => r.user_id !== userId).length > 0 && (
                <div className="mb-5">
                  {selectedItem.reviews.filter(r => r.user_id !== userId).map(r => (
                    <div key={r.id} className="bg-cinema-bg rounded-xl p-3 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        {r.profiles?.avatar_url ? (
                          <Image src={r.profiles.avatar_url} alt="" width={20} height={20} className="rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-cinema-rose/30 text-cinema-rose text-xs flex items-center justify-center">
                            {r.profiles?.full_name?.[0] ?? '?'}
                          </div>
                        )}
                        <span className="text-cinema-muted text-xs">{r.profiles?.full_name}</span>
                      </div>
                      {r.rating && <RatingStars value={r.rating} readOnly size={14} />}
                      {r.comment && <p className="text-cinema-muted text-xs mt-1 italic">&ldquo;{r.comment}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* My review */}
              <div>
                <p className="text-cinema-text text-sm font-semibold mb-3">Sua avaliação</p>
                <RatingStars value={myRating} onChange={setMyRating} size={28} />
                <textarea
                  className="input-cinema mt-3 resize-none"
                  rows={3}
                  placeholder="O que achou? (opcional)"
                  value={myComment}
                  onChange={e => setMyComment(e.target.value)}
                />
                <button
                  onClick={saveReview}
                  disabled={reviewLoading}
                  className="w-full mt-3 bg-cinema-accent hover:bg-cinema-accent-hover text-white font-semibold py-2.5 rounded-xl btn-glow transition-colors disabled:opacity-70"
                >
                  {reviewLoading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                  Salvar avaliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cinema-text flex items-center gap-2">
              <History size={22} className="text-cinema-rose" />
              Histórico
            </h1>
            <p className="text-cinema-muted text-sm mt-0.5">{filtered.length} de {items.length} filmes</p>
          </div>

          <div className="flex gap-2">
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="input-cinema pr-8 text-xs appearance-none cursor-pointer"
              >
                <option value="watched_at">Mais recente</option>
                <option value="avg_rating">Melhor nota</option>
                <option value="title">Título A-Z</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-cinema-muted pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                showFilters || filterRating || filterGenre
                  ? 'bg-cinema-accent/10 border-cinema-accent/30 text-cinema-accent'
                  : 'glass border-cinema-border text-cinema-muted hover:text-cinema-text'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {(filterRating > 0 || filterGenre) && (
                <span className="w-4 h-4 bg-cinema-accent rounded-full text-white text-xs flex items-center justify-center">
                  {(filterRating > 0 ? 1 : 0) + (filterGenre ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-4 fade-in">
            <div>
              <p className="text-cinema-muted text-xs mb-2">Nota mínima</p>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setFilterRating(n as FilterRating)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      filterRating === n
                        ? 'bg-cinema-gold text-black'
                        : 'bg-cinema-bg text-cinema-muted hover:text-cinema-text'
                    }`}
                  >
                    {n === 0 ? 'All' : `${n}★`}
                  </button>
                ))}
              </div>
            </div>

            {genres.length > 0 && (
              <div>
                <p className="text-cinema-muted text-xs mb-2">Gênero</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterGenre('')}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${!filterGenre ? 'bg-cinema-accent text-white' : 'bg-cinema-bg text-cinema-muted hover:text-cinema-text'}`}
                  >
                    Todos
                  </button>
                  {genres.slice(0, 8).map(g => (
                    <button
                      key={g}
                      onClick={() => setFilterGenre(filterGenre === g ? '' : g)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${filterGenre === g ? 'bg-cinema-accent text-white' : 'bg-cinema-bg text-cinema-muted hover:text-cinema-text'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-cinema-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <History size={48} className="text-cinema-border mx-auto mb-4" />
            <h3 className="text-cinema-text font-semibold">
              {items.length === 0 ? 'Nenhum filme assistido ainda' : 'Nenhum resultado'}
            </h3>
            <p className="text-cinema-muted text-sm mt-2">
              {items.length === 0 ? 'Marque filmes da watchlist como assistidos!' : 'Tente outros filtros'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item, idx) => {
              const myReview = item.reviews?.find(r => r.user_id === userId)
              const partnerReview = item.reviews?.find(r => r.user_id !== userId)
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer fade-in"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-cinema-card poster-hover">
                    {item.poster_url ? (
                      <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="(max-width:640px) 150px, 200px" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-cinema-muted text-2xl">🎬</div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      <div className="space-y-1">
                        {myReview?.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={10} className="star-filled fill-current" />
                            <span className="text-cinema-gold text-xs font-bold">{myReview.rating}/5</span>
                            <span className="text-cinema-muted text-xs">meu</span>
                          </div>
                        )}
                        {partnerReview?.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={10} className="star-filled fill-current" />
                            <span className="text-cinema-rose text-xs font-bold">{partnerReview.rating}/5</span>
                            <span className="text-cinema-muted text-xs">parceiro</span>
                          </div>
                        )}
                        {!myReview && (
                          <span className="text-cinema-accent text-xs">Avaliar →</span>
                        )}
                      </div>
                    </div>

                    {/* Rating badge */}
                    {myReview?.rating && (
                      <div className="absolute top-2 right-2 bg-cinema-gold/90 text-black text-xs font-bold px-1.5 py-0.5 rounded-md">
                        {myReview.rating}★
                      </div>
                    )}
                  </div>

                  <div className="mt-2 px-0.5">
                    <p className="text-cinema-text text-sm font-medium leading-tight line-clamp-1">{item.title}</p>
                    <p className="text-cinema-muted text-xs mt-0.5">
                      {new Date(item.watched_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </p>
                    {/* Dual ratings */}
                    {(myReview || partnerReview) && (
                      <div className="flex gap-2 mt-1">
                        {myReview?.rating && (
                          <span className="text-xs text-cinema-gold">{'★'.repeat(myReview.rating)}</span>
                        )}
                        {partnerReview?.rating && (
                          <span className="text-xs text-cinema-rose">{'★'.repeat(partnerReview.rating)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
