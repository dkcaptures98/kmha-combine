'use client'
import { useState, useEffect } from 'react'
import { Athlete, TEAMS, ALL_MONTHS } from '@/types'

export const dynamic = 'force-dynamic'

interface AttendanceRecord {
  id: string
  athlete_id: string
  week_start: string
  status: 'present' | 'absent' | 'injured' | 'excused'
  notes: string
}

interface ScheduleEntry {
  id: string
  week_start: string
  test_type: string
  notes: string
}

const STATUS_CONFIG = {
  present:  { label: 'Present',  color: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.4)',  icon: '✓' },
  absent:   { label: 'Absent',   color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   icon: '✗' },
  injured:  { label: 'Injured',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.4)',  icon: '🤕' },
  excused:  { label: 'Excused',  color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', icon: 'E' },
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0,0,0,0)
  return d
}

export default function AttendancePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const monday = getMonday(new Date())
    return monday.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/schedule').then(r => r.json()).then(setSchedule)
  }, [])

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/athletes?team=${selectedTeam}`).then(r => r.json()).then(setAthletes)
  }, [selectedTeam])

  useEffect(() => {
    if (!selectedTeam || !selectedWeek) return
    setLoading(true)
    fetch(`/api/attendance?week_start=${selectedWeek}`).then(r => r.json()).then(data => {
      const map: Record<string, AttendanceRecord> = {}
      data.forEach((r: AttendanceRecord) => { map[r.athlete_id] = r })
      setAttendance(map)
      setLoading(false)
    })
  }, [selectedTeam, selectedWeek])

  async function setStatus(athleteId: string, status: string) {
    setSaving(p => ({ ...p, [athleteId]: true }))
    await fetch('/api/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, week_start: selectedWeek, status })
    })
    setAttendance(prev => ({ ...prev, [athleteId]: { ...prev[athleteId], athlete_id: athleteId, week_start: selectedWeek, status: status as any } }))
    setSaving(p => ({ ...p, [athleteId]: false }))
  }

  const thisWeekSchedule = schedule.find(s => s.week_start === selectedWeek)
  const sorted = [...athletes].sort((a, b) => a.last_name.localeCompare(b.last_name))
  const presentCount = sorted.filter(a => attendance[a.id]?.status === 'present').length
  const absentCount = sorted.filter(a => attendance[a.id]?.status === 'absent').length
  const injuredCount = sorted.filter(a => attendance[a.id]?.status === 'injured').length
  const unmarkedCount = sorted.filter(a => !attendance[a.id]).length

  // Build week options from schedule + current week
  const monday = getMonday(new Date())
  const scheduleWeeks = [...new Set([
    monday.toISOString().split('T')[0],
    ...schedule.map(s => s.week_start)
  ])].sort().reverse()

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ATTENDANCE</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Track who shows up for each test week</p>
      </div>

      {/* Selectors */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">Select team...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Week</label>
            <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="kmha-select w-full">
              {scheduleWeeks.map(w => {
                const s = schedule.find(sc => sc.week_start === w)
                const d = new Date(w + 'T00:00:00')
                const label = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                return <option key={w} value={w}>{label}{s ? ` — ${s.test_type}` : ' — (current week)'}</option>
              })}
            </select>
          </div>
        </div>
      </div>

      {thisWeekSchedule && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#60a5fa' }}>📅 Test this week: <strong>{thisWeekSchedule.test_type}</strong>{thisWeekSchedule.notes ? ` · ${thisWeekSchedule.notes}` : ''}</p>
        </div>
      )}

      {selectedTeam && athletes.length > 0 && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Present', count: presentCount, ...STATUS_CONFIG.present },
              { label: 'Absent', count: absentCount, ...STATUS_CONFIG.absent },
              { label: 'Injured', count: injuredCount, ...STATUS_CONFIG.injured },
              { label: 'Unmarked', count: unmarkedCount, color: '#334155', bg: 'rgba(255,255,255,0.02)', border: 'rgba(59,130,246,0.1)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '12px 16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: '24px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>{s.count}</p>
                <p style={{ margin: 0, fontSize: '11px', color: s.color, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{s.label.toUpperCase()}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
            <span style={{ alignSelf: 'center', fontSize: '12px', color: '#475569' }}>Mark all:</span>
            {Object.entries(STATUS_CONFIG).map(([status, c]) => (
              <button key={status} onClick={async () => {
                for (const a of sorted) await setStatus(a.id, status)
              }} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                {c.icon} All {c.label}
              </button>
            ))}
          </div>

          {/* Athletes */}
          <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#334155', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {selectedTeam} · {sorted.length} athletes
              </p>
            </div>
            {sorted.map((athlete, i) => {
              const rec = attendance[athlete.id]
              const status = rec?.status || null
              const isSaving = saving[athlete.id]
              return (
                <div key={athlete.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: i < sorted.length - 1 ? '1px solid rgba(59,130,246,0.05)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>{athlete.last_name}, {athlete.first_name}</p>
                  </div>
                  {isSaving && <span style={{ fontSize: '11px', color: '#64748b' }}>saving...</span>}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                      <button key={s} onClick={() => setStatus(athlete.id, s)} style={{
                        width: '32px', height: '32px', borderRadius: '6px', fontSize: '12px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, transition: 'all 0.15s',
                        background: status === s ? c.bg : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${status === s ? c.border : 'rgba(59,130,246,0.08)'}`,
                        color: status === s ? c.color : '#334155',
                        boxShadow: status === s ? `0 0 8px ${c.border}` : 'none',
                      }} title={c.label}>
                        {c.icon}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!selectedTeam && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#475569', margin: 0 }}>Select a team to take attendance</p>
        </div>
      )}
    </div>
  )
}
