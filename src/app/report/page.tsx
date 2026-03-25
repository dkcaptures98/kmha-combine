'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CombineEntry, Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS } from '@/types'
import { formatScore, broadJumpToInches, inchesToDisplay, avgBroadJump } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = ['September','October','November','December','January','February','March','April','May','June','July','August']

const SEASONS: Record<string, { months: string[]; years: number[]; fallYear: number; springYear: number }> = {
  '2024-2025 In-Season': { months: ['September','October','November','December','January','February','March'], years: [2024,2025], fallYear: 2024, springYear: 2025 },
  '2025 Off-Season':     { months: ['May','June','July','August'], years: [2025], fallYear: 2025, springYear: 2025 },
  '2025-2026 In-Season': { months: ['September','October','November','December','January','February','March'], years: [2025,2026], fallYear: 2025, springYear: 2026 },
  '2026 Off-Season':     { months: ['May','June','July','August'], years: [2026], fallYear: 2026, springYear: 2026 },
  '2026-2027 In-Season': { months: ['September','October','November','December','January','February','March'], years: [2026,2027], fallYear: 2026, springYear: 2027 },
}

// Age groups
const AGE_GROUPS: Record<string, string[]> = {
  'U10': ['U10AA','U10AAA'],
  'U11': ['U11AA','U11AAA'],
  'U12': ['U12AA','U12AAA'],
  'U13': ['U13AA','U13AAA','U13AALR'],
  'U14': ['U14AA','U14AAA'],
  'U15': ['U15AA','U15AAA','U15AALR','U15ALR'],
  'U16': ['U16AA','U16AAA'],
  'U18': ['U18AA','U18AAA','U18ALR'],
}

function sortEntries(entries: CombineEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })
}

function getMonthLabel(entry: CombineEntry) {
  return `${entry.month.slice(0,3)} ${entry.year}`
}

