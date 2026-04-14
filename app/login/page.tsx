'use client'

import { createClient } from '@/lib/supabase/client'
import { Heart, Film, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Cinematic background gradient */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(192,132,252,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(244,114,182,0.06) 0%, transparent 50%), #080b12',
        }}
      />

      {/* Floating film strips decoration */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px opacity-5"
            style={{
              left: `${10 + i * 17}%`,
              top: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, transparent, #c084fc, transparent)',
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cinema-accent/20 border border-cinema-accent/30 flex items-center justify-center">
              <Heart size={24} className="text-cinema-rose fill-cinema-rose" />
            </div>
            <Film size={24} className="text-cinema-accent" />
          </div>
          <h1 className="text-3xl font-bold text-cinema-text tracking-tight">
            Movies<span className="gradient-text">Together</span>
          </h1>
          <p className="text-cinema-muted text-sm mt-2 leading-relaxed">
            Assista junto. Lembre juntos.
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-cinema-text font-semibold text-center mb-1">Entrar na conta</h2>
          <p className="text-cinema-muted text-sm text-center mb-6">
            Use sua conta Google para começar
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-gray-600" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Entrando...' : 'Continuar com Google'}
          </button>

          <p className="text-cinema-muted text-xs text-center mt-5 leading-relaxed">
            Ao entrar, você concorda com os termos de uso.
            <br />
            Seus dados ficam seguros com o Supabase Auth.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-8 text-center">
          {[
            { icon: '🎬', label: 'Watchlist do casal' },
            { icon: '⭐', label: 'Avaliações duplas' },
            { icon: '💕', label: 'Memórias juntos' },
          ].map(({ icon, label }) => (
            <div key={label} className="glass rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-cinema-muted text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
