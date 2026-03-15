'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

interface User { id: string; email: string; created_at: string; last_sign_in_at: string }

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setMessage('')
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) setError(error.message)
    else setMessage(`Invite sent to ${email}`)
    setEmail('')
    setInviting(false)
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ADMIN PANEL</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Manage user access</p>
      </div>

      {/* Invite user */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>INVITE A COACH OR PARENT</h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          Enter their email address and they'll receive a magic link to set up their account. No password needed on their end.
        </p>
        <form onSubmit={handleInvite}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="coach@kmha.ca"
              style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {message && <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>✓ {message}</div>}
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          <button type="submit" disabled={inviting} style={{ padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: inviting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Instructions */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '24px', maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>MANAGING USERS</h2>
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          To view all users, change passwords, or remove access, go directly to your Supabase dashboard:
        </p>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', textDecoration: 'none' }}>
          Open Supabase Dashboard →
        </a>
        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
          Go to Authentication → Users to see all accounts, reset passwords, or delete users.
        </p>
      </div>
    </div>
  )
}
