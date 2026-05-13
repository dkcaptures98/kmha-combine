'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore, broadJumpToInches, inchesToDisplay, avgBroadJump } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = ['September','October','November','December','January','February','March','April','May','June','July','August']

function sortEntries(entries: CombineEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })
}

function getBest(entries: CombineEntry[], test: TestType) {
  const scores = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!scores.length) return null
  return test === 'Sprint' ? Math.min(...scores) : Math.max(...scores)
}

function getFirst(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  return sorted[0]?.score ?? null
}

function getLatest(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  return sorted[sorted.length - 1]?.score ?? null
}

function getChange(entries: CombineEntry[], test: TestType) {
  const first = getFirst(entries, test)
  const latest = getLatest(entries, test)
  if (first === null || latest === null || first === latest) return null
  if (test === 'BroadJump') {
    const diff = broadJumpToInches(latest) - broadJumpToInches(first)
    return { value: diff, improved: diff > 0, display: `${Math.abs(diff)}"` }
  }
  const change = test === 'Sprint' ? first - latest : latest - first
  return { value: change, improved: change > 0, display: Math.abs(change).toFixed(2) }
}

// SVG Sparkline for individual athlete
function Sparkline({ entries, test, color }: { entries: CombineEntry[]; test: TestType; color: string }) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  if (sorted.length < 2) return null
  const W = 200, H = 60, PAD = { top: 8, right: 8, bottom: 20, left: 36 }
  const vals = sorted.map(e => e.score)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const scaleX = (i: number) => PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right)
  const scaleY = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom)
  const points = sorted.map((e, i) => `${scaleX(i)},${scaleY(e.score)}`).join(' ')
  const areaPoints = `${scaleX(0)},${H - PAD.bottom} ${points} ${scaleX(sorted.length - 1)},${H - PAD.bottom}`
  const first = vals[0], last = vals[vals.length - 1]
  const improved = test === 'Sprint' ? last < first : last > first

  return (
    <svg width={W} height={H} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {[0, 1].map(t => {
        const v = min + t * range
        const y = scaleY(v)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={PAD.left - 3} y={y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">
              {test === 'BroadJump' ? inchesToDisplay(broadJumpToInches(v)) : v.toFixed(1)}
            </text>
          </g>
        )
      })}
      <polygon points={areaPoints} fill={color} fillOpacity="0.1" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {sorted.map((e, i) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(e.score)} r="2.5" fill={color} />
          <text x={scaleX(i)} y={H - PAD.bottom + 10} textAnchor="middle" fontSize="6.5" fill="#94a3b8">
            {e.month.slice(0, 3)}
          </text>
        </g>
      ))}
      <text x={W - PAD.right} y={PAD.top - 1} textAnchor="end" fontSize="8" fontWeight="bold" fill={improved ? '#059669' : '#dc2626'}>
        {improved ? '▲' : '▼'}
      </text>
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
    ]).then(([athletes, ath_entries, all]) => {
      setAthlete(athletes.find((a: Athlete) => a.id === athleteId) || null)
      setEntries(ath_entries)
      setAllEntries(all)
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }))
    })
  }, [athleteId])

  if (!athleteId) return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>No athlete selected</div>
  if (loading) return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>Generating report card...</div>
  if (!athlete) return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Arial' }}>Athlete not found</div>

  // Calculate percentile rank within team
  function getPercentile(score: number, test: TestType): number {
    const teamScores = allEntries
      .filter(e => e.team === athlete.team && e.test_type === test)
      .map(e => e.score)
    if (!teamScores.length) return 0
    const better = test === 'Sprint'
      ? teamScores.filter(s => s > score).length
      : teamScores.filter(s => s < score).length
    return Math.round((better / teamScores.length) * 100)
  }

  const TEST_COLORS = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626']

  const testsWithData = TEST_TYPES.filter(t => entries.some(e => e.test_type === t))

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', color: '#0f172a', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 12mm; size: A4 portrait; }
        }
      `}</style>

      {/* Action buttons */}
      <div className="no-print" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29,78,216,0.3)' }}>
          🖨 Print / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          ✕ Close
        </button>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '36px 36px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', paddingBottom: '20px', borderBottom: '3px solid #0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', background: '#0f172a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>{athlete.first_name[0]}{athlete.last_name[0]}</span>
            </div>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, letterSpacing: '0.02em', color: '#0f172a' }}>
                {athlete.first_name.toUpperCase()} {athlete.last_name.toUpperCase()}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#0f172a', color: 'white', borderRadius: '4px', padding: '2px 10px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}>{athlete.team}</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Combine Performance Report Card</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', lineHeight: 1.8 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>KMHA Combine Tracker</p>
            <p style={{ margin: 0 }}>Generated: {generated}</p>
            <p style={{ margin: 0 }}>{entries.length} test entries recorded</p>
          </div>
        </div>

        {/* Summary stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${testsWithData.length}, 1fr)`, gap: '10px', marginBottom: '28px' }}>
          {testsWithData.map((test, idx) => {
            const best = getBest(entries, test)
            const change = getChange(entries, test)
            const pct = best !== null ? getPercentile(best, test) : null
            const color = TEST_COLORS[idx % TEST_COLORS.length]
            return (
              <div key={test} style={{ border: `2px solid ${color}20`, borderRadius: '10px', padding: '14px 12px', textAlign: 'center', background: `${color}06` }}>
                <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                </p>
                <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 700, color, fontFamily: 'Georgia, serif' }}>
                  {best !== null ? formatScore(best, test) : '—'}
                </p>
                <p style={{ margin: '0 0 6px', fontSize: '9px', color: '#94a3b8' }}>Personal Best</p>
                {change && (
                  <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, color: change.improved ? '#059669' : '#dc2626' }}>
                    {change.improved ? '▲' : '▼'} {change.display}
                  </p>
                )}
                {pct !== null && (
                  <div style={{ background: 'white', border: `1px solid ${color}30`, borderRadius: '4px', padding: '2px 6px', display: 'inline-block' }}>
                    <span style={{ fontSize: '9px', color: '#475569' }}>Top </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color }}>{pct}%</span>
                    <span style={{ fontSize: '9px', color: '#475569' }}> on team</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Trend charts + history */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
            Performance Trends
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {testsWithData.map((test, idx) => {
              const color = TEST_COLORS[idx % TEST_COLORS.length]
              const sorted = sortEntries(entries.filter(e => e.test_type === test))
              const best = getBest(entries, test)
              const first = getFirst(entries, test)
              return (
                <div key={test} style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                    </p>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{TEST_UNITS[test]}</span>
                  </div>
                  <Sparkline entries={entries} test={test} color={color} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: '#94a3b8' }}>
                    <span>First: <strong style={{ color: '#475569' }}>{first !== null ? formatScore(first, test) : '—'}</strong></span>
                    <span>Best: <strong style={{ color }}>{best !== null ? formatScore(best, test) : '—'}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Full score history table */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
            Full Score History
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month</th>
                {testsWithData.map((test, idx) => (
                  <th key={test} style={{ padding: '8px 12px', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {test === 'ChinHold' ? 'Chin Hold' : test === 'BroadJump' ? 'Broad Jump' : TEST_LABELS[test].split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(
                sortEntries(entries).map(e => `${e.month} ${e.year}`)
              )].map((monthYear, i) => {
                const [month, year] = [monthYear.slice(0, -5), parseInt(monthYear.slice(-4))]
                return (
                  <tr key={monthYear} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 500, color: '#0f172a', fontSize: '11px' }}>{month} {year}</td>
                    {testsWithData.map((test, tidx) => {
                      const e = entries.find(e => e.test_type === test && e.month === month && e.year === year)
                      const best = getBest(entries, test)
                      const isBest = e && best !== null && e.score === best
                      return (
                        <td key={test} style={{ padding: '7px 12px', textAlign: 'center', fontWeight: isBest ? 700 : 400, color: isBest ? TEST_COLORS[tidx % TEST_COLORS.length] : '#475569', fontSize: '11px' }}>
                          {e ? (
                            <span>
                              {formatScore(e.score, test)}
                              {isBest && <span style={{ marginLeft: '3px', fontSize: '8px' }}>★</span>}
                            </span>
                          ) : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Best</td>
                {testsWithData.map((test, idx) => {
                  const best = getBest(entries, test)
                  return (
                    <td key={test} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: TEST_COLORS[idx % TEST_COLORS.length], fontSize: '12px' }}>
                      {best !== null ? formatScore(best, test) : '—'}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8' }}>
          <span>Kitchener Minor Hockey Association · KMHA Combine Performance Tracker</span>
          <span>CONFIDENTIAL · {generated}</span>
        </div>
      </div>
    </div>
  )
}

export default function AthleteReportPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}><p>Loading...</p></div>}>
      <AthleteReportContent />
    </Suspense>
  )
}
