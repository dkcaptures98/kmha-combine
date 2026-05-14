'use client'
import { useState, useEffect, useRef } from 'react'
import { Athlete, TEAMS } from '@/types'
import { getUserPermissions, UserRole } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// U10-12 age groups get ChinHold, U13-18 get Chinups + 0.2 Mile
const U10_12 = ['U10AA','U10AAA','U11AA','U11AAA','U12AA','U12AAA']
const SEASONS = ['2024-2025','2025-2026','2026-2027','2027-2028']

interface CombineResult {
  id?: string
  athlete_id: string
  athlete_name: string
  team: string
  season: string
  height_ft?: number | null
  height_in?: number | null
  wingspan_ft?: number | null
  wingspan_in?: number | null
  vertical?: number | null
  broad_jump_ft?: number | null
  broad_jump_in?: number | null
  chinup_hold?: number | null
  chinups?: number | null
  mile02_time?: string | null
  mile02_watts?: number | null
  notes?: string | null
}

interface LockInfo {
  season: string
  combine_date?: string
  locked: boolean
  locked_by?: string
  notes?: string
}

function isU1012(team: string) { return U10_12.includes(team) }

function todayTorontoDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function CombinePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [results, setResults] = useState<Record<string, CombineResult>>({})
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026')
  const [role, setRole] = useState<UserRole | null>(null)
  const [lock, setLock] = useState<LockInfo | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving'|'saved'|'error'|''>>({})
  const [loading, setLoading] = useState(false)
  const [showLockManager, setShowLockManager] = useState(false)
  const [newLockDate, setNewLockDate] = useState('')
  const [newLockNotes, setNewLockNotes] = useState('')
  const timers = useRef<Record<string, any>>({})

  const isAdmin = role === 'superadmin' || role === 'super_admin' || role === 'admin'
  const isDataEntry = role === 'data_entry' || role === 'coach' || role === 'editor' || role === 'entry_only'
  const today = todayTorontoDateString()
  const isScheduledCombineDate = !!lock?.combine_date && lock.combine_date === today
  const isLocked = !isAdmin && (lock?.locked || !isScheduledCombineDate)
  const isU12Team = selectedTeam ? isU1012(selectedTeam) : false

  useEffect(() => {
    getUserPermissions().then(p => {
      const normalizedRole = p.role === 'coach' || p.role === 'editor' || p.role === 'entry_only' ? 'data_entry' : p.role
      setRole(normalizedRole)
    })
    loadLocks()
  }, [])

  useEffect(() => {
    if (!selectedTeam) return
    setLoading(true)
    Promise.all([
      fetch(`/api/athletes?team=${selectedTeam}`).then(r => r.json()),
      fetch(`/api/combine?team=${selectedTeam}&season=${selectedSeason}`).then(r => r.json()),
    ]).then(([aths, res]) => {
      setAthletes(aths)
      const map: Record<string, CombineResult> = {}
      res.forEach((r: CombineResult) => { map[r.athlete_id] = r })
      setResults(map)
      setLoading(false)
    })
  }, [selectedTeam, selectedSeason])

  async function loadLocks() {
    const data = await fetch('/api/combine-lock').then(r => r.json())
    const current = data.find((l: LockInfo) => l.season === selectedSeason) || null
    setLock(current)
  }

  useEffect(() => { loadLocks() }, [selectedSeason])

  function getResult(athleteId: string): CombineResult {
    return results[athleteId] || { athlete_id: athleteId, athlete_name: '', team: selectedTeam, season: selectedSeason }
  }

  function updateField(athleteId: string, athleteName: string, field: keyof CombineResult, value: any) {
    if (isLocked) return

    setResults(prev => ({
      ...prev,
      [athleteId]: { ...getResult(athleteId), athlete_id: athleteId, athlete_name: athleteName, team: selectedTeam, season: selectedSeason, [field]: value === '' ? null : value }
    }))

    const key = `${athleteId}-${field}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      setSaveStatus(p => ({ ...p, [athleteId]: 'saving' }))
      const r = { ...getResult(athleteId), [field]: value === '' ? null : value, athlete_name: athleteName, team: selectedTeam, season: selectedSeason }
      const res = await fetch('/api/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      })
      setSaveStatus(p => ({ ...p, [athleteId]: res.ok ? 'saved' : 'error' }))
      if (res.ok) {
        const updated = await res.json()
        if (updated?.[0]) setResults(prev => ({ ...prev, [athleteId]: updated[0] }))
      }
      setTimeout(() => setSaveStatus(p => ({ ...p, [athleteId]: '' })), 2000)
    }, 600)
  }

  async function handleToggleLock() {
    const newLocked = !lock?.locked
    await fetch('/api/combine-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: selectedSeason, locked: newLocked, combine_date: newLockDate || lock?.combine_date, notes: newLockNotes || lock?.notes })
    })
    loadLocks()
  }

  async function handleSaveLockSettings() {
    await fetch('/api/combine-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: selectedSeason, locked: lock?.locked || false, combine_date: newLockDate, notes: newLockNotes })
    })
    setShowLockManager(false)
    loadLocks()
  }

  const inputBase: React.CSSProperties = {
    background: 'rgba(5,15,35,0.8)',
    border: '1px solid rgba(59,130,246,0.2)',
    color: 'white',
    borderRadius: '5px',
    padding: '4px 6px',
    fontSize: '12px',
    textAlign: 'center',
    outline: 'none',
    width: '100%',
    colorScheme: 'dark' as const,
  }

  const lockedInput: React.CSSProperties = {
    ...inputBase,
    background: 'rgba(5,10,20,0.5)',
    border: '1px solid rgba(30,58,95,0.3)',
    color: '#334155',
    cursor: 'not-allowed',
  }

  function fmtDate(d?: string) {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ANNUAL COMBINE</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Lock status badge */}
          {lock?.locked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '12px' }}>🔒</span>
              <span style={{ fontSize: '12px', color: '#f87171', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {isAdmin ? 'LOCKED (Admin Override Active)' : 'LOCKED'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '6px', padding: '6px 12px' }}>
              <span style={{ fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: '#34d399', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {isAdmin ? 'OPEN FOR ADMIN' : isScheduledCombineDate ? 'OPEN FOR ENTRY' : 'LOCKED UNTIL COMBINE DATE'}
              </span>
            </div>
          )}
          {isAdmin && (
            <button onClick={() => setShowLockManager(!showLockManager)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b' }}>
              ⚙ Manage Lock
            </button>
          )}
        </div>
      </div>

      {/* Lock manager panel (admin only) */}
      {showLockManager && isAdmin && (
        <div style={{ background: 'rgba(10,20,40,0.9)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#60a5fa', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Combine Lock Settings — {selectedSeason}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Combine Date</label>
              <input type="date" defaultValue={lock?.combine_date || ''} onChange={e => setNewLockDate(e.target.value)}
                style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#334155' }}>Entry opens the day of — locks automatically otherwise</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Notes</label>
              <input type="text" defaultValue={lock?.notes || ''} onChange={e => setNewLockNotes(e.target.value)} placeholder="e.g. Kitchener Aud, 9am start"
                style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveLockSettings} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white' }}>Save Settings</button>
            <button onClick={handleToggleLock} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: lock?.locked ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${lock?.locked ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`, color: lock?.locked ? '#34d399' : '#f87171' }}>
              {lock?.locked ? '🔓 Unlock Combine' : '🔒 Lock Combine'}
            </button>
          </div>
        </div>
      )}

      {/* Combine date banner */}
      {lock?.combine_date && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>{selectedSeason} Annual Combine</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#60a5fa' }}>{fmtDate(lock.combine_date)}{lock.notes ? ` · ${lock.notes}` : ''}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', appearance: 'none' as const, outline: 'none' }}>
              <option value="">Select team...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Season</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', appearance: 'none' as const, outline: 'none' }}>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {selectedTeam && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ padding: '6px 12px', background: isU12Team ? 'rgba(52,211,153,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${isU12Team ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.3)'}`, borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: isU12Team ? '#34d399' : '#60a5fa', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {isU12Team ? 'U10-12: Chin Hold' : 'U13-18: Chin-Ups + 0.2 Mile'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Locked notice for non-admins */}
      {isLocked && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🔒</span>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-display)' }}>Combine Entry is Locked</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
              Data entry is only permitted on the scheduled combine date{lock?.combine_date ? ` (${lock.combine_date})` : ''}. Today is {today}. Contact your admin if you need access.
            </p>
          </div>
        </div>
      )}

      {/* Entry table */}
      {selectedTeam && !loading && athletes.length > 0 && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'white' }}>{selectedTeam} — {selectedSeason}</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>{athletes.length} athletes · auto-saves as you type{isAdmin && lock?.locked ? ' · Admin override active' : ''}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLocked ? '#f87171' : '#34d399', boxShadow: `0 0 6px ${isLocked ? 'rgba(239,68,68,0.6)' : 'rgba(52,211,153,0.6)'}` }} />
              <span style={{ fontSize: '11px', color: isLocked ? '#f87171' : '#34d399' }}>{isLocked ? 'Locked' : 'Live'}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, minWidth: '900px' }}>
              <thead>
                <tr style={{ background: 'rgba(5,15,35,0.6)' }}>
                  {/* Athlete */}
                  <th style={{ padding: '10px 12px', textAlign: 'left' as const, fontSize: '10px', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', minWidth: '140px' }}>Athlete</th>
                  
                  {/* Height group */}
                  <th colSpan={2} style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}>Height</th>
                  
                  {/* Wingspan group */}
                  <th colSpan={2} style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}>Wingspan</th>

                  {/* Vertical */}
                  <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.1)', minWidth: '70px' }}>Vertical<br/><span style={{ fontSize: '8px', fontWeight: 400, color: '#334155' }}>cm</span></th>

                  {/* Broad Jump group */}
                  <th colSpan={2} style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}>Broad Jump</th>

                  {/* Age-specific tests */}
                  {isU12Team ? (
                    <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(52,211,153,0.4)', borderLeft: '2px solid rgba(52,211,153,0.3)', minWidth: '80px' }}>Chin Hold<br/><span style={{ fontSize: '8px', fontWeight: 400, color: '#334155' }}>seconds</span></th>
                  ) : (
                    <>
                      <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.4)', borderLeft: '2px solid rgba(59,130,246,0.3)', minWidth: '70px' }}>Chin-Ups<br/><span style={{ fontSize: '8px', fontWeight: 400, color: '#334155' }}>reps</span></th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(239,68,68,0.4)', borderLeft: '1px solid rgba(59,130,246,0.1)', minWidth: '80px' }}>0.2 Mile<br/><span style={{ fontSize: '8px', fontWeight: 400, color: '#334155' }}>MM:SS</span></th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(239,68,68,0.4)', borderLeft: '1px solid rgba(59,130,246,0.1)', minWidth: '80px' }}>Avg Watts<br/><span style={{ fontSize: '8px', fontWeight: 400, color: '#334155' }}>W</span></th>
                    </>
                  )}
                  <th style={{ padding: '8px 6px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '2px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.1)', minWidth: '30px' }}></th>
                </tr>
                {/* Sub-headers for ft/in columns */}
                <tr style={{ background: 'rgba(5,15,35,0.3)' }}>
                  <th style={{ padding: '4px 12px', borderBottom: '1px solid rgba(59,130,246,0.1)' }}></th>
                  {['ft','in','ft','in'].map((label, i) => (
                    <th key={i} style={{ padding: '4px 6px', textAlign: 'center' as const, fontSize: '9px', color: '#334155', fontWeight: 500, borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: i===0||i===2 ? '1px solid rgba(59,130,246,0.1)' : 'none' }}>{label}</th>
                  ))}
                  <th style={{ padding: '4px 6px', borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}></th>
                  {['ft','in'].map((label, i) => (
                    <th key={i} style={{ padding: '4px 6px', textAlign: 'center' as const, fontSize: '9px', color: '#334155', fontWeight: 500, borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: i===0 ? '1px solid rgba(59,130,246,0.1)' : 'none' }}>{label}</th>
                  ))}
                  {isU12Team ? (
                    <th style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '2px solid rgba(52,211,153,0.3)' }}></th>
                  ) : (
                    <>
                      <th style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '2px solid rgba(59,130,246,0.3)' }}></th>
                      <th style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}></th>
                      <th style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}></th>
                    </>
                  )}
                  <th style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', borderLeft: '1px solid rgba(59,130,246,0.1)' }}></th>
                </tr>
              </thead>
              <tbody>
                {[...athletes].sort((a,b) => a.last_name.localeCompare(b.last_name)).map((athlete, i) => {
                  const r = results[athlete.id] || {}
                  const status = saveStatus[athlete.id]
                  const inp = isLocked ? lockedInput : inputBase
                  const name = `${athlete.first_name} ${athlete.last_name}`

                  const numInput = (field: keyof CombineResult, width = '52px', placeholder = '') => (
                    <input type="number" min="0" step="1" disabled={isLocked}
                      value={r[field] as number ?? ''} placeholder={placeholder}
                      onChange={e => updateField(athlete.id, name, field, e.target.value === '' ? null : parseFloat(e.target.value))}
                      style={{ ...inp, width }} />
                  )

                  return (
                    <tr key={athlete.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)', background: i%2===0 ? 'transparent' : 'rgba(5,15,35,0.2)' }}>
                      <td style={{ padding: '6px 12px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                        {athlete.last_name}, {athlete.first_name}
                      </td>
                      
                      {/* Height ft/in */}
                      <td style={{ padding: '4px 4px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>{numInput('height_ft','44px')}</td>
                      <td style={{ padding: '4px 4px' }}>{numInput('height_in','44px')}</td>
                      
                      {/* Wingspan ft/in */}
                      <td style={{ padding: '4px 4px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>{numInput('wingspan_ft','44px')}</td>
                      <td style={{ padding: '4px 4px' }}>{numInput('wingspan_in','44px')}</td>

                      {/* Vertical */}
                      <td style={{ padding: '4px 6px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>
                        <input type="number" min="0" step="0.1" disabled={isLocked}
                          value={r.vertical ?? ''} placeholder="—"
                          onChange={e => updateField(athlete.id, name, 'vertical', e.target.value === '' ? null : parseFloat(e.target.value))}
                          style={{ ...inp, width: '60px' }} />
                      </td>

                      {/* Broad Jump ft/in */}
                      <td style={{ padding: '4px 4px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>{numInput('broad_jump_ft','44px')}</td>
                      <td style={{ padding: '4px 4px' }}>{numInput('broad_jump_in','44px')}</td>

                      {/* Age-specific */}
                      {isU12Team ? (
                        <td style={{ padding: '4px 6px', borderLeft: '2px solid rgba(52,211,153,0.25)' }}>
                          <input type="number" min="0" step="0.1" disabled={isLocked}
                            value={r.chinup_hold ?? ''} placeholder="—"
                            onChange={e => updateField(athlete.id, name, 'chinup_hold', e.target.value === '' ? null : parseFloat(e.target.value))}
                            style={{ ...inp, width: '68px', borderColor: isLocked ? 'rgba(30,58,95,0.3)' : 'rgba(52,211,153,0.3)' }} />
                        </td>
                      ) : (
                        <>
                          <td style={{ padding: '4px 6px', borderLeft: '2px solid rgba(59,130,246,0.25)' }}>
                            <input type="number" min="0" step="1" disabled={isLocked}
                              value={r.chinups ?? ''} placeholder="—"
                              onChange={e => updateField(athlete.id, name, 'chinups', e.target.value === '' ? null : parseInt(e.target.value))}
                              style={{ ...inp, width: '58px', borderColor: isLocked ? 'rgba(30,58,95,0.3)' : 'rgba(59,130,246,0.4)' }} />
                          </td>
                          <td style={{ padding: '4px 4px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>
                            <input type="text" disabled={isLocked}
                              value={r.mile02_time ?? ''} placeholder="0:00"
                              onChange={e => updateField(athlete.id, name, 'mile02_time', e.target.value || null)}
                              style={{ ...inp, width: '68px', borderColor: isLocked ? 'rgba(30,58,95,0.3)' : 'rgba(239,68,68,0.35)' }} />
                          </td>
                          <td style={{ padding: '4px 4px', borderLeft: '1px solid rgba(59,130,246,0.08)' }}>
                            <input type="number" min="0" step="0.1" disabled={isLocked}
                              value={r.mile02_watts ?? ''} placeholder="—"
                              onChange={e => updateField(athlete.id, name, 'mile02_watts', e.target.value === '' ? null : parseFloat(e.target.value))}
                              style={{ ...inp, width: '68px', borderColor: isLocked ? 'rgba(30,58,95,0.3)' : 'rgba(239,68,68,0.35)' }} />
                          </td>
                        </>
                      )}

                      {/* Save indicator */}
                      <td style={{ padding: '4px 8px', textAlign: 'center' as const, borderLeft: '1px solid rgba(59,130,246,0.06)' }}>
                        <span style={{ fontSize: '11px', color: status==='saving'?'#64748b':status==='saved'?'#34d399':status==='error'?'#f87171':'transparent' }}>
                          {status==='saving'?'…':status==='saved'?'✓':status==='error'?'!':'·'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedTeam && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '64px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏒</p>
          <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>Select a team and season to begin entering combine results</p>
        </div>
      )}

      {selectedTeam && !loading && athletes.length === 0 && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#475569', margin: 0 }}>No athletes found for {selectedTeam}</p>
        </div>
      )}
    </div>
  )
}
