'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

function getInactivityTimeout() {
  if (typeof window === 'undefined') return 30

  const saved = window.localStorage.getItem('kmha_inactivity_timeout')
  const parsed = saved ? Number(saved) : 30

  return Number.isFinite(parsed) ? parsed : 30
}

function setInactivityTimeout(minutes: number) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem('kmha_inactivity_timeout', String(minutes))
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [timeoutMinutes, setTimeoutMinutes] = useState(30)
  const [timeoutSaved, setTimeoutSaved] = useState(false)
  const [timeoutError, setTimeoutError] = useState('')

  useEffect(() => {
    setTimeoutMinutes(getInactivityTimeout())
  }, [])

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setInviting(true)
    setMessage('')
    setError('')

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(`Invite sent to ${email}`)
        setEmail('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while sending the invite.')
    } finally {
      setInviting(false)
    }
  }

  function handleSaveTimeout() {
    setTimeoutError('')

    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 480) {
      setTimeoutError('Please enter a value between 1 and 480 minutes.')
      return
    }

    setInactivityTimeout(timeoutMinutes)
    setTimeoutSaved(true)
    window.setTimeout(() => setTimeoutSaved(false), 2500)
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>
          ADMIN PANEL
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Manage user access</p>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          INVITE A COACH OR PARENT
        </h2>

        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          Enter their email address and they will receive a magic link to set up their account. No password needed on their end.
        </p>

        <form onSubmit={handleInvite}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="coach@kmha.ca"
              style={{
                width: '100%',
                background: 'rgba(5,15,35,0.8)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: 'white',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {message && (
            <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>
              ✓ {message}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={inviting}
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              cursor: inviting ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              border: 'none',
              color: 'white',
              opacity: inviting ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          AUTO SIGN-OUT TIMER
        </h2>

        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          Users will be warned 60 seconds before sign-out. Set to a higher value for less interruption during long sessions.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Timeout Duration
          </label>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={480}
              value={timeoutMinutes}
              onChange={e => setTimeoutMinutes(Number(e.target.value))}
              style={{
                width: '100px',
                background: 'rgba(5,15,35,0.8)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: 'white',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <span style={{ color: '#64748b', fontSize: '13px' }}>minutes</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[15, 30, 60, 120].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setTimeoutMinutes(preset)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid rgba(59,130,246,0.25)',
                background: timeoutMinutes === preset ? 'rgba(37,99,235,0.3)' : 'rgba(5,15,35,0.6)',
                color: timeoutMinutes === preset ? '#60a5fa' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              {preset}m
            </button>
          ))}
        </div>

        {timeoutError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>
            {timeoutError}
          </div>
        )}

        {timeoutSaved && (
          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>
            ✓ Timeout updated to {timeoutMinutes} minutes
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveTimeout}
          style={{
            padding: '10px 24px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            border: 'none',
            color: 'white',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
          }}
        >
          Save Timeout
        </button>

        <p style={{ margin: '14px 0 0', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
          ⚠ This setting is saved to this browser only. Changes take effect immediately on next activity.
        </p>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '24px', maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          MANAGING USERS
        </h2>

        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          To view all users, change passwords, or remove access, go directly to your Supabase dashboard:
        </p>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: '#60a5fa',
            textDecoration: 'none',
          }}
        >
          Open Supabase Dashboard →
        </a>

        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
          Go to Authentication → Users to see all accounts, reset passwords, or delete users.
        </p>
      </div>
    </div>
  )
}
