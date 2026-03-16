'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CombineEntry, Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS } from '@/types'
import { getTeamLeaders, formatScore, getTopChanges } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const SEASONS = [
  { label: '2024-2025 In-Season', months: ['September','October','November','December','January','February','March'], years: [2024,2025], fallYear: 2024, springYear: 2025 },
  { label: '2025 Off-Season', months: ['May','June','July','August'], years: [2025], fallYear: 2025, springYear: 2025 },
  { label: '2025-2026 In-Season', months: ['September','October','November','December','January','February','March'], years: [2025,2026], fallYear: 2025, springYear: 2026 },
  { label: '2026 Off-Season', months: ['May','June','July','August'], years: [2026], fallYear: 2026, springYear: 2026 },
]

function getBestScore(entries: CombineEntry[], test: TestType) {
  const scores = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!scores.length) return null
  return test === 'Sprint' ? Math.min(...scores) : Math.max(...scores)
}

function getAvgScore(entries: CombineEntry[], test: TestType) {
  const scores = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function getGrade(score: number, allScores: number[], lowerBetter: boolean): { grade: string; color: string } {
  if (!allScores.length) return { grade: '—', color: '#64748b' }
  const sorted = [...allScores].sort((a, b) => lowerBetter ? a - b : b - a)
  const rank = sorted.indexOf(score)
  const pct = rank / sorted.length
  if (pct <= 0.1) return { grade: 'A+', color: '#10b981' }
  if (pct <= 0.25) return { grade: 'A', color: '#34d399' }
  if (pct <= 0.45) return { grade: 'B', color: '#60a5fa' }
  if (pct <= 0.65) return { grade: 'C', color: '#fbbf24' }
  if (pct <= 0.80) return { grade: 'D', color: '#f97316' }
  return { grade: 'F', color: '#f87171' }
}

function ReportContent() {
  const params = useSearchParams()
  const team = params.get('team') || ''
  const seasonLabel = params.get('season') || '2025-2026 In-Season'

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState('')

  const season = SEASONS.find(s => s.label === seasonLabel) || SEASONS[2]

  useEffect(() => {
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([a, e]) => {
      setAthletes(a)
      setEntries(e)
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
    })
  }, [])

  const teamAthletes = athletes.filter(a => !team || a.team === team)
  const teamIds = new Set(teamAthletes.map(a => a.id))

  const filteredEntries = entries.filter(e => {
    if (team && e.team !== team) return false
    if (!season.years.includes(e.year)) return false
    if (!season.months.includes(e.month)) return false
    if (season.years.length === 2) {
      const fallMonths = ['September','October','November','December']
      const springMonths = ['January','February','March']
      if (fallMonths.includes(e.month) && e.year !== season.fallYear) return false
      if (springMonths.includes(e.month) && e.year !== season.springYear) return false
    }
    return true
  })

  // Group by team if showing all
  const teamsToShow = team ? [team] : [...new Set(filteredEntries.map(e => e.team))].sort()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <p>Generating report...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', color: '#0f172a', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        @page { margin: 20mm; size: A4; }
        body { margin: 0; }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29,78,216,0.3)' }}>
          🖨 Print / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          ✕ Close
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 40px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '24px', borderBottom: '3px solid #0f172a' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '48px', height: '48px', background: '#1d4ed8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>K</span>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.05em' }}>KITCHENER MINOR HOCKEY ASSOCIATION</h1>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', letterSpacing: '0.08em' }}>COMBINE PERFORMANCE REPORT</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{seasonLabel}</p>
            <p style={{ margin: 0 }}>Generated: {generated}</p>
            <p style={{ margin: 0 }}>CONFIDENTIAL — Senior Leadership</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Executive Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Total Test Entries', value: filteredEntries.length.toLocaleString(), color: '#1d4ed8' },
              { label: 'Athletes Tested', value: new Set(filteredEntries.map(e => e.athlete_id)).size, color: '#059669' },
              { label: 'Teams', value: teamsToShow.length, color: '#7c3aed' },
              { label: 'Test Categories', value: new Set(filteredEntries.map(e => e.test_type)).size, color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Per team sections */}
        {teamsToShow.map((teamName, teamIdx) => {
          const tAthletes = athletes.filter(a => a.team === teamName)
          const tEntries = filteredEntries.filter(e => e.team === teamName)
          if (!tEntries.length) return null

          const leaders = TEST_TYPES.reduce((acc, test) => {
            const l = getTeamLeaders(tEntries, tAthletes, test, 3)
            acc[test] = l
            return acc
          }, {} as Record<TestType, any[]>)

          return (
            <div key={teamName} style={{ marginBottom: '48px' }} className={teamIdx > 0 ? 'page-break' : ''}>
              {/* Team header */}
              <div style={{ background: '#0f172a', color: 'white', padding: '14px 20px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: '#1d4ed8', color: 'white', borderRadius: '6px', padding: '3px 10px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>{teamName}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{seasonLabel}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{tAthletes.length} athletes · {tEntries.length} test entries</span>
              </div>

              {/* Team leaderboards */}
              <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '2px solid #e2e8f0' }}>
                  {TEST_TYPES.map(test => (
                    <div key={test} style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{TEST_LABELS[test]}</p>
                      <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>({TEST_UNITS[test]})</p>
                    </div>
                  ))}
                </div>
                {[0,1,2].map(rank => (
                  <div key={rank} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: rank < 2 ? '1px solid #f1f5f9' : 'none', background: rank === 0 ? 'rgba(251,191,36,0.05)' : 'white' }}>
                    {TEST_TYPES.map(test => {
                      const leader = leaders[test][rank]
                      return (
                        <div key={test} style={{ padding: '8px 14px', borderRight: '1px solid #f1f5f9' }}>
                          {leader ? (
                            <>
                              <p style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: 600, color: rank === 0 ? '#b45309' : '#0f172a' }}>
                                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'} {formatScore(leader.score, test)}
                              </p>
                              <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>{leader.athlete.first_name} {leader.athlete.last_name}</p>
                            </>
                          ) : <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>—</p>}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Athlete table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Athlete</th>
                    {TEST_TYPES.map(test => (
                      <th key={test} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>
                        {TEST_LABELS[test].split(' ')[0]}
                        <br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Best</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...tAthletes].sort((a, b) => a.last_name.localeCompare(b.last_name)).map((athlete, i) => {
                    const aEntries = tEntries.filter(e => e.athlete_id === athlete.id)
                    return (
                      <tr key={athlete.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 500, color: '#0f172a' }}>{athlete.last_name}, {athlete.first_name}</td>
                        {TEST_TYPES.map(test => {
                          const best = getBestScore(aEntries, test)
                          const allBests = tAthletes.map(a => {
                            const e = tEntries.filter(e => e.athlete_id === a.id)
                            return getBestScore(e, test)
                          }).filter(Boolean) as number[]
                          const grade = best !== null ? getGrade(best, allBests, test === 'Sprint') : null
                          return (
                            <td key={test} style={{ padding: '7px 12px', textAlign: 'center' }}>
                              {best !== null ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#0f172a' }}>{formatScore(best, test)}</span>
                                  {grade && <span style={{ fontSize: '10px', fontWeight: 700, color: grade.color, background: `${grade.color}15`, border: `1px solid ${grade.color}40`, borderRadius: '3px', padding: '0 4px' }}>{grade.grade}</span>}
                                </span>
                              ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Team averages row */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' }}>
                <tbody>
                  <tr style={{ background: '#0f172a', color: 'white' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', width: '180px' }}>Team Average</td>
                    {TEST_TYPES.map(test => {
                      const avg = getAvgScore(tEntries, test)
                      return (
                        <td key={test} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {avg !== null ? formatScore(avg, test) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '32px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>KMHA Combine Performance Tracker · kmha-combine.vercel.app</span>
          <span>CONFIDENTIAL — For internal use only</span>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p>Loading...</p></div>}><ReportContent /></Suspense>
}
