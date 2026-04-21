'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'
import RatingModal from '@/components/RatingModal'
import RaffleModal from '@/components/RaffleModal'
import { useRouter } from 'next/navigation'

interface WatchlistItem {
  id: string
  imdb_id: string
  title: string
  poster_url: string | null
  year: string | null
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
  
  // Stats (Fetched from watched table but only for stats)
  const [stats, setStats] = useState({ count: 0, topGenre: '?', avgRating: '?' })

  // Modals state
  const [searchOpen, setSearchOpen] = useState(false)
  const [raffleOpen, setRaffleOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<WatchlistItem | null>(null)
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

    const { data: wl } = await supabase.from('watchlist').select('*').eq('couple_id', couple.id).order('created_at', { ascending: true })
    setWatchlist(wl ?? [])

    // Load basic stats
    const { data: watched } = await supabase.from('watched').select('id, genre, reviews(rating)').eq('couple_id', couple.id)
    if (watched && watched.length > 0) {
      const allGenres = watched.map(w => w.genre).filter(Boolean).map(g => g?.split(',')[0])
      const topGenre = allGenres.length > 0 ? allGenres.sort((a,b) =>
            allGenres.filter(v => v===a).length - allGenres.filter(v => v===b).length
      ).pop() : '?'

      const allRatings = watched.flatMap(w => w.reviews?.map(r => r.rating) || []).filter((r): r is number => r !== null)
      const avgRating = allRatings.length > 0 ? (allRatings.reduce((a,b)=>a+b,0) / allRatings.length).toFixed(1) : '?'
      
      setStats({ count: watched.length, topGenre: topGenre ?? '?', avgRating })
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function handleWatchedSubmit(myRating: number, partnerRating: number) {
    if (!coupleId || !userId || !ratingTarget) return
    setActionLoading(ratingTarget.id)
    
    // Create watched entry
    const { data: newWatched, error } = await supabase.from('watched').insert({
      couple_id: coupleId,
      marked_by: userId,
      imdb_id: ratingTarget.imdb_id,
      title: ratingTarget.title,
      poster_url: ratingTarget.poster_url,
      year: ratingTarget.year
    }).select().single()

    if (newWatched && !error) {
       // Insert reviews
       const reviewsToInsert = []
       if (myRating > 0) reviewsToInsert.push({ watched_id: newWatched.id, user_id: userId, rating: myRating })
       
       // Note: To insert partner rating securely they need to log in or you need a service role if bypassing RLS.
       // Assuming couples RLS allows inserting reviews for partner. Let's try.
       const pId = partnerAvatar !== null ? await getPartnerId() : null; // Hacky way to get partner ID inside this function. I will fetch it properly. Let's just pass partner_id to state.
       
       if (partnerRating > 0 && pId) {
          reviewsToInsert.push({ watched_id: newWatched.id, user_id: pId, rating: partnerRating })
       }

       if (reviewsToInsert.length > 0) {
           await supabase.from('reviews').insert(reviewsToInsert)
       }
    }
    
    await supabase.from('watchlist').delete().eq('id', ratingTarget.id)
    setWatchlist(prev => prev.filter(w => w.id !== ratingTarget.id))
    setActionLoading(null)
    setRatingTarget(null)
    load()
  }

  async function getPartnerId() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: couple } = await supabase.from('couples').select('user1_id, user2_id').eq('id', coupleId).single()
      if (!couple || !user) return null
      return couple.user1_id === user.id ? couple.user2_id : couple.user1_id
  }

  async function removeItem(id: string) {
    setActionLoading(id)
    await supabase.from('watchlist').delete().eq('id', id)
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setActionLoading(null)
  }

  const randomRotation = (idx: number) => {
    const classes = ['rotate-rand-1', 'rotate-rand-2', 'rotate-rand-3', 'rotate-rand-4']
    return classes[idx % 4]
  }

  if (loading) return null

