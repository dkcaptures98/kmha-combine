'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700, color: 'white', letterSpacing: '0.1em' }}>KMHA</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Combine Performance Tracker</p>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ color: '#94a3b8', fontFamily: 'var(--font-display)', fontSize: '18px', textAlign: 'center', letterSpacing: '0.05em', marginBottom: '24px' }}>COACH LOGIN</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', background: '#0d1b2a', border: '1px solid #1e3a5f', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="coach@kmha.ca"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', background: '#0d1b2a', border: '1px solid #1e3a5f', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="••••••••"
              />
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
// Sat 14 Mar 2026 14:10:46 EDT
