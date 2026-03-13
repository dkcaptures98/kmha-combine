'use client'

import { useState, useEffect } from 'react'
import { Athlete, TEAMS } from '@/types'
import { generateId } from '@/lib/uuid'

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filter, setFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newAthlete, setNewAthlete] = useState({ first_name: '', last_name: '', team: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/athletes')
    setAthletes(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = athletes.filter(a => {
    const nameMatch = !filter || `${a.first_name} ${a.last_name}`.toLowerCase().includes(filter.toLowerCase())
    const teamMatch = !teamFilter || a.team === teamFilter
    return nameMatch && teamMatch
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  async function handleAdd() {
    if (!newAthlete.first_name || !newAthlete.last_name || !newAthlete.team) return
    setSaving(true)
    const athlete = { id: generateId(), ...newAthlete, active: true }
    await fetch('/api/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(athlete),
    })
    setNewAthlete({ first_name: '', last_name: '', team: '' })
    setAdding(false)
    setSaving(false)
    load()
  }

  const teamCounts = TEAMS.reduce((acc, t) => {
    acc[t] = athletes.filter(a => a.team === t).length
    return acc
  }, {} as Record<string, number>)

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-ice-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">ATHLETES</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>{athletes.length} registered athletes</p>
        </div>
        <button onClick={() => setAdding(true)} className="kmha-btn">+ Add Athlete</button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="kmha-card p-4" style={{ borderColor: 'rgba(14,165,233,0.4)' }}>
          <h3 className="font-display text-sm font-semibold tracking-wider mb-3" style={{ color: '#64748b', textTransform: 'uppercase' }}>New Athlete</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              placeholder="First name"
              value={newAthlete.first_name}
              onChange={e => setNewAthlete(p => ({ ...p, first_name: e.target.value }))}
              className="kmha-input"
            />
            <input
              placeholder="Last name"
              value={newAthlete.last_name}
              onChange={e => setNewAthlete(p => ({ ...p, last_name: e.target.value }))}
              className="kmha-input"
            />
            <select
              value={newAthlete.team}
              onChange={e => setNewAthlete(p => ({ ...p, team: e.target.value }))}
              className="kmha-select"
            >
              <option value="">Select team...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving} className="kmha-btn flex-1">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setAdding(false)} className="kmha-btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search athletes..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="kmha-input"
          style={{ minWidth: '200px' }}
        />
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="kmha-select">
          <option value="">All Teams</option>
          {TEAMS.map(t => <option key={t} value={t}>{t} ({teamCounts[t] || 0})</option>)}
        </select>
        <span className="self-center text-sm" style={{ color: '#475569' }}>{filtered.length} athletes</span>
      </div>

      {/* Table */}
      <div className="kmha-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Last Name</th>
                <th className="text-left">First Name</th>
                <th className="text-left">Team</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(athlete => (
                <tr key={athlete.id}>
                  <td className="font-medium" style={{ color: '#e2e8f0' }}>{athlete.last_name}</td>
                  <td style={{ color: '#94a3b8' }}>{athlete.first_name}</td>
                  <td><span className="team-badge">{athlete.team}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8" style={{ color: '#475569' }}>No athletes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
