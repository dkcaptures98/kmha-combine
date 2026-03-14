'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type View = 'login' | 'forgot' | 'forgot-sent'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Contact your admin if you need access.')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    setView('forgot-sent')
  }

  if (!mounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #020b18 0%, #051428 50%, #020d1f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background rink lines */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', border: '1px solid rgba(59,130,246,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(59,130,246,0.06)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '16px', marginBottom: '16px',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            boxShadow: '0 0 40px rgba(37,99,235,0.3)',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 3L22 13H33L24 19L27 30L18 24L9 30L12 19L3 13H14L18 3Z" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, letterSpacing: '0.12em', margin: 0 }}>KMHA</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0', letterSpacing: '0.06em' }}>COMBINE PERFORMANCE TRACKER</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {view === 'login' && (
            <>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, margin: '0 0 24px', textAlign: 'center', letterSpacing: '0.04em' }}>Welcome back</h2>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="coach@kmha.ca"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.25)'}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.25)'}
                  />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                  <button type="button" onClick={() => { setView('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{
                  width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white',
                  border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                  boxShadow: '0 4px 15px rgba(37,99,235,0.3)', transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <>
              <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ← Back to login
              </button>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Reset password</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="coach@kmha.ca"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white',
                  border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {view === 'forgot-sent' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Check your email</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
                We sent a password reset link to <strong style={{ color: '#94a3b8' }}>{email}</strong>
              </p>
              <button onClick={() => setView('login')} style={{
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white',
                border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>
                Back to Login
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '12px', marginTop: '24px' }}>
          Kitchener Minor Hockey Association © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
