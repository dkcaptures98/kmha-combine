'use client'
import { useState, useEffect } from 'react'
import { Athlete, TEAMS } from '@/types'

export const dynamic = 'force-dynamic'

export default function AthleteReportsPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/athletes').then(r => r.json()).then(data => {
      setAthletes(data)
      setLoading(false)
    })
  }, [])

  function openReport(athleteId: string) {
    setGenerating(athleteId)
    window.open(`/athlete-report?id=${athleteId}`, '_blank')
    setTimeout(() => setGenerating(null), 1000)
  }

  function openAllTeamReports() {
    const teamAthletes = filtered
    teamAthletes.forEach((athlete, i) => {
      setTimeout(() => window.open(`/athlete-report?id=${athlete.id}`, '_blank'), i * 300)
    })
  }

  const filtered = athletes.filter(a => {
    const matchTeam = !selectedTeam || a.team === selectedTeam
    const matchSearch = !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase())
    return matchTeam && matchSearch
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ATHLETE REPORT CARDS</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Generate individual PDF performance reports for each player</p>
      </div>

      {/* Filters */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Filter by Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">All Teams</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Search Athlete</label>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
              style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          {filtered.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={openAllTeamReports} style={{ width: '100%', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                🖨 Print All {filtered.length} Reports
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
          Click <strong style={{ color: '#60a5fa' }}>Generate Report</strong> to open a print-ready report card for that athlete. Press <strong style={{ color: '#60a5fa' }}>Cmd+P → Save as PDF</strong> to export. Each report includes personal bests, trend charts, full score history and team percentile rankings.
        </p>
      </div>

      {/* Athletes list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>Loading athletes...</div>
      ) : (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              {filtered.length} ATHLETES
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  {['Athlete', 'Team', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(athlete => (
                  <tr key={athlete.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{athlete.last_name}, {athlete.first_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{athlete.team}</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' as const }}>
                      <button onClick={() => openReport(athlete.id)} disabled={generating === athlete.id}
                        style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: generating === athlete.id ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: generating === athlete.id ? 0.7 : 1 }}>
                        {generating === athlete.id ? 'Opening...' : '🖨 Generate Report'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '13px' }}>No athletes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
