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
      setFeedback({ msg: error.code === '23505' ? 'Já está na watchlist!' : error.message, type: 'error' })
    } else {
      setFeedback({ msg: '✓ Adicionado à watchlist!', type: 'success' })
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

    // Also remove from watchlist if exists
    await supabase.from('watchlist').delete()
      .eq('couple_id', coupleId)
      .eq('imdb_id', selected.imdbID)

    if (error) {
      setFeedback({ msg: error.code === '23505' ? 'Já marcado como assistido!' : error.message, type: 'error' })
    } else {
      setFeedback({ msg: '✓ Marcado como assistido!', type: 'success' })
      setTimeout(onClose, 1200)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-2xl glass rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 p-4 border-b border-cinema-border">
          <Search size={18} className="text-cinema-muted flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-cinema-text placeholder-cinema-muted outline-none text-sm"
            placeholder="Buscar filmes..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setFeedback(null) }}
          />
          {loading && <Loader2 size={16} className="text-cinema-muted animate-spin" />}
          <button onClick={onClose} className="text-cinema-muted hover:text-cinema-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 65px)' }}>
          {/* Detail view */}
          {selected ? (
            <div className="p-5 fade-in">
              <button
                onClick={() => { setSelected(null); setFeedback(null) }}
                className="text-cinema-muted hover:text-cinema-accent text-xs mb-4 flex items-center gap-1"
              >
                ← Voltar aos resultados
              </button>
              <div className="flex gap-4">
                <div className="relative w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-cinema-card">
                  {selected.Poster && selected.Poster !== 'N/A' && (
                    <Image src={selected.Poster} alt={selected.Title} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-cinema-text font-bold text-lg leading-tight">{selected.Title}</h2>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-cinema-muted">
                    {selected.Year && <span>{selected.Year}</span>}
                    {selected.Genre && <span>• {selected.Genre}</span>}
                    {selected.imdbRating && <span>• ⭐ {selected.imdbRating}</span>}
                  </div>
                  {selected.Plot && (
                    <p className="text-cinema-muted text-sm mt-2 leading-relaxed line-clamp-3">{selected.Plot}</p>
                  )}
                </div>
              </div>

              {feedback && (
                <div className={`mt-4 text-center text-sm py-2 px-4 rounded-lg ${feedback.type === 'success' ? 'bg-cinema-green/10 text-cinema-green' : 'bg-red-500/10 text-red-400'}`}>
                  {feedback.msg}
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={addToWatchlist}
                  className="flex-1 flex items-center justify-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white text-sm font-semibold py-2.5 rounded-xl btn-glow transition-colors"
                >
                  <Plus size={16} /> Watchlist
                </button>
                <button
                  onClick={markWatched}
                  className="flex-1 flex items-center justify-center gap-2 bg-cinema-surface border border-cinema-border hover:border-cinema-accent text-cinema-text text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Eye size={16} /> Já assistimos
                </button>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-cinema-accent" />
            </div>
          ) : results.length > 0 ? (
            <ul>
              {results.map(m => (
                <li
                  key={m.imdbID}
                  onClick={() => selectMovie(m)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-cinema-card cursor-pointer transition-colors border-b border-cinema-border/50 last:border-0"
                >
                  <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-card">
                    {m.Poster && m.Poster !== 'N/A' ? (
                      <Image src={m.Poster} alt={m.Title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cinema-muted text-xs">🎬</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cinema-text text-sm font-medium truncate">{m.Title}</p>
                    <p className="text-cinema-muted text-xs">{m.Year}</p>
                  </div>
                  <Plus size={16} className="text-cinema-muted flex-shrink-0" />
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="text-cinema-muted text-sm text-center py-12">
              Nenhum resultado para &quot;{query}&quot;
            </div>
          ) : (
            <div className="text-cinema-muted text-sm text-center py-12">
              Digite para buscar filmes...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
