'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import SearchModal from '@/components/SearchModal'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

interface WatchedItem {
  id: string
  title: string
  poster_url: string | null
  year: string | null
  genre: string | null
  watched_at: string
  reviews?: { user_id: string; rating: number | null }[]
}

export default function HistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('')
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null)
  const [items, setItems] = useState<WatchedItem[]>([])
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

    const { data: watched } = await supabase
      .from('watched')
      .select('*, reviews(user_id, rating)')
      .eq('couple_id', couple.id)
      .order('watched_at', { ascending: false })

    setItems(watched ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

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

      {/* Scrapbook Board Container */}
      <div className="w-full max-w-6xl px-4 md:px-8 relative min-h-[80vh] pb-32">
          
        <div className="font-handwriting text-3xl font-bold mb-10 pl-4 transform rotate-2 text-gray-800 uppercase tracking-widest inline-block bg-white p-2 border-2 border-dashed border-gray-300 shadow">
           Histórico: Já Vimos! 🍿
        </div>
        
        {items.length === 0 ? (
           <div className="sticky-note max-w-sm mt-8 transform -rotate-1 mx-auto text-center">
              <h2 className="font-handwriting text-3xl mb-4 font-bold text-gray-800">Nada aqui ainda!</h2>
              <p className="font-handwriting text-xl text-gray-700 leading-relaxed">
                Vão lá na página Inicial, adicionem filmes e comecem a registrar os que vocês já assistiram juntos!
              </p>
           </div>
        ) : (
           <div className="flex flex-wrap gap-x-8 gap-y-12 justify-center pl-2 md:pl-0">
             {items.map((item, i) => {
                const myRating = item.reviews?.find(r => r.user_id === userId)?.rating
                const pRating = item.reviews?.find(r => r.user_id !== userId)?.rating
                const dateRaw = new Date(item.watched_at)
                const dateStr = dateRaw.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

                return (
                  <div key={item.id} className={`polaroid w-44 md:w-52 shrink-0 ${randomRotation(i+2)}`}>
                     <div className="tape"></div>
                     
                     <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                       {item.poster_url && <Image src={item.poster_url} alt={item.title} fill className="object-cover" />}
                       
                       {/* Date Stamp */}
                       <div className="absolute top-2 left-[-15px] bg-red-600/90 text-white px-8 font-win95 text-xs transform -rotate-45 shadow-md border border-red-800 tracking-widest">
                          {dateStr}
                       </div>
                     </div>
                     
                     <div className="font-handwriting mt-3 text-center text-xl leading-tight text-gray-800 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                       {item.title}
                     </div>

                     {/* Ratings Stamp */}
                     <div className="flex items-center justify-center gap-3 mt-1.5 font-handwriting text-lg text-gray-600 border-t border-dashed border-gray-300 pt-1">
                       <div className="flex items-center" title={`Nota de ${userName.split(' ')[0]}`}>
                          <span className="text-sm mr-1">😁</span>
                          {myRating ? [...Array(myRating)].map((_,x)=><Star key={x} size={10} className="fill-blue-400 text-blue-400"/>) : <span className="text-sm">-</span>}
                       </div>
                       <div className="flex items-center" title={`Nota de ${partnerName.split(' ')[0]}`}>
                          <span className="text-sm mr-1">😎</span>
                          {pRating ? [...Array(pRating)].map((_,x)=><Star key={x} size={10} className="fill-pink-400 text-pink-400"/>) : <span className="text-sm">-</span>}
                       </div>
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
