'use client'
import { useState, useEffect } from 'react'
import { TEST_LABELS, TEST_UNITS, TestType } from '@/types'
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0,0,0,0)
  return d
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getWeekLabel(dateStr: string) {
  const start = new Date(dateStr + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function isThisWeek(dateStr: string) {
  const monday = getMonday(new Date())
  const weekStart = new Date(dateStr + 'T00:00:00')
  return monday.toDateString() === weekStart.toDateString()
}

function isPast(dateStr: string) {
  const monday = getMonday(new Date())
  const weekStart = new Date(dateStr + 'T00:00:00')
  return weekStart < monday
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newWeek, setNewWeek] = useState('')
  const [newTest, setNewTest] = useState<string>('Sprint')
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeek || !newTest) return
    setSaving(true)
    // Snap to Monday
    const monday = getMonday(new Date(newWeek + 'T00:00:00'))
    const weekStr = monday.toISOString().split('T')[0]
    await fetch('/api/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStr, test_type: newTest, notes: newNotes })
    })
    setNewWeek(''); setNewNotes(''); setAdding(false); setSaving(false)
    loadSchedule()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    loadSchedule()
  }

  const today = getMonday(new Date())
  const upcoming = schedule.filter(s => !isPast(s.week_start))
  const past = schedule.filter(s => isPast(s.week_start)).reverse()
  const thisWeek = schedule.find(s => isThisWeek(s.week_start))

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
      {thisWeek && (
        <div style={{ background: TEST_COLORS[thisWeek.test_type]?.bg || 'rgba(59,130,246,0.08)', border: `1px solid ${TEST_COLORS[thisWeek.test_type]?.border || 'rgba(59,130,246,0.25)'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: TEST_COLORS[thisWeek.test_type]?.bg, border: `1px solid ${TEST_COLORS[thisWeek.test_type]?.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            {thisWeek.test_type === 'Sprint' ? '⚡' : thisWeek.test_type === 'Vertical' ? '↑' : thisWeek.test_type === 'BroadJump' ? '→' : '💪'}
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: TEST_COLORS[thisWeek.test_type]?.color, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>THIS WEEK</p>
            <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[thisWeek.test_type as TestType] || thisWeek.test_type}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{getWeekLabel(thisWeek.week_start)}{thisWeek.notes ? ` · ${thisWeek.notes}` : ''}</p>
          </div>
        </div>
      )}

      {!thisWeek && !loading && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>No test scheduled for this week — check back soon or contact your coach.</p>
        </div>
      )}

      {/* Add form */}
      {adding && isAdmin && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#60a5fa', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Schedule a Test Week</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Week (any day)</label>
                <input type="date" value={newWeek} onChange={e => setNewWeek(e.target.value)} required
                  style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#334155' }}>Will snap to Monday of that week</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Test</label>
                <select value={newTest} onChange={e => setNewTest(e.target.value)} style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', appearance: 'none' as const }}>
                  {Object.entries(TEST_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Notes (optional)</label>
                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="e.g. U14+ only, bring cones"
                  style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save to Schedule'}
            </button>
          </form>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Upcoming</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
            {upcoming.map(entry => {
              const c = TEST_COLORS[entry.test_type] || TEST_COLORS.Sprint
              const current = isThisWeek(entry.week_start)
              return (
                <div key={entry.id} style={{ background: current ? c.bg : 'rgba(10,20,40,0.8)', border: `1px solid ${current ? c.border : 'rgba(59,130,246,0.12)'}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.dot, flexShrink: 0, boxShadow: current ? `0 0 8px ${c.dot}` : 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: current ? c.color : '#e2e8f0', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[entry.test_type as TestType] || entry.test_type}</span>
                      {current && <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: '4px', padding: '1px 6px', fontSize: '9px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>THIS WEEK</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                      {getWeekLabel(entry.week_start)}
                      {entry.notes && <span style={{ marginLeft: '8px', color: '#334155' }}>· {entry.notes}</span>}
                    </p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                      {deletingId === entry.id ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#334155', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Past</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
            {past.map(entry => {
              const c = TEST_COLORS[entry.test_type] || TEST_COLORS.Sprint
              return (
                <div key={entry.id} style={{ background: 'rgba(10,20,40,0.4)', border: '1px solid rgba(59,130,246,0.06)', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.6 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#334155', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[entry.test_type as TestType] || entry.test_type}</span>
                    <span style={{ marginLeft: '10px', fontSize: '11px', color: '#334155' }}>{getWeekLabel(entry.week_start)}</span>
                    {entry.notes && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1e3a5f' }}>· {entry.notes}</span>}
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#475569', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer' }}>
                      {deletingId === entry.id ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && schedule.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#334155' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📅</p>
          <p style={{ fontSize: '14px', margin: 0 }}>No tests scheduled yet{isAdmin ? ' — click + Add Week to get started' : ' — check back soon'}</p>
        </div>
      )}
    </div>
  )
}
