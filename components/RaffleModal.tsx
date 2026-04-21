'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface WatchlistItem {
  id: string
  imdb_id: string
  title: string
  poster_url: string | null
  year: string | null
}

interface RaffleModalProps {
  isOpen: boolean
  watchlist: WatchlistItem[]
  onClose: () => void
}

export default function RaffleModal({ isOpen, watchlist, onClose }: RaffleModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(watchlist.map(w => w.id)))
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<WatchlistItem | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
     if (isOpen) {
        setSelectedIds(new Set(watchlist.map(w => w.id)))
        setWinner(null)
     }
  }, [isOpen, watchlist])

  if (!isOpen) return null

  const toggleId = (id: string) => {
     const newSet = new Set(selectedIds)
     if (newSet.has(id)) newSet.delete(id)
     else newSet.add(id)
     setSelectedIds(newSet)
  }

  const startRaffle = () => {
      const candidates = watchlist.filter(w => selectedIds.has(w.id))
      if (candidates.length === 0) return

      setIsSpinning(true)
      setWinner(null)
      
      let spins = 0
      const maxSpins = 20
      const spinInterval = setInterval(() => {
          setCurrentIndex(Math.floor(Math.random() * candidates.length))
          spins++
          if (spins >= maxSpins) {
              clearInterval(spinInterval)
              setIsSpinning(false)
              const finalWinner = candidates[Math.floor(Math.random() * candidates.length)]
              setWinner(finalWinner)
          }
      }, 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="win95-window w-full max-w-md p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="win95-titlebar font-win95 mb-1">
          <div className="flex items-center gap-2 px-1">
            <span className="bg-white/80 shrink-0 w-3 h-3 shadow-[1px_1px_rgba(0,0,0,0.5)]"></span>
            <span>Roleta do Casal.exe</span>
          </div>
          <button className="win95-btn w-5 h-5 flex items-center justify-center p-0 leading-none font-bold text-sm" onClick={onClose}>x</button>
        </div>

        <div className="p-4 bg-[#c0c0c0] font-win95">
           
           {!winner && !isSpinning ? (
              <>
                <p className="mb-2 text-lg">Selecione os filmes para o sorteio:</p>
                <div className="bg-white border border-gray-600 border-r-gray-300 border-b-gray-300 h-48 overflow-y-auto p-2 mb-4 scroll-x shadow-inner">
                    {watchlist.length === 0 ? (
                        <p className="text-gray-500">A fila está vazia!</p>
                    ) : (
                        watchlist.map(item => (
                            <label key={item.id} className="flex items-center gap-2 hover:bg-[#000080] hover:text-white cursor-pointer px-1">
                                <input 
                                   type="checkbox" 
                                   checked={selectedIds.has(item.id)}
                                   onChange={() => toggleId(item.id)}
                                   className="win95-checkbox"
                                />
                                {item.title}
                            </label>
                        ))
                    )}
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                    <button 
                        className="win95-btn px-6 py-2 font-bold text-lg" 
                        onClick={startRaffle}
                        disabled={selectedIds.size === 0}
                    >
                    🎲 SORTEAR!
                    </button>
                </div>
              </>
           ) : isSpinning ? (
               <div className="py-12 flex flex-col items-center justify-center">
                   <div className="text-2xl mb-4 animate-pulse">Sorteando...</div>
                   {watchlist.filter(w=>selectedIds.has(w.id))[currentIndex] && (
                        <div className="text-xl px-4 py-2 bg-white border border-gray-500">{watchlist.filter(w=>selectedIds.has(w.id))[currentIndex].title}</div>
                   )}
               </div>
           ) : winner ? (
               <div className="py-6 flex flex-col items-center justify-center">
                   <h2 className="text-2xl font-bold mb-4 bg-yellow-200 border border-yellow-400 px-2 shadow">🎯 Temos um vencedor!</h2>
                   
                   <div className="polaroid w-40 shrink-0 transform rotate-1 border border-gray-300 pointer-events-none mb-4">
                        <div className="w-full aspect-[2/3] bg-black relative shadow-inner overflow-hidden border border-gray-200">
                           {winner.poster_url && <Image src={winner.poster_url} alt={winner.title} fill className="object-cover" />}
                        </div>
                   </div>

                   <p className="text-2xl font-bold">{winner.title}</p>
                   
                   <div className="mt-8 flex gap-2 w-full justify-center">
                       <button className="win95-btn px-6 py-2 font-bold text-sm bg-[#000080]" onClick={onClose}>
                          Fechar e Preparar Pipoca
                       </button>
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
  )
}
