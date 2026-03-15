'use client'
import { useState, useEffect, useRef } from 'react'
import { Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS, ALL_MONTHS } from '@/types'
import { generateId } from '@/lib/uuid'

export const dynamic = 'force-dynamic'

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

export default function EntryPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()])
  const [scores, setScores] = useState<Record<string, Partial<Record<TestType, string>>>>({})
  const [entryIds, setEntryIds] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving'|'saved'|'deleted'|''>>({})
  const timers = useRef<Record<string, any>>({})

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/athletes?team=${selectedTeam}`).then(r => r.json()).then(data => {
      setAthletes(data); setScores({}); setEntryIds({})
    })
  }, [selectedTeam])

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/entries?team=${selectedTeam}&year=${selectedYear}&month=${selectedMonth}`)
      .then(r => r.json()).then((data: any[]) => {
        const s: Record<string, Partial<Record<TestType, string>>> = {}
        const ids: Record<string, string> = {}
        data.forEach(e => {
          if (!s[e.athlete_id]) s[e.athlete_id] = {}
          s[e.athlete_id][e.test_type as TestType] = e.score.toString()
          ids[`${e.athlete_id}-${e.test_type}`] = e.id
        })
        setScores(s)
        setEntryIds(ids)
      })
  }, [selectedTeam, selectedYear, selectedMonth])

  function setScore(athleteId: string, test: TestType, value: string, name: string, team: string) {
    setScores(prev => ({ ...prev, [athleteId]: { ...(prev[athleteId] || {}), [test]: value } }))
    const key = `${athleteId}-${test}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      setSaveStatus(p => ({ ...p, [key]: 'saving' }))
      if (value === '') {
        const existingId = entryIds[key]
        if (existingId) {
          await fetch(`/api/entries?id=${existingId}`, { method: 'DELETE' })
          setEntryIds(prev => { const n = { ...prev }; delete n[key]; return n })
          setSaveStatus(p => ({ ...p, [key]: 'deleted' }))
        } else {
          setSaveStatus(p => ({ ...p, [key]: '' }))
        }
      } else if (!isNaN(parseFloat(value))) {
        const existingId = entryIds[key]
        const id = existingId || generateId()
        await fetch('/api/entries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ id, athlete_id: athleteId, athlete_name: name, team, score: parseFloat(value), month: selectedMonth, year: selectedYear, test_type: test }])
        })
        if (!existingId) setEntryIds(prev => ({ ...prev, [key]: id }))
        setSaveStatus(p => ({ ...p, [key]: 'saved' }))
      }
      setTimeout(() => setSaveStatus(p => ({ ...p, [key]: '' })), 2000)
    }, 800)
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>DATA ENTRY</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Auto-saves as you type · Clear a field to delete that entry</p>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">Select team...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value as any)} className="kmha-select w-full">
              {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="kmha-select w-full">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedTeam && athletes.length > 0 && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'white' }}>{selectedTeam}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>{selectedMonth} {selectedYear} · {athletes.length} athletes</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
              <span style={{ fontSize: '11px', color: '#34d399' }}>Live</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>Athlete</th>
                  {TEST_TYPES.map(test => (
                    <th key={test} style={{ padding: '10px 16px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>
                      {TEST_LABELS[test]}<br/><span style={{ fontSize: '10px', color: '#1e3a5f', textTransform: 'none' as const, letterSpacing: 0 }}>({TEST_UNITS[test]})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...athletes].sort((a, b) => a.last_name.localeCompare(b.last_name)).map(athlete => (
                  <tr key={athlete.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '8px 16px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                      <a href={`/athlete?id=${athlete.id}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
                        {athlete.last_name}, {athlete.first_name}
                      </a>
                    </td>
                    {TEST_TYPES.map(test => {
                      const key = `${athlete.id}-${test}`
                      const status = saveStatus[key]
                      const hasValue = scores[athlete.id]?.[test] !== undefined && scores[athlete.id]?.[test] !== ''
                      return (
                        <td key={test} style={{ padding: '6px 8px', textAlign: 'center' as const }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number" step="0.01" min="0"
                              value={scores[athlete.id]?.[test] ?? ''}
                              onChange={e => setScore(athlete.id, test, e.target.value, `${athlete.first_name} ${athlete.last_name}`, athlete.team)}
                              style={{ width: '80px', background: hasValue ? 'rgba(5,15,35,0.9)' : 'rgba(5,15,35,0.4)', border: `1px solid ${status === 'saved' ? 'rgba(52,211,153,0.5)' : status === 'deleted' ? 'rgba(239,68,68,0.4)' : hasValue ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.1)'}`, color: 'white', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', textAlign: 'center' as const, outline: 'none', transition: 'border-color 0.15s' }}
                              placeholder="—"
                            />
                            <span style={{ fontSize: '11px', width: '14px', color: status === 'saving' ? '#64748b' : status === 'saved' ? '#34d399' : status === 'deleted' ? '#f87171' : 'transparent' }}>
                              {status === 'saving' ? '…' : status === 'saved' ? '✓' : status === 'deleted' ? '✕' : '·'}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTeam && athletes.length === 0 && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#475569', margin: 0 }}>No athletes found for {selectedTeam}</p>
        </div>
      )}

      {!selectedTeam && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#475569', margin: 0 }}>Select a team to begin</p>
        </div>
      )}
    </div>
  )
}
