'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020b18 0%, #051428 50%, #020d1f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, letterSpacing: '0.12em', margin: 0 }}>KMHA</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>COMBINE PERFORMANCE TRACKER</p>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '32px', backdropFilter: 'blur(20px)' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Password updated!</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>You can now sign in with your new password.</p>
              <a href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Go to Login</a>
            </div>
          ) : (
            <>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Set new password</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>Choose a strong password for your account.</p>
              <form onSubmit={handleReset}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
