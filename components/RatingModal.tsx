'use client'

import { useState } from 'react'

interface RatingModalProps {
  movieTitle: string
  userName: string
  partnerName: string
  onClose: () => void
  onSubmit: (myRating: number, partnerRating: number) => void
}

export default function RatingModal({ movieTitle, userName, partnerName, onClose, onSubmit }: RatingModalProps) {
  const [myRating, setMyRating] = useState(0)
  const [partnerRating, setPartnerRating] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="win95-window w-full max-w-sm p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="win95-titlebar font-win95 mb-1">
          <div className="flex items-center gap-2 px-1">
            <span className="bg-white/80 shrink-0 w-3 h-3 shadow-[1px_1px_rgba(0,0,0,0.5)]"></span>
            <span>Avaliar Filme</span>
          </div>
          <button className="win95-btn w-5 h-5 flex items-center justify-center p-0 leading-none font-bold text-sm" onClick={onClose}>x</button>
        </div>

        <div className="p-4 bg-[#c0c0c0]">
          <div className="mb-4 text-center font-win95 text-lg border-b border-gray-400 pb-2">
            Marcar <b>{movieTitle}</b> como visto!
          </div>

          <div className="space-y-4">
            <div className="border border-white border-l-gray-500 border-t-gray-500 p-3 bg-[#d4d0c8]">
               <label className="block font-win95 mb-1 text-sm">Nota do(a) {userName}:</label>
               <div className="flex gap-1 justify-center">
                  {[1,2,3,4,5].map(star => (
                     <button 
                        key={star}
                        className={`text-2xl hover:scale-110 transition-transform ${myRating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-gray-400 grayscale'}`}
                        onClick={() => setMyRating(star)}
                     >⭐</button>
                  ))}
               </div>
            </div>

            <div className="border border-white border-l-gray-500 border-t-gray-500 p-3 bg-[#d4d0c8]">
               <label className="block font-win95 mb-1 text-sm">Nota do(a) {partnerName}:</label>
               <div className="flex gap-1 justify-center">
                  {[1,2,3,4,5].map(star => (
                     <button 
                        key={star}
                        className={`text-2xl hover:scale-110 transition-transform ${partnerRating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-gray-400 grayscale'}`}
                        onClick={() => setPartnerRating(star)}
                     >⭐</button>
                  ))}
               </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <button className="win95-btn px-4 py-1.5" onClick={() => onSubmit(myRating, partnerRating)}>
               OK
            </button>
            <button className="win95-btn px-4 py-1.5" onClick={onClose}>
               Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
