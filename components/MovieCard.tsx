'use client'

import Image from 'next/image'
import { Star, Plus, CheckCircle, Clock } from 'lucide-react'

interface MovieCardProps {
  title: string
  poster: string
  year?: string
  rating?: number | null
  partnerRating?: number | null
  addedBy?: string
  addedAt?: string
  genre?: string
  onAction?: () => void
  actionLabel?: string
  actionIcon?: 'plus' | 'check' | 'clock'
  variant?: 'watchlist' | 'history' | 'search'
}

export default function MovieCard({
  title,
  poster,
  year,
  rating,
  partnerRating,
  addedBy,
  addedAt,
  genre,
  onAction,
  actionLabel,
  actionIcon = 'plus',
  variant = 'watchlist',
}: MovieCardProps) {
  const icons = {
    plus: <Plus size={14} />,
    check: <CheckCircle size={14} />,
    clock: <Clock size={14} />,
  }

  const hasPoster = poster && poster !== 'N/A'

  function StarRow({ value }: { value: number | null | undefined }) {
    if (!value) return null
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={10}
            className={i <= value ? 'star-filled fill-current' : 'star-empty'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col poster-hover cursor-pointer">
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-cinema-card flex-shrink-0">
        {hasPoster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 150px, 200px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-cinema-muted text-xs text-center px-2">
            <p>{title}</p>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          {onAction && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction() }}
              className="flex items-center justify-center gap-1.5 bg-cinema-accent text-white text-xs font-semibold py-2 px-3 rounded-lg btn-glow hover:bg-cinema-accent-hover transition-colors"
            >
              {icons[actionIcon]}
              {actionLabel}
            </button>
          )}
        </div>

        {/* Year badge */}
        {year && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-cinema-muted text-xs px-1.5 py-0.5 rounded-md">
            {year}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <p className="text-cinema-text text-sm font-medium leading-tight line-clamp-2">{title}</p>

        {genre && (
          <p className="text-cinema-muted text-xs mt-0.5 truncate">{genre.split(',')[0]}</p>
        )}

        {/* Ratings */}
        {variant === 'history' && (rating || partnerRating) && (
          <div className="flex flex-col gap-0.5 mt-1.5">
            <StarRow value={rating} />
            {partnerRating !== undefined && partnerRating !== null && (
              <StarRow value={partnerRating} />
            )}
          </div>
        )}

        {/* Added by */}
        {addedBy && (
          <p className="text-cinema-muted text-xs mt-1">
            por <span className="text-cinema-accent">{addedBy}</span>
          </p>
        )}
        {addedAt && (
          <p className="text-cinema-muted text-xs">
            {new Date(addedAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}
