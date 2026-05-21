'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore, broadJumpToInches, inchesToDisplay } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = [
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
]

function sortEntries(entries: CombineEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })
}

function getBest(entries: CombineEntry[], test: TestType) {
  const scores = entries
    .filter(e => e.test_type === test && Number.isFinite(e.score))
    .map(e => e.score)

  if (!scores.length) return null

  return test === 'Sprint' ? Math.min(...scores) : Math.max(...scores)
}

function getFirst(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test && Number.isFinite(e.score)))
  return sorted[0]?.score ?? null
}

function getLatest(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test && Number.isFinite(e.score)))
  return sorted[sorted.length - 1]?.score ?? null
}

function getTeamAge(team: string): number | null {
  const match = team.match(/U(\d+)/i)
  return match ? Number(match[1]) : null
}

function isLRTeam(team: string) {
  return /LR/i.test(team)
}

function isAAATeam(team: string) {
  return /AAA/i.test(team) && !isLRTeam(team)
}


function getAvailableTeamsForTest(entries: CombineEntry[], test: TestType) {
  return Array.from(
    new Set(
      entries
        .filter(e => e.test_type === test && Number.isFinite(e.score) && e.team)
        .map(e => e.team)
    )
  )
}

function getAverageForTeam(entries: CombineEntry[], team: string, test: TestType) {
  const scores = entries
    .filter(e => e.team === team && e.test_type === test && Number.isFinite(e.score))
    .map(e => e.score)

  if (!scores.length) return null

  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function getAverageForTeams(entries: CombineEntry[], teams: string[], test: TestType) {
  const scores = entries
    .filter(e => teams.includes(e.team) && e.test_type === test && Number.isFinite(e.score))
    .map(e => e.score)

  if (!scores.length) return null

  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function isStandardAgeTeam(team: string, age: number) {
  return new RegExp(`^U${age}(A|AA|AAA)$`, 'i').test(team)
}

function getAvailableStandardTeamsForAge(entries: CombineEntry[], age: number, test: TestType) {
  return Array.from(
    new Set(
      entries
        .filter(e => isStandardAgeTeam(e.team, age) && e.test_type === test && Number.isFinite(e.score))
        .map(e => e.team)
    )
  )
}

function getNextAvailableStandardAge(entries: CombineEntry[], age: number, test: TestType) {
  const ages = Array.from(
    new Set(
      entries
        .filter(e => !isLRTeam(e.team) && e.test_type === test && Number.isFinite(e.score))
        .map(e => getTeamAge(e.team))
        .filter((value): value is number => value !== null && value > age)
    )
  ).sort((a, b) => a - b)

  return ages[0] ?? null
}

function getBenchmarkList(athleteTeam: string, allEntries: CombineEntry[], test: TestType) {
  const athleteAge = getTeamAge(athleteTeam)
  if (!athleteAge) return []

  const benchmarks: { label: string; average: number; sourceTeam: string }[] = []

  if (isLRTeam(athleteTeam)) {
    const availableLRTeams = getAvailableTeamsForTest(allEntries, test)
      .filter(team => isLRTeam(team))
      .map(team => ({
        team,
        age: getTeamAge(team),
      }))
      .filter((item): item is { team: string; age: number } => item.age !== null)

    const sameAgeLRTeams = availableLRTeams
      .filter(item => item.age === athleteAge)
      .map(item => item.team)

    const sameAgeAverage = getAverageForTeams(allEntries, sameAgeLRTeams, test)

    if (sameAgeAverage !== null) {
      benchmarks.push({
        label: `U${athleteAge} LR Average`,
        average: sameAgeAverage,
        sourceTeam: sameAgeLRTeams.join(', '),
      })
    }

    const nextLRAge = availableLRTeams
      .map(item => item.age)
      .filter(age => age > athleteAge)
      .sort((a, b) => a - b)[0] ?? null

    if (nextLRAge !== null) {
      const nextLRTeams = availableLRTeams
        .filter(item => item.age === nextLRAge)
        .map(item => item.team)

      const nextAverage = getAverageForTeams(allEntries, nextLRTeams, test)

      if (nextAverage !== null) {
        benchmarks.push({
          label: `U${nextLRAge} LR Average`,
          average: nextAverage,
          sourceTeam: nextLRTeams.join(', '),
        })
      }
    }

    return benchmarks
  }

  // Same-age benchmark:
  // - A/AA teams use same-age AAA average.
  // - AAA teams use their own AAA average.
  // Both display as "U15 Average", etc.
  const sameAgeAAATeam = `U${athleteAge}AAA`
  const sameAgeAAAAverage = getAverageForTeam(allEntries, sameAgeAAATeam, test)

  if (sameAgeAAAAverage !== null) {
    benchmarks.push({
      label: `U${athleteAge} Average`,
      average: sameAgeAAAAverage,
      sourceTeam: sameAgeAAATeam,
    })
  }

  // Next-age benchmark uses all available standard teams in the next age group.
  const nextAge = getNextAvailableStandardAge(allEntries, athleteAge, test)

  if (nextAge !== null) {
    const nextAgeTeams = getAvailableStandardTeamsForAge(allEntries, nextAge, test)
    const nextAgeAverage = getAverageForTeams(allEntries, nextAgeTeams, test)

    if (nextAgeAverage !== null) {
      benchmarks.push({
        label: `U${nextAge} Average`,
        average: nextAgeAverage,
        sourceTeam: nextAgeTeams.join(', '),
      })
    }
  }

  return benchmarks
}

function cleanBenchmarkLabel(label: string) {
  return label.replace(/U(\d+)AAA Average/g, 'U$1 Average')
}


function Sparkline({ entries, test, color }: { entries: CombineEntry[]; test: TestType; color: string }) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test && Number.isFinite(e.score)))

  if (sorted.length < 2) {
    return (
      <div style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '10px' }}>
        Not enough data
      </div>
    )
  }

  const W = 260
  const H = 78
  const PAD = { top: 18, right: 18, bottom: 18, left: 34 }

  const vals = sorted.map(e => e.score)
  const rawMin = Math.min(...vals)
  const rawMax = Math.max(...vals)
  const rawRange = rawMax - rawMin || 1

  const min = rawMin - rawRange * 0.18
  const max = rawMax + rawRange * 0.18
  const range = max - min || 1

  const scaleX = (i: number) => PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right)
  const scaleY = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom)

  const points = sorted.map((e, i) => `${scaleX(i)},${scaleY(e.score)}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '78px', overflow: 'visible' }}>
      {[0, 0.5, 1].map(t => {
        const v = min + t * range
        const y = scaleY(v)

        return (
          <g key={t}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="0.6"
              strokeDasharray="3,3"
            />
            <text x={PAD.left - 4} y={y + 2.5} textAnchor="end" fontSize="7" fill="#94a3b8">
              {test === 'BroadJump' ? inchesToDisplay(broadJumpToInches(v)) : v.toFixed(1)}
            </text>
          </g>
        )
      })}

      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

      {sorted.map((e, i) => {
        const x = scaleX(i)
        const y = scaleY(e.score)

        return (
          <g key={`${e.month}-${e.year}-${i}`}>
            <circle cx={x} cy={y} r="2.6" fill={color} />
            <text x={x} y={y - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={color}>
              {formatScore(e.score, test)}
            </text>
            <text x={x} y={H - 3} textAnchor="middle" fontSize="7" fill="#64748b">
              {e.month.slice(0, 3)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}


function AthleteReportContent() {
  const params = useSearchParams()
  const athleteId = params.get('id')

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [allEntries, setAllEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState('')

  useEffect(() => {
    if (!athleteId) return

    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch(`/api/entries?athlete_id=${athleteId}`).then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([athletes, athleteEntries, all]) => {
      const safeAthletes = Array.isArray(athletes) ? athletes : []
      const safeAthleteEntries = Array.isArray(athleteEntries) ? athleteEntries : []
      const safeAllEntries = Array.isArray(all) ? all : []

      setAthlete(safeAthletes.find((a: Athlete) => a.id === athleteId) || null)
      setEntries(safeAthleteEntries)
      setAllEntries(safeAllEntries)
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }))
    }).catch(() => {
      setEntries([])
      setAllEntries([])
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }))
    })
  }, [athleteId])

  if (!athleteId) {
    return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>No athlete selected</div>
  }

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>Generating report card...</div>
  }

  if (!athlete) {
    return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>Athlete not found</div>
  }

  const TEST_COLORS = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626']
  const testsWithData = TEST_TYPES.filter(t => entries.some(e => e.test_type === t && Number.isFinite(e.score)))

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', color: '#0f172a', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 12mm; size: A4 portrait; }

          .report-wrapper {
            max-width: 100% !important;
            padding: 20px 20px 28px !important;
          }

          .trend-grid {
            grid-template-columns: 1fr !important;
          }
          .trend-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }

          .trend-card {
            padding: 6px !important;
            break-inside: avoid;
          }

          svg {
            max-height: 80px !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 20px',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
          }}
        >
          🖨 Print / Save PDF
        </button>

        <button
          onClick={() => window.close()}
          style={{
            padding: '10px 16px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      <div className="report-wrapper" style={{ maxWidth: '920px', margin: '0 auto', padding: '36px 36px 48px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '3px solid #0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#0f172a',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>
                {athlete.first_name[0]}
                {athlete.last_name[0]}
              </span>
            </div>

            <div>
              <h1
                style={{
                  margin: '0 0 4px',
                  fontSize: '26px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: '#0f172a',
                }}
              >
                {athlete.first_name.toUpperCase()} {athlete.last_name.toUpperCase()}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  {athlete.team}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Combine Performance Report Card</span>
                {[...new Set(entries.map(e => e.team).filter(Boolean))].length > 1 && (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Historical Teams: {[...new Set(entries.map(e => e.team).filter(Boolean))].join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', lineHeight: 1.8 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>KMHA Combine Tracker</p>
            <p style={{ margin: 0 }}>Generated: {generated}</p>
            <p style={{ margin: 0 }}>{entries.length} test entries recorded</p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(testsWithData.length, 4)}, 1fr)`,
            gap: '10px',
            marginBottom: '28px',
          }}
        >
          {testsWithData.map((test, idx) => {
            const best = getBest(entries, test)
            const benchmarks = getBenchmarkList(athlete.team, allEntries, test)
            const color = TEST_COLORS[idx % TEST_COLORS.length]

            return (
              <div
                key={test}
                style={{
                  border: `2px solid ${color}20`,
                  borderRadius: '10px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  background: `${color}06`,
                }}
              >
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                </p>

                <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 700, color, fontFamily: 'Georgia, serif' }}>
                  {best !== null ? formatScore(best, test) : '—'}
                </p>

                <p style={{ margin: '0 0 8px', fontSize: '9px', color: '#94a3b8' }}>Personal Best</p>
                {benchmarks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                    {benchmarks.map(benchmark => (
                      <div
                        key={cleanBenchmarkLabel(benchmark.label)}
                        style={{
                          background: 'white',
                          border: `1px solid ${color}30`,
                          borderRadius: '5px',
                          padding: '4px 7px',
                          display: 'inline-block',
                          minWidth: '92px',
                        }}
                      >
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {cleanBenchmarkLabel(benchmark.label)}
                        </div>

                        <div style={{ fontSize: '11px', fontWeight: 700, color }}>
                          {formatScore(benchmark.average, test)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {benchmarks.length === 0 && (
                  <div
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '5px',
                      padding: '4px 7px',
                      display: 'inline-block',
                      minWidth: '92px',
                    }}
                  >
                    <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700 }}>Benchmark N/A</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: '8px',
            }}
          >
            Performance Trends
          </h2>

          <div className="trend-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {testsWithData.map((test, idx) => {
              const color = TEST_COLORS[idx % TEST_COLORS.length]
              const best = getBest(entries, test)
              const first = getFirst(entries, test)

              return (
                <div key={test} style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '8px', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                    </p>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{TEST_UNITS[test]}</span>
                  </div>

                  <Sparkline entries={entries} test={test} color={color} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '9px', color: '#94a3b8' }}>
                    <span>
                      First:{' '}
                      <strong style={{ color: '#475569' }}>
                        {first !== null ? formatScore(first, test) : '—'}
                      </strong>
                    </span>
                    <span>
                      Best:{' '}
                      <strong style={{ color }}>
                        {best !== null ? formatScore(best, test) : '—'}
                      </strong>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: '8px',
            }}
          >
            Full Score History
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Month
                </th>

                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Team
                </th>

                {testsWithData.map(test => (
                  <th
                    key={test}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {[...new Set(sortEntries(entries).map(e => `${e.month} ${e.year}`))].map((monthYear, i) => {
                const [month, year] = [monthYear.slice(0, -5), parseInt(monthYear.slice(-4))]

                return (
                  <tr key={monthYear} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 500, color: '#0f172a', fontSize: '11px' }}>
                      {month} {year}
                    </td>

                    <td style={{ padding: '7px 12px', fontWeight: 700, color: '#475569', fontSize: '10px' }}>
                      {[...new Set(entries.filter(e => e.month === month && e.year === year).map(e => e.team).filter(Boolean))].join(', ') || athlete.team}
                    </td>

                    {testsWithData.map((test, tidx) => {
                      const e = entries.find(e => e.test_type === test && e.month === month && e.year === year)
                      const best = getBest(entries, test)
                      const isBest = e && best !== null && e.score === best

                      return (
                        <td
                          key={test}
                          style={{
                            padding: '7px 12px',
                            textAlign: 'center',
                            fontWeight: isBest ? 700 : 400,
                            color: isBest ? TEST_COLORS[tidx % TEST_COLORS.length] : '#475569',
                            fontSize: '11px',
                          }}
                        >
                          {e ? (
                            <span>
                              {formatScore(e.score, test)}
                              {isBest && <span style={{ marginLeft: '3px', fontSize: '8px' }}>★</span>}
                            </span>
                          ) : (
                            <span style={{ color: '#e2e8f0' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>

            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                <td
                  style={{
                    padding: '8px 12px',
                    fontWeight: 700,
                    fontSize: '10px',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Personal Best
                </td>

                <td style={{ padding: '8px 12px' }} />

                {testsWithData.map((test, idx) => {
                  const best = getBest(entries, test)

                  return (
                    <td
                      key={test}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: TEST_COLORS[idx % TEST_COLORS.length],
                        fontSize: '12px',
                      }}
                    >
                      {best !== null ? formatScore(best, test) : '—'}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#94a3b8',
          }}
        >
          <span>Kitchener Minor Hockey Association · KMHA Combine Performance Tracker</span>
          <span>CONFIDENTIAL · {generated}</span>
        </div>
      </div>
    </div>
  )
}

export default function AthleteReportPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
          <p>Loading...</p>
        </div>
      }
    >
      <AthleteReportContent />
    </Suspense>
  )
}
