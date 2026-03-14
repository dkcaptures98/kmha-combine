'use client'

import { useState, useEffect, useMemo } from 'react'
import { CombineEntry, Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS } from '@/types'
import { getTeamLeaders, getTopChanges, formatScore } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const SEASON_MONTHS = ['September', 'October', 'November', 'December', 'January', 'February', 'March']
const ALL_MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(37,99,235,0.12)' : 'rgba(10,20,40,0.8)', border: `1px solid ${accent ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.12)'}`, borderRadius: '10px', padding: '20px 24px' }}>
      <p style={{ color: '#475569', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>{label}</p>
      <p style={{ color: accent ? '#60a5fa' : '#f0f4f8', fontSize: '32px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>{value}</p>
    </div>
  )
}

function Leaderboard({ testType, entries, athletes }: { testType: TestType; entries: CombineEntry[]; athletes: Athlete[] }) {
  const leaders = getTeamLeaders(entries, athletes, testType, 5)
  const medals = ['#FFB800', '#94a3b8', '#cd7f32']
  return (
    <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[testType]}</h3>
        <span style={{ fontSize: '11px', color: '#334155', fontFamily: 'var(--font-display)' }}>{TEST_UNITS[testType]}</span>
      </div>
      {leaders.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: '24px', fontSize: '13px', margin: 0 }}>No data</p>}
      {leaders.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: i < leaders.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none', background: i === 0 ? 'rgba(255,184,0,0.04)' : 'transparent' }}>
          <span style={{ width: '20px', textAlign: 'center', fontSize: '16px', flexShrink: 0 }}>
            {i < 3 ? <span style={{ color: medals[i], fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '14px' }}>{i + 1}</span> : <span style={{ color: '#334155', fontFamily: 'var(--font-display)', fontSize: '13px' }}>{i + 1}</span>}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.athlete.first_name} {l.athlete.last_name}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#334155' }}><span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{l.athlete.team}</span></p>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: i === 0 ? '#FFB800' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#475569', flexShrink: 0 }}>{formatScore(l.score, testType)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTest, setActiveTest] = useState<TestType>('Sprint')
  const [view, setView] = useState<'leaderboard' | 'changes'>('leaderboard')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([...TEAMS])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([...SEASON_MONTHS])

  useEffect(() => {
    Promise.all([fetch('/api/athletes').then(r => r.json()), fetch('/api/entries').then(r => r.json())])
      .then(([a, e]) => { setAthletes(a); setEntries(e); setLoading(false) })
  }, [])

  const availableYears = useMemo(() => [...new Set(entries.map(e => e.year))].sort().reverse(), [entries])

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (selectedTeams.length > 0 && !selectedTeams.includes(e.team)) return false
    if (selectedYear && e.year !== selectedYear) return false
    if (selectedMonths.length > 0 && !selectedMonths.includes(e.month)) return false
    return true
  }), [entries, selectedTeams, selectedYear, selectedMonths])

  const filteredAthletes = useMemo(() => selectedTeams.length === 0 ? athletes : athletes.filter(a => selectedTeams.includes(a.team)), [athletes, selectedTeams])

  function toggleTeam(team: string) {
    setSelectedTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team])
  }
  function toggleMonth(month: string) {
    setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month])
  }

  const topChanges = useMemo(() => getTopChanges(filteredEntries, filteredAthletes, activeTest, 50), [filteredEntries, filteredAthletes, activeTest])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#475569', fontSize: '13px' }}>Loading combine data...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>COMBINE DASHBOARD</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Kitchener Minor Hockey Association</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
          <span style={{ color: '#475569', fontSize: '12px' }}>Live Data</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Tests" value={filteredEntries.length.toLocaleString()} accent />
        <StatCard label="Athletes" value={new Set(filteredEntries.map(e => e.athlete_id)).size} />
        <StatCard label="Teams" value={new Set(filteredEntries.map(e => e.team)).size} />
      </div>

      {/* Filters */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        {/* Teams */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>Teams</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setSelectedTeams([...TEAMS])} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}>All</button>
              <button onClick={() => setSelectedTeams([])} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '12px', cursor: 'pointer', padding: 0 }}>None</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TEAMS.map(team => (
              <button key={team} onClick={() => toggleTeam(team)} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s', background: selectedTeams.includes(team) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedTeams.includes(team) ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`, color: selectedTeams.includes(team) ? '#60a5fa' : '#334155' }}>
                {team}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Year */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Year</label>
            <select value={selectedYear ?? ''} onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)} className="kmha-select w-full">
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Season preset */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Season</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setSelectedMonths([...SEASON_MONTHS])} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s', background: selectedMonths.length === SEASON_MONTHS.length && SEASON_MONTHS.every(m => selectedMonths.includes(m)) ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedMonths.length === SEASON_MONTHS.length && SEASON_MONTHS.every(m => selectedMonths.includes(m)) ? 'rgba(52,211,153,0.4)' : 'rgba(59,130,246,0.1)'}`, color: selectedMonths.length === SEASON_MONTHS.length && SEASON_MONTHS.every(m => selectedMonths.includes(m)) ? '#34d399' : '#475569' }}>In-Season</button>
              <button onClick={() => setSelectedMonths(['May','June','July','August'])} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.1)', color: '#475569' }}>Off-Season</button>
            </div>
          </div>
        </div>

        {/* Months */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Months</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ALL_MONTHS_LIST.map(month => (
              <button key={month} onClick={() => toggleMonth(month)} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s', background: selectedMonths.includes(month) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedMonths.includes(month) ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`, color: selectedMonths.includes(month) ? '#60a5fa' : '#334155' }}>
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TEST_TYPES.map(test => (
          <button key={test} onClick={() => setActiveTest(test)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s', background: activeTest === test ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeTest === test ? '#2563eb' : 'rgba(59,130,246,0.1)'}`, color: activeTest === test ? 'white' : '#475569', boxShadow: activeTest === test ? '0 4px 12px rgba(37,99,235,0.25)' : 'none' }}>
            {TEST_LABELS[test]}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['leaderboard', 'changes'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s', background: view === v ? 'rgba(59,130,246,0.15)' : 'transparent', border: `1px solid ${view === v ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`, color: view === v ? '#60a5fa' : '#475569' }}>
            {v === 'leaderboard' ? 'Leaderboards' : 'Most Improved'}
          </button>
        ))}
      </div>

      {/* Leaderboards */}
      {view === 'leaderboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {TEST_TYPES.map(test => <Leaderboard key={test} testType={test} entries={filteredEntries} athletes={filteredAthletes} />)}
        </div>
      )}

      {/* Most Improved */}
      {view === 'changes' && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[activeTest]} — Most Improved</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Athlete', 'Team', 'Start', 'Latest', 'Improvement'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Athlete' ? 'left' : 'right', fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topChanges.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#334155', fontSize: '13px' }}>No improvement data available</td></tr>}
                {[...topChanges].sort((a, b) => a.athlete.last_name.localeCompare(b.athlete.last_name)).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '10px 16px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{c.athlete.last_name}, {c.athlete.first_name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}><span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{c.athlete.team}</span></td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>{formatScore(c.firstScore, activeTest)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontSize: '13px' }}>{formatScore(c.latestScore, activeTest)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#34d399', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>+{c.change.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
