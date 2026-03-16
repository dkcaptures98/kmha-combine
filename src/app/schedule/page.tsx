'use client'
import { useState, useEffect } from 'react'
import { TEST_LABELS, TestType, TEST_TYPES } from '@/types'
import { getUserPermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

interface ScheduleEntry {
  id: string
  week_start: string
  test_type: string
  notes: string
}

const TEST_COLORS: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  Sprint:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   color: '#f87171', dot: '#ef4444' },
  Vertical:  { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  color: '#60a5fa', dot: '#3b82f6' },
  Chinups:   { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  color: '#34d399', dot: '#10b981' },
  ChinHold:  { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  color: '#34d399', dot: '#10b981' },
  BroadJump: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  color: '#fbbf24', dot: '#f59e0b' },
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0,0,0,0)
  return d
}

function toDateInput(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekLabel(dateStr: string) {
  const start = new Date(dateStr + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function isThisWeek(dateStr: string) {
  return getMonday(new Date()).toDateString() === new Date(dateStr + 'T00:00:00').toDateString()
}

function isPast(dateStr: string) {
  return new Date(dateStr + 'T00:00:00') < getMonday(new Date())
}

function groupByWeek(entries: ScheduleEntry[]) {
  const map: Record<string, ScheduleEntry[]> = {}
  entries.forEach(e => {
    if (!map[e.week_start]) map[e.week_start] = []
    map[e.week_start].push(e)
  })
  return map
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newWeek, setNewWeek] = useState(toDateInput(getMonday(new Date())))
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getUserPermissions().then(p => setIsAdmin(p.role === 'superadmin' || p.role === 'admin'))
    loadSchedule()
  }, [])

  async function loadSchedule() {
    setLoading(true)
    const res = await fetch('/api/schedule')
    if (res.ok) setSchedule(await res.json())
    setLoading(false)
  }

  function toggleTest(test: string) {
    setSelectedTests(prev =>
      prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeek || !selectedTests.length) return
    setSaving(true)
    const monday = getMonday(new Date(newWeek + 'T12:00:00'))
    const weekStr = toDateInput(monday)

    for (const test of selectedTests) {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStr, test_type: test, notes: newNotes })
      })
    }

    setNewNotes('')
    setSelectedTests([])
    setAdding(false)
    setSaving(false)
    loadSchedule()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    loadSchedule()
  }

  const grouped = groupByWeek(schedule)
  const upcoming = Object.entries(grouped).filter(([w]) => !isPast(w)).sort((a, b) => a[0].localeCompare(b[0]))
  const past = Object.entries(grouped).filter(([w]) => isPast(w)).sort((a, b) => b[0].localeCompare(a[0]))
  const thisWeekEntries = grouped[toDateInput(getMonday(new Date()))] || []

  const inputStyle = { width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, colorScheme: 'dark' as const }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>COMBINE SCHEDULE</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Live testing calendar — updates in real time</p>
        </div>
        {isAdmin && (
          <button onClick={() => setAdding(!adding)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: adding ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: adding ? '1px solid rgba(59,130,246,0.2)' : 'none', color: 'white' }}>
            {adding ? 'Cancel' : '+ Add Week'}
          </button>
        )}
      </div>

      {/* This week banner */}
      {thisWeekEntries.length > 0 && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#60a5fa', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>THIS WEEK — {getWeekLabel(toDateInput(getMonday(new Date())))}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
            {thisWeekEntries.map(entry => {
              const c = TEST_COLORS[entry.test_type] || TEST_COLORS.Sprint
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px 14px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, boxShadow: `0 0 6px ${c.dot}` }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: c.color, fontFamily: 'var(--font-display)' }}>{TEST_LABELS[entry.test_type as TestType] || entry.test_type}</span>
                  {entry.notes && <span style={{ fontSize: '11px', color: '#475569' }}>· {entry.notes}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!thisWeekEntries.length && !loading && (
        <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '10px', padding: '14px 20px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>No tests scheduled for this week — check back soon.</p>
        </div>
      )}

      {/* Add form */}
      {adding && isAdmin && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#60a5fa', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Schedule a Test Week</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Week</label>
                <input
                  type="date"
                  value={newWeek}
                  onChange={e => setNewWeek(e.target.value)}
                  required
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#334155' }}>Snaps to Monday of selected week</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. U14+ only, bring cones"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                Tests This Week — select all that apply
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                {TEST_TYPES.map(test => {
                  const sel = selectedTests.includes(test)
                  const c = TEST_COLORS[test] || TEST_COLORS.Sprint
                  return (
                    <button key={test} type="button" onClick={() => toggleTest(test)} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px',
                      background: sel ? c.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${sel ? c.border : 'rgba(59,130,246,0.1)'}`,
                      color: sel ? c.color : '#475569',
                    }}>
                      {sel ? '✓ ' : ''}{TEST_LABELS[test]}
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={saving || !selectedTests.length || !newWeek}
              style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: saving || !selectedTests.length || !newWeek ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: saving || !selectedTests.length || !newWeek ? 0.5 : 1 }}>
              {saving ? 'Saving...' : `Save ${selectedTests.length > 0 ? selectedTests.length : ''} Test${selectedTests.length !== 1 ? 's' : ''} to Schedule`}
            </button>
          </form>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Upcoming</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
            {upcoming.map(([weekStart, weekEntries]) => {
              const current = isThisWeek(weekStart)
              return (
                <div key={weekStart} style={{ background: current ? 'rgba(59,130,246,0.06)' : 'rgba(10,20,40,0.8)', border: `1px solid ${current ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.1)'}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>{getWeekLabel(weekStart)}</p>
                    {current && <span style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '4px', padding: '1px 6px', fontSize: '9px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>THIS WEEK</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
                    {weekEntries.map(entry => {
                      const c = TEST_COLORS[entry.test_type] || TEST_COLORS.Sprint
                      return (
                        <div key={entry.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                            {TEST_LABELS[entry.test_type as TestType] || entry.test_type}
                          </span>
                          {isAdmin && (
                            <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '4px', padding: '3px 7px', fontSize: '10px', cursor: 'pointer' }}>
                              {deletingId === entry.id ? '...' : '✕'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {weekEntries[0]?.notes && <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#334155' }}>Note: {weekEntries[0].notes}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#334155', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Past</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
            {past.map(([weekStart, weekEntries]) => (
              <div key={weekStart} style={{ background: 'rgba(10,20,40,0.4)', border: '1px solid rgba(59,130,246,0.05)', borderRadius: '8px', padding: '10px 16px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: '12px', color: '#334155' }}>{getWeekLabel(weekStart)}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                  {weekEntries.map(entry => (
                    <span key={entry.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.08)', color: '#475569', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                      {TEST_LABELS[entry.test_type as TestType] || entry.test_type}
                    </span>
                  ))}
                </div>
                {isAdmin && weekEntries.map(entry => (
                  <button key={entry.id} onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.12)', color: '#334155', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', cursor: 'pointer' }}>
                    {deletingId === entry.id ? '...' : '✕'}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && schedule.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#334155' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📅</p>
          <p style={{ fontSize: '14px', margin: 0 }}>No tests scheduled yet{isAdmin ? ' — click + Add Week to get started' : ''}</p>
        </div>
      )}
    </div>
  )
}
