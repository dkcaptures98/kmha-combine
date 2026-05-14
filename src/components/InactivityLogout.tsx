// src/components/InactivityLogout.tsx
'use client'

import { useEffect, useState } from 'react'
import { setInactivityTimeout, getInactivityTimeout } from '@/lib/session' // <-- we’ll create this wrapper in step 2

export function InactivityLogout() {
  const [minutes, setMinutes] = useState<number>(30) // default fallback
  const [isDisabled, setIsDisabled] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)

  // Load the current value from localStorage / DB on mount
  useEffect(() => {
    const stored = getInactivityTimeout()
    if (stored !== null) setMinutes(stored)
    const disabled = localStorage.getItem('kmha_inactivity_disabled') === 'true'
    setIsDisabled(disabled)
  }, [])

  // Whenever the toggle changes, persist it
  useEffect(() => {
    if (isDisabled) {
      localStorage.setItem('kmha_inactivity_disabled', 'true')
    } else {
      localStorage.removeItem('kmha_inactivity_disabled')
    }
  }, [isDisabled])

  const handleSave = async () => {
    if (isDisabled) {
      // Disable = clear the timeout entirely
      setMinutes(0) // not used but keeps the API happy
      await setInactivityTimeout(0) // will write to DB / localStorage
    } else {
      await setInactivityTimeout(minutes)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={adminContainerStyle}>
      <h3 style={titleStyle}>Auto Sign‑Out Timer</h3>
      <p style={descStyle}>
        Users will be signed out after this many minutes of inactivity.
      </p>

      {/* ----- DISABLE TOGGLE ----- */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <input
          type="checkbox"
          checked={!!localStorage.getItem('kmha_inactivity_disabled')}
          onChange={handleSave} // reuse save for toggle
          style={{ width: '40px', height: '40px' }}
        />
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
          {localStorage.getItem('kmha_inactivity_disabled') ? 'Disable Auto‑Sign‑Out' : 'Enable Auto‑Sign‑Out'}
        </span>
      </label>

      {/* ----- MINUTES INPUT (only shown when enabled) ----- */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="number"
          min={1}
          max={480}
          value={Number(localStorage.getItem('kmha_inactivity_timeout_minutes') || 30)}
          onChange={e => {
            const v = Number(e.target.value)
            if (!Number.isNaN(v) && v > 0) {
              setInactivityTimeout(v) // will be defined in the component below
            }
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: '#0f1f3d',
            color: 'white',
            fontSize: '14px',
          }}
        />
        <span style={{ color: '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap' }}>minutes</span>
        <button
          onClick={() => setInactivityTimeout(Number(localStorage.getItem('kmha_inactivity_timeout_minutes') || 30))}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            border: 'none',
            color: 'white',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>

      <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '11px' }}>
        Recommended: 30–60 min. Warning appears 60 seconds before sign‑out.
      </p>
    </div>
  )
}

/* -------------------------------------------------
   Helper functions – they live in the same file so you
   don’t have to create a separate module.
   ------------------------------------------------- */
function getInactivityTimeout(): number {
  const stored = localStorage.getItem('kmha_inactivity_timeout_minutes')
  return stored ? parseInt(stored, 10) : 30 // default 30 min
}
function setInactivityTimeout(minutes: number) {
  localStorage.setItem('kmha_inactivity_timeout_minutes', String(minutes))
}
