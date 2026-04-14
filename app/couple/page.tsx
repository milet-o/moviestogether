'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Copy, CheckCheck, Loader2, Users, Link2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface CoupleInfo {
  coupled: boolean
  couple_id?: string
  partner?: {
    id: string
    full_name: string
    avatar_url: string | null
    email: string
  }
  created_at?: string
}

export default function CouplePage() {
  const supabase = createClient()
  const router = useRouter()
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [acceptLoading, setAcceptLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const fetchCouple = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/couple')
    const data = await res.json()
    setCoupleInfo(data)
    setLoading(false)
    if (data.coupled) {
      setTimeout(() => router.push('/'), 1500)
    }
  }, [router])

  useEffect(() => { fetchCouple() }, [fetchCouple])

  async function generateInvite() {
    setCodeLoading(true)
    setFeedback(null)
    const res = await fetch('/api/couple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' }),
    })
    const data = await res.json()
    if (data.code) {
      setInviteCode(data.code)
    } else {
      setFeedback({ msg: data.error ?? 'Erro ao gerar código', type: 'error' })
    }
    setCodeLoading(false)
  }

  async function acceptInvite() {
    if (!inputCode.trim()) return
    setAcceptLoading(true)
    setFeedback(null)
    const res = await fetch('/api/couple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', code: inputCode.trim() }),
    })
    const data = await res.json()
    if (data.couple_id) {
      setFeedback({ msg: '💕 Casal criado! Redirecionando...', type: 'success' })
      setTimeout(() => router.push('/'), 1500)
    } else {
      setFeedback({ msg: data.error ?? 'Código inválido', type: 'error' })
    }
    setAcceptLoading(false)
  }

  async function copyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cinema-accent" />
      </div>
    )
  }

  if (coupleInfo?.coupled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center max-w-sm">
          <Heart size={40} className="text-cinema-rose fill-cinema-rose mx-auto mb-4" />
          <p className="text-cinema-text font-semibold">Casal encontrado!</p>
          <p className="text-cinema-muted text-sm mt-1">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, rgba(192,132,252,0.06) 0%, transparent 70%), #080b12' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cinema-rose/20 flex items-center justify-center">
              <Heart size={20} className="text-cinema-rose fill-cinema-rose" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-cinema-text">Conecte-se ao seu casal</h1>
          <p className="text-cinema-muted text-sm mt-2">
            Gere um código e compartilhe com seu parceiro, ou insira o código dele
          </p>
        </div>

        {feedback && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4 ${
            feedback.type === 'success'
              ? 'bg-cinema-green/10 border border-cinema-green/20 text-cinema-green'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <AlertCircle size={16} />
            {feedback.msg}
          </div>
        )}

        {/* Generate invite */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={18} className="text-cinema-accent" />
            <h2 className="text-cinema-text font-semibold">Convidar parceiro</h2>
          </div>

          {inviteCode ? (
            <div>
              <p className="text-cinema-muted text-xs mb-2">Compartilhe este código com seu parceiro:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-cinema-bg border border-cinema-accent/40 rounded-xl px-4 py-3 text-center">
                  <span className="text-cinema-accent font-mono font-bold text-xl tracking-[0.3em]">
                    {inviteCode}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  className="p-3 bg-cinema-accent/20 hover:bg-cinema-accent/30 rounded-xl text-cinema-accent transition-colors"
                >
                  {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-cinema-muted text-xs mt-2 text-center">Válido por 48 horas</p>
            </div>
          ) : (
            <button
              onClick={generateInvite}
              disabled={codeLoading}
              className="w-full flex items-center justify-center gap-2 bg-cinema-accent hover:bg-cinema-accent-hover text-white font-semibold py-3 rounded-xl btn-glow transition-colors disabled:opacity-70"
            >
              {codeLoading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {codeLoading ? 'Gerando...' : 'Gerar código de convite'}
            </button>
          )}
        </div>

        {/* Accept invite */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-cinema-rose" />
            <h2 className="text-cinema-text font-semibold">Tenho um código</h2>
          </div>
          <div className="flex gap-2">
            <input
              className="input-cinema flex-1 text-center font-mono tracking-widest uppercase"
              placeholder="XXXXXXXX"
              maxLength={8}
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && acceptInvite()}
            />
            <button
              onClick={acceptInvite}
              disabled={acceptLoading || !inputCode.trim()}
              className="px-4 bg-cinema-rose/20 hover:bg-cinema-rose/30 border border-cinema-rose/30 text-cinema-rose rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {acceptLoading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
