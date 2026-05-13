'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_TIMEOUT_MINUTES = 30
const WARNING_SECONDS = 60

export function getInactivityTimeout(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MINUTES
  const stored = localStorage.getItem('kmha_inactivity_timeout_minutes')
  const val = stored ? parseInt(stored) : DEFAULT_TIMEOUT_MINUTES
  return isNaN(val) || val < 1 ? DEFAULT_TIMEOUT_MINUTES : val
}

export function setInactivityTimeout(minutes: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kmha_inactivity_timeout_minutes', String(minutes))
  }
}

export default function InactivityLogout() {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)
  const timeoutRef = useRef<any>(null)
  const warningRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)
  const supabase = createClient()

  function resetTimer() {
    const timeoutMs = getInactivityTimeout() * 60 * 1000
    const warningMs = Math.min(WARNING_SECONDS * 1000, timeoutMs * 0.2)

    setShowWarning(false)
    clearTimeout(timeoutRef.current)
    clearTimeout(warningRef.current)
    clearInterval(countdownRef.current)

    warningRef.current = setTimeout(() => {
      const secs = Math.round(warningMs / 1000)
      setShowWarning(true)
      setSecondsLeft(secs)
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0 }
          return s - 1
        })
      }, 1000)
    }, timeoutMs - warningMs)

    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      window.location.href = '/auth/login?reason=inactivity'
    }, timeoutMs)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timeoutRef.current)
      clearTimeout(warningRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  if (!showWarning) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#0a1428', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '32px', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(239,68,68,0.15)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
          🔒
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>STILL THERE?</h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
          You'll be signed out in <strong style={{ color: '#f87171' }}>{secondsLeft} seconds</strong> due to inactivity.
        </p>
        <div style={{ width: '100%', height: '4px', background: 'rgba(239,68,68,0.15)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#ef4444', borderRadius: '2px', width: `${(secondsLeft / Math.min(WARNING_SECONDS, getInactivityTimeout() * 12)) * 100}%`, transition: 'width 1s linear' }} />
        </div>
        <button onClick={resetTimer} style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
          I'm still here — Stay signed in
        </button>
      </div>
    </div>
  )
}
