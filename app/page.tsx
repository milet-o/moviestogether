'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Star, Trash2 } from 'lucide-react'
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
}

interface WatchedItem {
  id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
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

    const { data: wl } = await supabase.from('watchlist').select('*').eq('couple_id', couple.id).order('created_at', { ascending: true })
    setWatchlist(wl ?? [])

    const { data: watched } = await supabase.from('watched').select('*, reviews(user_id, rating)').eq('couple_id', couple.id).order('watched_at', { ascending: false })
    setRecentWatched(watched ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function markWatched(item: WatchlistItem) {
    if (!coupleId || !userId) return
    setActionLoading(item.id)
    await supabase.from('watched').insert({
      couple_id: coupleId,
      marked_by: userId,
      imdb_id: item.imdb_id,
      title: item.title,
      poster_url: item.poster_url,
      year: item.year
    })
    await supabase.from('watchlist').delete().eq('id', item.id)
    setWatchlist(prev => prev.filter(w => w.id !== item.id))
    setActionLoading(null)
    load()
  }

  async function removeItem(id: string) {
    setActionLoading(id)
    await supabase.from('watchlist').delete().eq('id', id)
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setActionLoading(null)
  }

  // Calculate random rotation for polaroids
  const randomRotation = (idx: number) => {
    const classes = ['rotate-rand-1', 'rotate-rand-2', 'rotate-rand-3', 'rotate-rand-4']
    return classes[idx % 4]
  }

  const allGenres = recentWatched.map(w => w.genre).filter(Boolean).map(g => g?.split(',')[0])
  const topGenre = allGenres.length > 0 ? allGenres.sort((a,b) =>
        allGenres.filter(v => v===a).length - allGenres.filter(v => v===b).length
  ).pop() : '?'

  const allRatings = recentWatched.flatMap(w => w.reviews?.map(r => r.rating) || []).filter((r): r is number => r !== null)
  const avgRating = allRatings.length > 0 ? (allRatings.reduce((a,b)=>a+b,0) / allRatings.length).toFixed(1) : '?'

  if (loading) return null

  return (
    <div className="min-h-screen pt-24 pb-20 w-full overflow-x-hidden">
      <Navbar 
        user={{ name: userName, avatar: userAvatar }} 
        partner={{ name: partnerName, avatar: partnerAvatar }}
        onSearch={() => setSearchOpen(true)} 
      />
      {searchOpen && coupleId && userId && (
        <SearchModal isOpen={searchOpen} onClose={() => { setSearchOpen(false); load() }} coupleId={coupleId} userId={userId} />
      )}

      {/* Scrapbook Board Container */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 relative min-h-[80vh] pb-32">

        {/* Stats Paper Scraps */}
        <div className="hidden md:flex absolute right-10 top-10 flex-col gap-6 font-handwriting rotate-rand-2 z-0 opacity-90">
            <div className="lined-paper transform rotate-rand-1">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">⭐ FILMES ASSISTIDOS</div>
              <div className="text-4xl text-center text-black font-win95">{recentWatched.length}</div>
            </div>
            
            <div className="lined-paper transform -translate-x-12 rotate-rand-3 shadow-lg">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">♡ MÉDIA GERAL</div>
              <div className="text-3xl text-center text-black">{avgRating !== '?' ? `★ ${avgRating}` : '?'}</div>
            </div>
            
            <div className="lined-paper transform translate-x-4 rotate-rand-4">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight mb-2">♡ TOP GÊNERO</div>
              <div className="text-2xl text-center text-black px-4">{topGenre}</div>
            </div>
        </div>

        {/* Watchlist Section */}
        <div className="relative z-10 w-full mb-16">
          {watchlist.length === 0 ? (
            <div className="sticky-note max-w-sm ml-4 md:ml-12 mt-8 transform rotate-rand-1">
              <h2 className="font-handwriting text-4xl mb-4 font-bold text-gray-800">Cineminha Vazio</h2>
              <p className="font-handwriting text-xl text-gray-700 leading-relaxed mb-6">
                A fila está vazia. Busquem um filme de terror, romance ou comédia para assistirem grudadinhos.
              </p>
              <button 
                onClick={() => setSearchOpen(true)}
                className="font-handwriting text-xl font-bold flex items-center gap-2 text-blue-800 border-b-2 border-blue-800 pb-1 hover:text-blue-600 hover:border-blue-600 transition-colors cursor-pointer"
              >
                <span>🔍</span> Procurar nosso próximo filme
              </button>
            </div>
          ) : (
            <>
              <div className="font-handwriting text-3xl font-bold mb-8 pl-4 transform -rotate-1 text-gray-800 uppercase tracking-widest inline-block bg-[#fef08a] px-3 shadow-sm border border-yellow-300 relative">
                <div className="absolute -top-3 left-1/2 -ml-2 w-4 h-4 rounded-full bg-red-400 shadow-sm"></div>
                Próximos da Fila
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-12 justify-center md:justify-start px-2">
                {watchlist.map((item, i) => (
                  <div key={item.id} className={`polaroid w-44 md:w-52 shrink-0 ${randomRotation(i)}`}>
                    <div className="tape"></div>
                    <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                      {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover" />}
                       
                       <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition flex flex-col justify-center items-center gap-2">
                         <button onClick={() => markWatched(item)} disabled={actionLoading === item.id} className="bg-white/90 text-black font-win95 text-sm px-3 py-1 shadow cursor-pointer border border-black hover:bg-white">{actionLoading === item.id ? '...' : 'Visto!'}</button>
                         <button onClick={() => removeItem(item.id)} disabled={actionLoading === item.id} className="bg-red-400/90 text-white font-win95 text-xs px-2 py-1 shadow cursor-pointer border border-red-900">Remover</button>
                       </div>
                    </div>
                    <div className="font-handwriting mt-3 text-center text-xl leading-tight text-gray-800 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Watched Section */}
        {recentWatched.length > 0 && (
          <div className="relative z-10 w-full mt-24">
            <div className="font-handwriting text-3xl font-bold mb-10 pl-4 transform rotate-2 text-gray-800 uppercase tracking-widest inline-block bg-white p-2 border-2 border-dashed border-gray-300">
               Já Vimos! 🍿
            </div>
            
            <div className="flex flex-wrap gap-x-8 gap-y-12 justify-center md:justify-start px-2">
              {recentWatched.map((item, i) => {
                 const myRating = item.reviews?.find(r => r.user_id === userId)?.rating
                 const pRating = item.reviews?.find(r => r.user_id !== userId)?.rating

                 return (
                   <div key={item.id} className={`polaroid w-44 md:w-52 shrink-0 ${randomRotation(i+2)}`}>
                      <div className="tape"></div>
                      <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                        {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover" />}
                        <div className="absolute bottom-1 right-1 bg-white/90 px-1 font-win95 border border-black text-[10px] transform rotate-3">
                           VISTO
                        </div>
                      </div>
                      
                      <div className="font-handwriting mt-2 text-center text-xl leading-tight text-gray-800 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.title}
                      </div>

                      {/* Ratings Stamp */}
                      <div className="flex items-center justify-center gap-3 mt-1 font-handwriting text-lg text-gray-600">
                        <div className="flex items-center" title="Sua Nota">
                           <span className="text-sm mr-1">👦</span>
                           {myRating ? [...Array(myRating)].map((_,x)=><Star key={x} size={10} className="fill-blue-400 text-blue-400"/>) : '-'}
                        </div>
                        <div className="flex items-center" title="Nota do Par">
                           <span className="text-sm mr-1">👧</span>
                           {pRating ? [...Array(pRating)].map((_,x)=><Star key={x} size={10} className="fill-pink-400 text-pink-400"/>) : '-'}
                        </div>
                      </div>
                   </div>
                 )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
