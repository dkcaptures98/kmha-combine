'use client'

import { useState, useEffect } from 'react'
import { Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS, ALL_MONTHS } from '@/types'
import { generateId } from '@/lib/uuid'

export default function EntryPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()])
  const [scores, setScores] = useState<Record<string, Partial<Record<TestType, string>>>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const years = [2024, 2025, 2026, 2027, 2028]

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/athletes?team=${selectedTeam}`)
      .then(r => r.json())
      .then(data => {
        setAthletes(data)
        setScores({})
      })
  }, [selectedTeam])

  function setScore(athleteId: string, test: TestType, value: string) {
    setScores(prev => ({
      ...prev,
      [athleteId]: { ...(prev[athleteId] || {}), [test]: value }
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const entries: any[] = []
    athletes.forEach(athlete => {
      const athleteScores = scores[athlete.id] || {}
      TEST_TYPES.forEach(test => {
        const rawVal = athleteScores[test]
        if (rawVal === undefined || rawVal === '') return
        const score = parseFloat(rawVal)
        if (isNaN(score)) return
        entries.push({
          id: generateId(),
          athlete_id: athlete.id,
          athlete_name: `${athlete.first_name} ${athlete.last_name}`,
          team: athlete.team,
          score,
          month: selectedMonth,
          year: selectedYear,
          test_type: test,
        })
      })
    })

    if (entries.length === 0) {
      setError('No scores entered.')
      setSaving(false)
      return
    }

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    })

    if (res.ok) {
      setSaved(true)
      setScores({})
    } else {
      const data = await res.json()
      setError(data.error || 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-wide">DATA ENTRY</h1>
        <p className="text-sm mt-0.5" style={{ color: '#475569' }}>Enter combine test results by team</p>
      </div>

      {/* Selectors */}
      <div className="kmha-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
              Team
            </label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">Select team...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
              Month
            </label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="kmha-select w-full">
              {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
              Year
            </label>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="kmha-select w-full">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Entry table */}
      {selectedTeam && athletes.length > 0 && (
        <div className="kmha-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1e3a5f' }}>
            <div>
              <h2 className="font-display font-bold text-lg tracking-wide">{selectedTeam}</h2>
              <p className="text-xs" style={{ color: '#475569' }}>{selectedMonth} {selectedYear} — {athletes.length} athletes</p>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                  ✓ Saved
                </span>
              )}
              {error && (
                <span className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {error}
                </span>
              )}
              <button onClick={handleSave} disabled={saving} className="kmha-btn">
                {saving ? 'Saving...' : 'Save Results'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Athlete</th>
                  {TEST_TYPES.map(test => (
                    <th key={test} className="text-center">
                      {TEST_LABELS[test]}
                      <span className="block font-normal" style={{ textTransform: 'none', letterSpacing: 0, color: '#334155' }}>
                        ({TEST_UNITS[test]})
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...athletes].sort((a, b) => a.last_name.localeCompare(b.last_name)).map(athlete => (
                  <tr key={athlete.id}>
                    <td style={{ color: '#e2e8f0', minWidth: '150px' }}>
                      <span className="font-medium">{athlete.last_name}</span>
                      <span style={{ color: '#64748b' }}>, {athlete.first_name}</span>
                    </td>
                    {TEST_TYPES.map(test => (
                      <td key={test} className="text-center" style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={scores[athlete.id]?.[test] ?? ''}
                          onChange={e => setScore(athlete.id, test, e.target.value)}
                          className="kmha-input text-center"
                          style={{ width: '90px', padding: '4px 8px' }}
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 flex justify-end" style={{ borderTop: '1px solid #1e3a5f' }}>
            <button onClick={handleSave} disabled={saving} className="kmha-btn">
              {saving ? 'Saving...' : 'Save Results'}
            </button>
          </div>
        </div>
      )}

      {selectedTeam && athletes.length === 0 && (
        <div className="kmha-card p-8 text-center">
          <p style={{ color: '#475569' }}>No athletes found for {selectedTeam}.</p>
          <p className="text-sm mt-1" style={{ color: '#334155' }}>Add athletes via the Athletes page or import a CSV.</p>
        </div>
      )}

      {!selectedTeam && (
        <div className="kmha-card p-8 text-center">
          <p style={{ color: '#475569' }}>Select a team to begin entering results.</p>
        </div>
      )}
    </div>
  )
}
