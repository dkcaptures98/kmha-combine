'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()

      if (data?.session && mounted) {
        setReady(true)
        return
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          setReady(true)
        }
      })

      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession()
        if (retry?.session && mounted) {
          setReady(true)
        } else if (mounted) {
          setError('This setup link is invalid or expired. Send a new setup email.')
        }
      }, 1200)

      return () => sub.subscription.unsubscribe()
    }

    init()

    return () => {
      mounted = false
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Password set successfully. Redirecting...')
    setTimeout(() => {
      window.location.href = '/auth/login'
    }, 1000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08111f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '28px', color: 'white' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>Set your password</h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          Finish setting up your KMHA account.
        </p>

        {!ready && !error ? (
          <p style={{ color: '#cbd5e1' }}>Checking your setup link...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>New password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#020617', color: 'white' }}
            />

            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#020617', color: 'white' }}
            />

            {error ? (
              <div style={{ marginBottom: '16px', color: '#fca5a5', background: '#450a0a', border: '1px solid #7f1d1d', padding: '10px', borderRadius: '10px' }}>
                {error}
              </div>
            ) : null}

            {success ? (
              <div style={{ marginBottom: '16px', color: '#86efac', background: '#052e16', border: '1px solid #166534', padding: '10px', borderRadius: '10px' }}>
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!ready || loading}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#0284c7', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: !ready || loading ? 0.7 : 1 }}
            >
              {loading ? 'Saving...' : 'Set Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
