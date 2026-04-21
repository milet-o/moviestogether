'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Search, X, Plus, Eye, Loader2 } from 'lucide-react'
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
      const res = await fetch(`/api/movies?id=${m.imdbID}`)
      const detail: Movie = await res.json()
      setSelected(detail)
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
      setFeedback({ msg: error.code === '23505' ? 'Já está na fila.' : error.message, type: 'error' })
    } else {
      setFeedback({ msg: '♡ Adicionado à fila!', type: 'success' })
      setTimeout(onClose, 1200)
    }
  }

  async function markWatched() {
    if (!selected) return
    setFeedback(null)
    const { error } = await supabase.from('watched').insert({
      couple_id: coupleId,
      marked_by: userId,
      imdb_id: selected.imdbID,
      title: selected.Title,
      poster_url: selected.Poster !== 'N/A' ? selected.Poster : null,
      year: selected.Year,
      genre: selected.Genre,
      plot: selected.Plot,
      imdb_rating: selected.imdbRating,
    })

    await supabase.from('watchlist').delete()
      .eq('couple_id', coupleId)
      .eq('imdb_id', selected.imdbID)

    if (error) {
      setFeedback({ msg: error.code === '23505' ? 'Já marcado como assistido.' : error.message, type: 'error' })
    } else {
      setFeedback({ msg: '♡ Marcado no diário!', type: 'success' })
      setTimeout(onClose, 1200)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-cinema-border"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 p-4 border-b border-cinema-border bg-paper/50">
          <Search size={18} className="text-cinema-muted flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-cinema-text placeholder-cinema-muted outline-none text-sm font-medium"
            placeholder="Procurar filmes..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setFeedback(null) }}
          />
          {loading && <Loader2 size={16} className="text-cinema-rose animate-spin" />}
          <button onClick={onClose} className="text-cinema-muted hover:text-cinema-rose transition-colors p-1 bg-white rounded-full">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 65px)' }}>
          {selected ? (
            <div className="p-6 md:p-8 fade-in">
              <button
                onClick={() => { setSelected(null); setFeedback(null) }}
                className="text-cinema-muted hover:text-cinema-rose text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-1 transition-colors"
              >
                ← Voltar
              </button>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="relative w-32 sm:w-40 h-48 sm:h-60 mx-auto sm:mx-0 flex-shrink-0 rounded-2xl overflow-hidden bg-cinema-surface border border-cinema-border shadow-sm">
                  {selected.Poster && selected.Poster !== 'N/A' ? (
                    <Image src={selected.Poster} alt={selected.Title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-cinema-muted">Sem poster</div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                  <h2 className="text-cinema-text font-bold text-2xl leading-tight text-balance">{selected.Title}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-xs font-semibold uppercase tracking-widest text-cinema-muted">
                    {selected.Year && <span>{selected.Year}</span>}
                    {selected.Genre && <><span className="w-1 h-1 rounded-full bg-cinema-border"></span><span>{selected.Genre.split(',')[0]}</span></>}
                    {selected.imdbRating && <><span className="w-1 h-1 rounded-full bg-cinema-border"></span><span>★ {selected.imdbRating}</span></>}
                  </div>
                  
                  {selected.Plot && (
                    <p className="text-cinema-text/80 text-sm mt-4 leading-relaxed line-clamp-4">{selected.Plot}</p>
                  )}
                  
                  {feedback && (
                    <div className={`w-full mt-4 text-center text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg ${feedback.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                      {feedback.msg}
                    </div>
                  )}

                  <div className="flex gap-3 mt-auto pt-6 w-full">
                    <button
                      onClick={addToWatchlist}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-cinema-rose hover:bg-[#ff7a90] text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-cinema-rose/20"
                    >
                      <Plus size={14} /> Fila
                    </button>
                    <button
                      onClick={markWatched}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-white border-2 border-cinema-border hover:border-cinema-rose hover:text-cinema-rose text-cinema-text text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all"
                    >
                      <Eye size={14} /> Já vimos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-cinema-rose" />
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-cinema-border/50">
              {results.map(m => (
                <li
                  key={m.imdbID}
                  onClick={() => selectMovie(m)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-paper cursor-pointer transition-colors"
                >
                  <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-surface border border-cinema-border">
                    {m.Poster && m.Poster !== 'N/A' && (
                      <Image src={m.Poster} alt={m.Title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cinema-text text-sm font-bold truncate">{m.Title}</p>
                    <p className="text-cinema-muted text-xs font-medium mt-0.5">{m.Year}</p>
                  </div>
                  <Plus size={18} className="text-cinema-rose/50" />
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="text-cinema-muted text-xs font-semibold uppercase tracking-widest text-center py-16">
              Nenhum filme encontrado.
            </div>
          ) : (
            <div className="text-cinema-muted text-xs font-semibold uppercase tracking-widest text-center py-16 flex flex-col items-center gap-2 opacity-50">
              <Search size={24} />
              Buscar por título...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
