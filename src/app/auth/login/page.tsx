'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f1e' }}>
      {/* Background rink lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', border: '1px solid rgba(30,58,95,0.4)',
          borderRadius: '50%', opacity: 0.5
        }} />
        <div style={{
          position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', border: '1px solid rgba(30,58,95,0.4)',
          borderRadius: '50%', opacity: 0.5
        }} />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L20 12H28L22 17L24 26L16 21L8 26L10 17L4 12H12L16 4Z"
                fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="4" fill="#0ea5e9" opacity="0.6" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-white">KMHA</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Combine Performance Tracker</p>
        </div>

        {/* Login card */}
        <div className="kmha-card p-6">
          <h2 className="font-display text-xl font-semibold mb-6 text-center" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>
            COACH LOGIN
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="kmha-input w-full"
                placeholder="coach@kmha.ca"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="kmha-input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" className="kmha-btn w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#334155' }}>
          Kitchener Minor Hockey Association © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