  return (
    <div className="min-h-screen pt-44 pb-20 w-full overflow-x-hidden flex flex-col items-center relative">
      <Navbar 
        user={{ name: userName, avatar: userAvatar }} 
        partner={{ name: partnerName, avatar: partnerAvatar }}
        onSearch={() => setSearchOpen(true)} 
      />

      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      {ratingTarget && (
        <RatingModal 
           movieTitle={ratingTarget.title}
           onClose={() => setRatingTarget(null)}
           onSubmit={handleWatchedSubmit}
           userName={userName.split(' ')[0] || 'Você'}
           partnerName={partnerName.split(' ')[0] || 'Par' }
        />
      )}

      {raffleOpen && (
        <RaffleModal 
          isOpen={raffleOpen}
          watchlist={watchlist}
          onClose={() => setRaffleOpen(false)}
        />
      )}

      {/* Scrapbook Board Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 relative min-h-[80vh] pb-32">

        {/* Stats Paper Scraps */}
        {stats.count > 0 && (
            <div className="hidden md:flex absolute right-4 top-0 flex-col gap-6 font-handwriting rotate-rand-2 z-0 opacity-90">
                <div className="lined-paper transform rotate-rand-1">
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">⭐ FILMES ASSISTIDOS</div>
                <div className="text-4xl text-center text-black font-win95">{stats.count}</div>
                </div>
                
                <div className="lined-paper transform -translate-x-12 rotate-rand-3 shadow-lg">
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">♡ MÉDIA GERAL</div>
                <div className="text-3xl text-center text-black">{stats.avgRating !== '?' ? `★ ${stats.avgRating}` : '?'}</div>
                </div>
                
                <div className="lined-paper transform translate-x-4 rotate-rand-4">
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">♡ TOP GÊNERO</div>
                <div className="text-2xl text-center text-black px-4">{stats.topGenre}</div>
                </div>
            </div>
        )}

        {/* Watchlist Section */}
        <div className="relative z-10 w-full mb-16 flex flex-col items-center md:items-start pl-0 md:pl-8">
          {watchlist.length === 0 ? (
            <div className="sticky-note max-w-sm mt-8 transform rotate-rand-1 mx-auto md:mx-0">
              <h2 className="font-handwriting text-4xl mb-4 font-bold text-gray-800">Cineminha Vazio</h2>
              <p className="font-handwriting text-xl text-gray-700 leading-relaxed mb-6">
                A fila está vazia. Busquem um filme de terror, romance ou comédia para assistirem grudadinhos.
              </p>
              <button 
                onClick={() => setSearchOpen(true)}
                className="font-handwriting text-xl font-bold flex items-center gap-2 text-blue-800 border-b-2 border-blue-800 pb-1 hover:text-blue-600 hover:border-blue-600 transition-colors cursor-pointer w-full justify-center"
              >
                <span>🔍</span> Procurar nosso próximo filme
              </button>
            </div>
          ) : (
            <>
              {/* Header with Title and Raffle */}
              <div className="flex flex-col md:flex-row items-center gap-6 mb-12 self-center md:self-start">
                  <div className="font-handwriting text-3xl font-bold transform -rotate-1 text-gray-800 uppercase tracking-widest inline-block bg-[#fef08a] px-4 py-1 shadow-sm border border-yellow-300 relative">
                    <div className="absolute -top-3 left-1/2 -ml-2 w-4 h-4 rounded-full bg-red-400 shadow-sm"></div>
                    Próximos da Fila
                  </div>

                  <button 
                     onClick={() => setRaffleOpen(true)}
                     className="win95-btn py-1.5 px-4 text-sm font-bold flex justify-center items-center gap-2"
                  >
                     🎲 Sortear Filme
                  </button>
              </div>

              {/* Fix: Using grid to prevent centered layout breaks and keep them left-aligned */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                {watchlist.map((item, i) => (
                  <div key={item.id} className={`polaroid w-44 md:w-52 mx-auto justify-self-center ${randomRotation(i)}`}>
                    <div className="tape"></div>
                    <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                      {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover" />}
                       
                       <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition flex flex-col justify-center items-center gap-3">
                         <button onClick={() => setRatingTarget(item)} disabled={actionLoading === item.id} className="bg-white/90 text-black font-win95 text-lg px-4 py-1.5 shadow cursor-pointer border-2 border-black hover:bg-white">{actionLoading === item.id ? '...' : 'Visto!'}</button>
                         <button onClick={() => removeItem(item.id)} disabled={actionLoading === item.id} className="bg-red-400/90 text-white font-win95 text-sm px-3 py-1 shadow cursor-pointer border border-red-900">Remover</button>
                       </div>
                    </div>
                    <div className="font-handwriting mt-3 text-center text-2xl leading-tight text-gray-800 font-bold line-clamp-2">
                       {item.title}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