// Simple SVG line chart
function LineChart({ data, color, lowerBetter }: { data: { label: string; value: number }[]; color: string; lowerBetter?: boolean }) {
  if (data.length < 2) return null
  const W = 400, H = 120, PAD = { top: 16, right: 20, bottom: 24, left: 40 }
  const vals = data.map(d => d.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const scaleX = (i: number) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right)
  const scaleY = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom)
  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.value)}`).join(' ')
  const areaPoints = `${scaleX(0)},${H - PAD.bottom} ${points} ${scaleX(data.length - 1)},${H - PAD.bottom}`

  return (
    <svg width={W} height={H} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + t * (H - PAD.top - PAD.bottom)
        const val = max - t * range
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#94a3b8">{test === 'BroadJump' ? inchesToDisplay(val) : val.toFixed(1)}</text>
          </g>
        )
      })}
      {/* Area fill */}
      <polygon points={areaPoints} fill={color} fillOpacity="0.08" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(d.value)} r="3" fill={color} />
          <text x={scaleX(i)} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="7.5" fill="#64748b">
            {d.label}
          </text>
        </g>
      ))}
      {/* Trend arrow */}
      {data.length >= 2 && (() => {
        const first = data[0].value, last = data[data.length - 1].value
        const improved = lowerBetter ? last < first : last > first
        const change = Math.abs(last - first).toFixed(2)
        return (
          <text x={W - PAD.right} y={PAD.top - 2} textAnchor="end" fontSize="9" fontWeight="bold" fill={improved ? '#10b981' : '#ef4444'}>
            {improved ? '▲' : '▼'} {change}
          </text>
        )
      })()}
    </svg>
  )
}

function TeamSection({ teamName, athletes, entries, season, showTitle = true }: {
  teamName: string; athletes: Athlete[]; entries: CombineEntry[]; season: any; showTitle?: boolean
}) {
  const tAthletes = athletes.filter(a => a.team === teamName)
  const tEntries = entries.filter(e => e.team === teamName)
  if (!tEntries.length && !tAthletes.length) return null

  // Build timeline data per test (team averages by month)
  function getTimelineData(test: TestType) {
    const byMonth: Record<string, number[]> = {}
    tEntries.filter(e => e.test_type === test).forEach(e => {
      const key = getMonthLabel(e)
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(e.score)
    })
    return Object.entries(byMonth)
      .map(([label, scores]) => ({ 
        label, 
        value: test === 'BroadJump' 
          ? scores.map(broadJumpToInches).reduce((a,b)=>a+b,0) / scores.length
          : scores.reduce((a,b) => a+b,0) / scores.length 
      }))
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      {showTitle && (
        <div style={{ background: '#0f172a', color: 'white', padding: '12px 20px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.06em' }}>{teamName}</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{tAthletes.length} athletes · {tEntries.length} entries</span>
        </div>
      )}

      {/* Trend charts */}
      <div style={{ border: '1px solid #e2e8f0', borderTop: showTitle ? 'none' : '1px solid #e2e8f0', borderRadius: showTitle ? '0 0 8px 8px' : '8px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Average Trends — {teamName}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {TEST_TYPES.filter(test => tEntries.some(e => e.test_type === test)).map((test, idx) => {
            const colors = ['#1d4ed8','#059669','#7c3aed','#d97706','#dc2626']
            const color = colors[idx % colors.length]
            const timeline = getTimelineData(test)
            return (
              <div key={test} style={{ border: '1px solid #f1f5f9', borderRadius: '6px', padding: '10px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {TEST_LABELS[test]} ({TEST_UNITS[test]})
                </p>
                {timeline.length >= 2
                  ? <LineChart data={timeline} color={color} lowerBetter={test === 'Sprint'} />
                  : <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', textAlign: 'center', padding: '20px 0' }}>Not enough data points</p>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Full roster scores */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>Athlete</th>
            {TEST_TYPES.map(test => (
              <th key={test} colSpan={2} style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
              </th>
            ))}
          </tr>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '4px 12px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}></th>
            {TEST_TYPES.map(test => (
              <>
                <th key={`${test}-first`} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', fontWeight: 400, borderBottom: '1px solid #e2e8f0' }}>First</th>
                <th key={`${test}-best`} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', fontWeight: 400, borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>Best</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...tAthletes].sort((a,b) => a.last_name.localeCompare(b.last_name)).map((athlete, i) => {
            const aEntries = sortEntries(tEntries.filter(e => e.athlete_id === athlete.id))
            return (
              <tr key={athlete.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 12px', fontWeight: 500, color: '#0f172a', borderRight: '1px solid #f1f5f9' }}>{athlete.last_name}, {athlete.first_name}</td>
                {TEST_TYPES.map(test => {
                  const testEntries = aEntries.filter(e => e.test_type === test)
                  const first = testEntries[0]?.score ?? null
                  const best = testEntries.length ? (test === 'Sprint' ? Math.min(...testEntries.map(e => e.score)) : Math.max(...testEntries.map(e => e.score))) : null
                  const improved = first !== null && best !== null && first !== best
                  const gotBetter = test === 'Sprint' ? (best! < first!) : (best! > first!)
                  return (
                    <>
                      <td key={`${test}-first`} style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
                        {first !== null ? formatScore(first, test) : <span style={{ color: '#e2e8f0' }}>—</span>}
                      </td>
                      <td key={`${test}-best`} style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        {best !== null ? (
                          <span style={{ fontWeight: 600, color: improved ? (gotBetter ? '#059669' : '#dc2626') : '#0f172a' }}>
                            {formatScore(best, test)}
                            {improved && <span style={{ fontSize: '9px', marginLeft: '2px' }}>{gotBetter ? '▲' : '▼'}</span>}
                          </span>
                        ) : <span style={{ color: '#e2e8f0' }}>—</span>}
                      </td>
                    </>
                  )
                })}
              </tr>
            )
          })}
          {/* Team averages */}
          <tr style={{ background: '#0f172a' }}>
            <td style={{ padding: '7px 12px', fontWeight: 700, fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #1e3a5f' }}>Team Avg</td>
            {TEST_TYPES.map(test => {
              const allScores = tEntries.filter(e => e.test_type === test).map(e => e.score)
              const months = [...new Set(tEntries.filter(e => e.test_type === test).map(e => `${e.month}${e.year}`))].sort()
              const firstScores = tEntries.filter(e => e.test_type === test && `${e.month}${e.year}` === months[0]).map(e => e.score)
              const lastScores = tEntries.filter(e => e.test_type === test && `${e.month}${e.year}` === months[months.length-1]).map(e => e.score)

              // For BroadJump: convert to inches before averaging
              let avgDisplay: string | null = null
              let firstAvgDisplay: string | null = null
              let changeDisplay: string | null = null
              let improved = false

              if (test === 'BroadJump') {
                if (allScores.length) avgDisplay = avgBroadJump(allScores)
                if (firstScores.length) firstAvgDisplay = avgBroadJump(firstScores)
                if (firstScores.length && lastScores.length && months.length > 1) {
                  const firstIn = firstScores.map(broadJumpToInches).reduce((a,b)=>a+b,0)/firstScores.length
                  const lastIn = lastScores.map(broadJumpToInches).reduce((a,b)=>a+b,0)/lastScores.length
                  const diff = Math.abs(lastIn - firstIn)
                  improved = lastIn > firstIn
                  const diffFt = Math.floor(diff / 12)
                  const diffIn = Math.round(diff % 12)
                  changeDisplay = diffFt > 0 ? `${diffFt}' ${diffIn}"` : `${diffIn}"`
                }
              } else {
                if (allScores.length) {
                  const avg = allScores.reduce((a,b)=>a+b,0)/allScores.length
                  avgDisplay = formatScore(avg, test)
                }
                if (firstScores.length) {
                  const firstAvg = firstScores.reduce((a,b)=>a+b,0)/firstScores.length
                  firstAvgDisplay = formatScore(firstAvg, test)
                  if (lastScores.length && months.length > 1) {
                    const lastAvg = lastScores.reduce((a,b)=>a+b,0)/lastScores.length
                    const change = test === 'Sprint' ? firstAvg - lastAvg : lastAvg - firstAvg
                    improved = change > 0
                    changeDisplay = Math.abs(change).toFixed(2)
                  }
                }
              }

              return (
                <>
                  <td key={`${test}-avg1`} style={{ padding: '7px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                    {firstAvgDisplay || '—'}
                  </td>
                  <td key={`${test}-avg2`} style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: 'white', fontSize: '11px', borderRight: '1px solid #1e3a5f' }}>
                    {avgDisplay || '—'}
                    {changeDisplay && <div style={{ fontSize: '9px', color: improved ? '#10b981' : '#ef4444', marginTop: '1px' }}>
                      {improved ? '▲' : '▼'} {changeDisplay}
                    </div>}
                  </td>
                </>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AgeGroupSection({ groupName, teams, athletes, entries }: { groupName: string; teams: string[]; athletes: Athlete[]; entries: CombineEntry[] }) {
  const gAthletes = athletes.filter(a => teams.includes(a.team))
  const gEntries = entries.filter(e => teams.includes(e.team))
  if (!gEntries.length) return null

  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{ background: '#1e3a5f', color: 'white', padding: '14px 20px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em' }}>{groupName} AGE GROUP COMPARISON</span>
          <span style={{ marginLeft: '12px', fontSize: '12px', color: '#93c5fd' }}>({teams.filter(t => gEntries.some(e => e.team === t)).join(' · ')})</span>
        </div>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{gAthletes.length} athletes total</span>
      </div>

      {/* Cross-team comparison per test */}
      {TEST_TYPES.filter(test => gEntries.some(e => e.test_type === test)).map((test, idx) => {
        const colors: Record<string, string> = { 'AA': '#1d4ed8', 'AAA': '#7c3aed', 'AALR': '#059669', 'ALR': '#d97706' }
        const teamData = teams.map(team => {
          const te = gEntries.filter(e => e.team === team && e.test_type === test)
          if (!te.length) return null
          const byMonth: Record<string, number[]> = {}
          te.forEach(e => {
            const key = e.month.slice(0,3)
            if (!byMonth[key]) byMonth[key] = []
            byMonth[key].push(e.score)
          })
          const timeline = Object.entries(byMonth).map(([label, scores]) => ({
            label, value: scores.reduce((a,b) => a+b,0)/scores.length
          }))
          const suffix = team.replace(/U\d+/, '')
          const color = colors[suffix] || '#475569'
          return { team, timeline, color }
        }).filter(Boolean)

        if (!teamData.length) return null

        // Combined SVG with multiple lines
        const W = 500, H = 140, PAD = { top: 20, right: 80, bottom: 28, left: 44 }
        const allVals = teamData.flatMap(td => td!.timeline.map(d => d.value))
        const minV = Math.min(...allVals), maxV = Math.max(...allVals)
        const range = maxV - minV || 1
        const allLabels = [...new Set(teamData.flatMap(td => td!.timeline.map(d => d.label)))]
        const scaleX = (i: number) => PAD.left + (i / Math.max(allLabels.length - 1, 1)) * (W - PAD.left - PAD.right)
        const scaleY = (v: number) => PAD.top + (1 - (v - minV) / range) * (H - PAD.top - PAD.bottom)

        return (
          <div key={test} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {TEST_LABELS[test]} ({TEST_UNITS[test]}) — Team Average Comparison
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                {teamData.map(td => (
                  <span key={td!.team} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                    <span style={{ width: '12px', height: '2px', background: td!.color, display: 'inline-block', borderRadius: '1px' }}></span>
                    {td!.team}
                  </span>
                ))}
              </div>
            </div>
            <svg width={W} height={H} style={{ width: '100%', height: 'auto' }}>
              {[0, 0.5, 1].map(t => {
                const y = PAD.top + t * (H - PAD.top - PAD.bottom)
                const val = maxV - t * range
                return (
                  <g key={t}>
                    <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
                    <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{val.toFixed(1)}</text>
                  </g>
                )
              })}
              {allLabels.map((label, i) => (
                <text key={label} x={scaleX(i)} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">{label}</text>
              ))}
              {teamData.map(td => {
                const pts = td!.timeline.map(d => {
                  const xi = allLabels.indexOf(d.label)
                  return `${scaleX(xi)},${scaleY(d.value)}`
                }).join(' ')
                return (
                  <g key={td!.team}>
                    <polyline points={pts} fill="none" stroke={td!.color} strokeWidth="1.5" strokeLinejoin="round" />
                    {td!.timeline.map(d => {
                      const xi = allLabels.indexOf(d.label)
                      return <circle key={d.label} cx={scaleX(xi)} cy={scaleY(d.value)} r="2.5" fill={td!.color} />
                    })}
                  </g>
                )
              })}
            </svg>
          </div>
        )
      })}
    </div>
  )
}

