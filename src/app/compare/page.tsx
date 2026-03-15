'use client'
import { useState, useEffect, useMemo } from 'react'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS } from '@/types'
import { getTeamLeaders, formatScore } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export default function ComparePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [teamA, setTeamA] = useState('U14AAA')
  const [teamB, setTeamB] = useState('U14AA')

  useEffect(() => {
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([a, e]) => { setAthletes(a); setEntries(e); setLoading(false) })
  }, [])

  const athletesA = useMemo(() => athletes.filter(a => a.team === teamA), [athletes, teamA])
  const athletesB = useMemo(() => athletes.filter(a => a.team === teamB), [athletes, teamB])
  const entriesA = useMemo(() => entries.filter(e => e.team === teamA), [entries, teamA])
  const entriesB = useMemo(() => entries.filter(e => e.team === teamB), [entries, teamB])

  function getTeamAvg(teamEntries: CombineEntry[], test: TestType) {
    const scores = teamEntries.filter(e => e.test_type === test).map(e => e.score)
    if (!scores.length) return null
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  function getTeamBest(teamEntries: CombineEntry[], teamAthletes: Athlete[], test: TestType) {
    const leaders = getTeamLeaders(teamEntries, teamAthletes, test, 1)
    return leaders[0] || null
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%' }} />
    </div>
  )

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>TEAM COMPARISON</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Compare performance across two teams</p>
      </div>

      {/* Team selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '2px solid rgba(59,130,246,0.4)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Team A</label>
          <select value={teamA} onChange={e => setTeamA(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em', outline: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
            {TEAMS.map(t => <option key={t} value={t} style={{ background: '#0a1428', color: 'white' }}>{t}</option>)}
          </select>
          <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '12px' }}>{athletesA.length} athletes · {entriesA.length} tests</p>
        </div>
        <div style={{ textAlign: 'center', color: '#334155', fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>VS</div>
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Team B</label>
          <select value={teamB} onChange={e => setTeamB(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em', outline: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
            {TEAMS.map(t => <option key={t} value={t} style={{ background: '#0a1428', color: 'white' }}>{t}</option>)}
          </select>
          <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '12px' }}>{athletesB.length} athletes · {entriesB.length} tests</p>
        </div>
      </div>

      {/* Comparison cards per test */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {TEST_TYPES.map(test => {
          const avgA = getTeamAvg(entriesA, test)
          const avgB = getTeamAvg(entriesB, test)
          const bestA = getTeamBest(entriesA, athletesA, test)
          const bestB = getTeamBest(entriesB, athletesB, test)
          const aWins = avgA !== null && avgB !== null && (test === 'Sprint' ? avgA < avgB : avgA > avgB)
          const bWins = avgA !== null && avgB !== null && (test === 'Sprint' ? avgB < avgA : avgB > avgA)

          return (
            <div key={test} style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(59,130,246,0.04)' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[test]}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0' }}>
                {/* Team A */}
                <div style={{ padding: '20px', borderRight: '1px solid rgba(59,130,246,0.08)', background: aWins ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-display)' }}>{teamA}</span>
                    {aWins && <span style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>LEADS</span>}
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 700, color: aWins ? '#60a5fa' : '#475569', fontFamily: 'var(--font-display)' }}>
                    {avgA !== null ? formatScore(avgA, test) : '—'}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#334155' }}>Team avg</p>
                  {bestA && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Best: <span style={{ color: '#fbbf24' }}>{formatScore(bestA.score, test)}</span> — {bestA.athlete.first_name} {bestA.athlete.last_name}</p>}
                </div>
                {/* Middle divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', color: '#1e3a5f', fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>VS</div>
                {/* Team B */}
                <div style={{ padding: '20px', background: bWins ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-display)' }}>{teamB}</span>
                    {bWins && <span style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>LEADS</span>}
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 700, color: bWins ? '#f87171' : '#475569', fontFamily: 'var(--font-display)' }}>
                    {avgB !== null ? formatScore(avgB, test) : '—'}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#334155' }}>Team avg</p>
                  {bestB && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Best: <span style={{ color: '#fbbf24' }}>{formatScore(bestB.score, test)}</span> — {bestB.athlete.first_name} {bestB.athlete.last_name}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
