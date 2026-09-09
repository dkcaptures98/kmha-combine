'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getUserPermissions } from '@/lib/permissions'

type ScheduleEntry = {
  id: string
  week_start: string
  test_type: string
  notes?: string | null
}

const ANNUAL_COMBINE = 'AnnualCombine'

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateInput(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(value: string) {
  return new Date(value + 'T12:00:00')
}

function weekStartFromInput(value: string) {
  return toDateInput(getMonday(parseDate(value)))
}

function weeksInRange(startValue: string, endValue: string) {
  const start = getMonday(parseDate(startValue))
  const end = getMonday(parseDate(endValue))
  const weeks: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    weeks.push(toDateInput(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

function formatRange(startValue: string, endValue: string) {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  if (startValue === endValue) {
    return start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const sameYear = start.getFullYear() === end.getFullYear()
  const left = start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  const right = end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
}

export default function TestingSessionGuide({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname()
  const relevant = pathname === '/schedule' || pathname === '/entry' || pathname === '/combine'
  const todayValue = toDateInput(new Date())
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [overrideWrongPage, setOverrideWrongPage] = useState(false)
  const [startDate, setStartDate] = useState(todayValue)
  const [endDate, setEndDate] = useState(todayValue)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadSchedule() {
    try {
      const res = await fetch('/api/schedule', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSchedule(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!relevant) return
    getUserPermissions().then(p => setIsAdmin(p.role === 'superadmin' || p.role === 'super_admin' || p.role === 'admin'))
    loadSchedule()
    const timer = window.setInterval(loadSchedule, 15000)
    return () => window.clearInterval(timer)
  }, [relevant])

  useEffect(() => {
    setOverrideWrongPage(false)
  }, [pathname])

  const currentWeek = toDateInput(getMonday(new Date()))
  const thisWeek = schedule.filter(s => s.week_start === currentWeek)
  const annualThisWeek = thisWeek.some(s => s.test_type === ANNUAL_COMBINE)
  const weeklyThisWeek = thisWeek.some(s => s.test_type !== ANNUAL_COMBINE)

  const rangeIsValid = !!startDate && !!endDate && parseDate(endDate) >= parseDate(startDate)
  const selectedWeeks = rangeIsValid ? weeksInRange(startDate, endDate) : []
  const selectedEntries = schedule.filter(s => selectedWeeks.includes(s.week_start))
  const selectedAnnualEntries = selectedEntries.filter(s => s.test_type === ANNUAL_COMBINE)
  const selectedHasWeekly = selectedEntries.some(s => s.test_type !== ANNUAL_COMBINE)

  const mode = annualThisWeek ? 'annual' : weeklyThisWeek ? 'weekly' : 'none'

  const wrongPage = useMemo(() => {
    if (pathname === '/entry' && mode === 'annual') return 'annual'
    if (pathname === '/combine' && mode === 'weekly') return 'weekly'
    return null
  }, [pathname, mode])

  if (!relevant) return null

  async function scheduleAnnual() {
    setMessage('')
    if (!rangeIsValid) {
      setMessage('⚠ End date must be the same as or after the start date.')
      return
    }
    if (selectedHasWeekly) {
      setMessage('⚠ Weekly testing is already scheduled during this date range. Remove it first to avoid a schedule conflict.')
      return
    }

    const existingWeeks = new Set(selectedAnnualEntries.map(e => e.week_start))
    const weeksToCreate = selectedWeeks.filter(w => !existingWeeks.has(w))
    if (weeksToCreate.length === 0) {
      setMessage('Annual Combine is already scheduled for this date range.')
      return
    }

    setSaving(true)
    try {
      const rangeLabel = formatRange(startDate, endDate)
      const savedNotes = [rangeLabel, notes.trim()].filter(Boolean).join(' · ')
      for (const weekStart of weeksToCreate) {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start: weekStart, test_type: ANNUAL_COMBINE, notes: savedNotes }),
        })
        if (!res.ok) throw new Error('Could not save the Annual Combine schedule.')
      }
      setMessage(`✓ Annual Combine scheduled for ${rangeLabel}.`)
      setNotes('')
      await loadSchedule()
    } catch (error) {
      setMessage(`⚠ ${error instanceof Error ? error.message : 'Could not save the Annual Combine schedule.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function removeAnnualRange() {
    if (!selectedAnnualEntries.length) return
    setSaving(true)
    setMessage('')
    try {
      for (const entry of selectedAnnualEntries) {
        const res = await fetch(`/api/schedule?id=${encodeURIComponent(entry.id)}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Could not remove the Annual Combine schedule.')
      }
      setMessage(`✓ Annual Combine removed from ${formatRange(startDate, endDate)}.`)
      await loadSchedule()
    } catch (error) {
      setMessage(`⚠ ${error instanceof Error ? error.message : 'Could not remove the Annual Combine schedule.'}`)
    } finally {
      setSaving(false)
    }
  }

  if (wrongPage && !overrideWrongPage && !loading) {
    const annual = wrongPage === 'annual'
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(2,8,23,0.94)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 'min(560px,100%)', background: 'rgba(10,20,40,0.98)', border: `1px solid ${annual ? 'rgba(251,191,36,0.45)' : 'rgba(59,130,246,0.45)'}`, borderRadius: 16, padding: 30, boxShadow: '0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: annual ? '#fbbf24' : '#60a5fa' }}>
            {annual ? 'ANNUAL COMBINE' : 'WEEKLY TESTING'}
          </p>
          <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 28, color: 'white', letterSpacing: '0.04em' }}>
            {annual ? 'USE ANNUAL COMBINE ENTRY' : 'USE WEEKLY DATA ENTRY'}
          </h2>
          <p style={{ margin: '0 0 22px', color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
            {annual ? 'Annual Combine is scheduled for this week.' : 'Weekly testing is scheduled for this week.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={annual ? '/combine' : '/entry'} style={{ textDecoration: 'none', padding: '10px 18px', borderRadius: 8, background: annual ? 'linear-gradient(135deg,#b45309,#d97706)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: 'white', fontWeight: 800, fontSize: 13 }}>
              OPEN {annual ? 'ANNUAL COMBINE' : 'WEEKLY DATA ENTRY'}
            </a>
            {isAdmin && (
              <button type="button" onClick={() => setOverrideWrongPage(true)} style={{ padding: '10px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.25)', color: '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                ADMIN OVERRIDE
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (pathname !== '/schedule' || !embedded) return null

  return (
    <section style={{ margin: '0 0 22px', background: 'linear-gradient(180deg, rgba(12,27,52,0.96), rgba(7,18,36,0.96))', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,0.72fr) minmax(420px,1.65fr)', gap: 0 }}>
        <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(59,130,246,0.12)', background: mode === 'annual' ? 'rgba(251,191,36,0.04)' : mode === 'weekly' ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.01)' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>This week</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: mode === 'annual' ? '#fbbf24' : mode === 'weekly' ? '#60a5fa' : '#475569', boxShadow: mode === 'none' ? 'none' : `0 0 10px ${mode === 'annual' ? 'rgba(251,191,36,0.55)' : 'rgba(96,165,250,0.55)'}` }} />
            <h2 style={{ margin: 0, fontSize: 20, color: mode === 'annual' ? '#fbbf24' : mode === 'weekly' ? '#60a5fa' : '#94a3b8', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              {mode === 'annual' ? 'ANNUAL COMBINE' : mode === 'weekly' ? 'WEEKLY TESTING' : 'NOT SCHEDULED'}
            </h2>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
            {mode === 'annual' ? 'Entry page: Annual Combine' : mode === 'weekly' ? 'Entry page: Data Entry' : 'Set the session type before testing starts.'}
          </p>
        </div>

        <div style={{ padding: '16px 18px' }}>
          {isAdmin ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Annual Combine dates</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Set one day or a date range. Weekly testing still uses <strong style={{ color: '#60a5fa' }}>+ Add Week</strong> below.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 150px minmax(170px,1fr) auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5, fontWeight: 700, letterSpacing: '0.08em' }}>START DATE</label>
                  <input type="date" value={startDate} onChange={e => { const value = e.target.value; setStartDate(value); if (!endDate || parseDate(endDate) < parseDate(value)) setEndDate(value); setMessage('') }} style={{ width: '100%', background: 'rgba(2,11,24,0.82)', border: '1px solid rgba(59,130,246,0.22)', color: 'white', borderRadius: 7, padding: '8px 10px', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5, fontWeight: 700, letterSpacing: '0.08em' }}>END DATE</label>
                  <input type="date" min={startDate} value={endDate} onChange={e => { setEndDate(e.target.value); setMessage('') }} style={{ width: '100%', background: 'rgba(2,11,24,0.82)', border: '1px solid rgba(59,130,246,0.22)', color: 'white', borderRadius: 7, padding: '8px 10px', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5, fontWeight: 700, letterSpacing: '0.08em' }}>NOTES</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. all teams" style={{ width: '100%', background: 'rgba(2,11,24,0.82)', border: '1px solid rgba(59,130,246,0.22)', color: 'white', borderRadius: 7, padding: '8px 10px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={saving || !rangeIsValid} onClick={scheduleAnnual} style={{ padding: '9px 14px', borderRadius: 7, border: '1px solid rgba(251,191,36,0.35)', background: 'linear-gradient(135deg, rgba(180,83,9,0.28), rgba(217,119,6,0.16))', color: '#fbbf24', fontWeight: 800, cursor: saving ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: rangeIsValid ? 1 : 0.5 }}>
                    {saving ? 'SAVING…' : 'SCHEDULE'}
                  </button>
                  {selectedAnnualEntries.length > 0 && (
                    <button type="button" disabled={saving} onClick={removeAnnualRange} style={{ padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 800, cursor: saving ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                      REMOVE
                    </button>
                  )}
                </div>
              </div>
              {rangeIsValid && <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 11 }}>{formatRange(startDate, endDate)}</p>}
              {selectedHasWeekly && <p style={{ margin: '6px 0 0', color: '#fbbf24', fontSize: 11 }}>⚠ Weekly testing is already scheduled during this range.</p>}
              {message && <p style={{ margin: '8px 0 0', color: message.startsWith('⚠') ? '#fbbf24' : '#34d399', fontSize: 11 }}>{message}</p>}
            </>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>Testing schedule is managed by an administrator.</p>
          )}
        </div>
      </div>
    </section>
  )
}