function ReportContent() {
  const params = useSearchParams()
  const team = params.get('team') || ''
  const ageGroup = params.get('age_group') || ''
  const seasonLabel = params.get('season') || '2025-2026 In-Season'
  const reportType = params.get('type') || 'team' // 'team' or 'agegroup'

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState('')

  const season = SEASONS[seasonLabel] || SEASONS['2025-2026 In-Season']

  useEffect(() => {
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([a, e]) => {
      setAthletes(a); setEntries(e); setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
    })
  }, [])

  const filteredEntries = entries.filter(e => {
    if (!season.years.includes(e.year)) return false
    if (!season.months.includes(e.month)) return false
    if (season.years.length === 2) {
      const fall = ['September','October','November','December']
      const spring = ['January','February','March']
      if (fall.includes(e.month) && e.year !== season.fallYear) return false
      if (spring.includes(e.month) && e.year !== season.springYear) return false
    }
    return true
  })

  const teamsToShow = reportType === 'agegroup' && ageGroup
    ? (AGE_GROUPS[ageGroup] || [])
    : team ? [team]
    : [...new Set(filteredEntries.map(e => e.team))].sort()

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}><p>Generating report...</p></div>

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', color: '#0f172a' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; margin-top: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        @page { margin: 15mm; size: A4 landscape; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
        <button onClick={() => window.close()} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>✕ Close</button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 40px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '20px', borderBottom: '3px solid #0f172a' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, letterSpacing: '0.05em' }}>KITCHENER MINOR HOCKEY ASSOCIATION</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', letterSpacing: '0.08em' }}>
              {reportType === 'agegroup' ? `${ageGroup} AGE GROUP COMPARISON REPORT` : 'COMBINE PERFORMANCE REPORT'}
              {' · '}{seasonLabel.toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', lineHeight: 1.8 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Generated: {generated}</p>
            <p style={{ margin: 0 }}>CONFIDENTIAL — Senior Leadership</p>
          </div>
        </div>

        {/* Age group report */}
        {reportType === 'agegroup' && ageGroup && (
          <AgeGroupSection
            groupName={ageGroup}
            teams={AGE_GROUPS[ageGroup] || []}
            athletes={athletes}
            entries={filteredEntries}
          />
        )}

        {/* Team reports */}
        {teamsToShow.map((teamName, idx) => (
          <div key={teamName} className={idx > 0 ? 'page-break' : ''}>
            <TeamSection
              teamName={teamName}
              athletes={athletes}
              entries={filteredEntries}
              season={season}
            />
          </div>
        ))}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
          <span>KMHA Combine Performance Tracker</span>
          <span>CONFIDENTIAL — For internal use only · {generated}</span>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p>Loading...</p></div>}>
      <ReportContent />
    </Suspense>
  )
}
