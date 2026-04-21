'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Movie {
  imdbID: string
  Title: string
  Year: string
  Poster: string
  Plot?: string
  Genre?: string
  imdbRating?: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  coupleId: string
  userId: string
}

export default function SearchModal({ isOpen, onClose, coupleId, userId }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [selected, setSelected] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/movies?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.Search ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  async function selectMovie(m: Movie) {
    setDetailLoading(true)
    try {
       // Check if already in watchlist
       const { data: current } = await supabase.from('watchlist').select('id').eq('imdb_id', m.imdbID).maybeSingle()
       if (current) {
         setFeedback({ msg: 'O filme já está na fila.', type: 'error' })
       } else {
         const res = await fetch(`/api/movies?id=${m.imdbID}`)
         const detail: Movie = await res.json()
         setSelected(detail)
       }
    } finally {
      setDetailLoading(false)
    }
  }

  async function addToWatchlist() {
    if (!selected) return
    setFeedback(null)
    const { error } = await supabase.from('watchlist').insert({
      couple_id: coupleId,
      added_by: userId,
      imdb_id: selected.imdbID,
      title: selected.Title,
      poster_url: selected.Poster !== 'N/A' ? selected.Poster : null,
      year: selected.Year,
      genre: selected.Genre,
      plot: selected.Plot,
      imdb_rating: selected.imdbRating,
    })
    if (error) {
       setFeedback({ msg: error.message, type: 'error' })
    } else {
       setFeedback({ msg: 'Adicionado com sucesso!', type: 'success' })
       setTimeout(onClose, 1000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="win95-window w-full max-w-2xl p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.4)] flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="win95-titlebar font-win95 mb-1 shrink-0">
          <div className="flex items-center gap-2 px-1">
            <span className="bg-white/80 shrink-0 w-3 h-3 shadow-[1px_1px_rgba(0,0,0,0.5)]"></span>
            <span>Busca.exe</span>
          </div>
          <button className="win95-btn w-5 h-5 flex items-center justify-center p-0 leading-none font-bold text-sm" onClick={onClose}>x</button>
        </div>

        <div className="p-3 bg-[#c0c0c0] font-win95 flex-1 flex flex-col min-h-0">
          
          <div className="flex gap-2 items-center mb-4 shrink-0">
             <label className="text-lg">Procurar Filme:</label>
             <input
               autoFocus
               className="flex-1 bg-white border border-gray-600 border-r-gray-200 border-b-gray-200 px-2 py-1 outline-none text-lg"
               value={query}
               onChange={e => { setQuery(e.target.value); setSelected(null); setFeedback(null) }}
             />
             {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white border border-gray-600 border-r-gray-200 border-b-gray-200 p-2 shadow-inner">
              
              {feedback && (
                  <div className={`text-center font-bold p-2 mb-2 ${feedback.type === 'error' ? 'bg-red-200 border border-red-500' : 'bg-green-200 border border-green-500'}`}>
                      {feedback.msg}
                  </div>
              )}

              {selected ? (
                  <div className="flex flex-col sm:flex-row gap-4 h-full overflow-y-auto pr-2 pb-2">
                       <div className="polaroid w-40 shrink-0 mx-auto sm:mx-0 transform -rotate-1 border border-gray-300">
                          <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                             {selected.Poster && selected.Poster !== 'N/A' && <Image src={selected.Poster} alt={selected.Title} fill className="object-cover" />}
                          </div>
                       </div>
                       
                       <div className="flex flex-col flex-1">
                           <h2 className="text-2xl font-bold border-b border-dashed border-gray-400 mb-2">{selected.Title} ({selected.Year})</h2>
                           <p className="text-sm text-gray-600 mb-2"><b>Gênero:</b> {selected.Genre}</p>
                           <p className="text-base flex-1">{selected.Plot}</p>
                           
                           <div className="flex gap-2 mt-4 pt-4 border-t border-dashed border-gray-400 justify-end">
                               <button className="win95-btn px-4 py-1 font-bold text-lg" onClick={addToWatchlist}>Adicionar à Fila</button>
                               <button className="win95-btn px-4 py-1 text-lg" onClick={() => setSelected(null)}>Voltar</button>
                           </div>
                       </div>
                  </div>
              ) : results.length > 0 ? (
                  <ul className="overflow-y-auto pr-2 h-full">
                      {results.map((m, i) => (
                           <li 
                              key={m.imdbID + i} 
                              className="flex gap-3 hover:bg-[#000080] hover:text-white cursor-pointer p-1"
                              onClick={() => selectMovie(m)}
                           >
                               <div className="w-10 h-14 bg-gray-200 shrink-0 relative overflow-hidden border border-gray-400">
                                   {m.Poster && m.Poster !== 'N/A' && <Image src={m.Poster} alt={m.Title} fill className="object-cover" />}
                               </div>
                               <div className="flex flex-col justify-center">
                                   <p className="text-xl font-bold">{m.Title}</p>
                                   <p>{m.Year}</p>
                               </div>
                           </li>
                      ))}
                  </ul>
              ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-xl font-bold italic">
                       {query.trim() ? "Nenhum filme encontrado..." : "Digite o título..."}
                  </div>
              )}

          </div>

        </div>
      </div>
    </div>
  )
}
