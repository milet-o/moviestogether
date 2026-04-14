'use client'

import { Star } from 'lucide-react'

interface RatingStarsProps {
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: number
}

export default function RatingStars({ value, onChange, readOnly = false, size = 20 }: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(i)}
          className={`transition-all duration-150 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-125'}`}
        >
          <Star
            size={size}
            className={i <= value ? 'star-filled fill-current' : 'star-empty'}
          />
        </button>
      ))}
    </div>
  )
}
