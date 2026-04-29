'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore, broadJumpToInches, inchesToDisplay, avgBroadJump } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = ['September','October','November','December','January','February','March','April','May','June','July','August']

// Age group mappings - AAA is the higher level
const AGE_GROUP_AAA: Record<string, string> = {
  'U10AA': 'U10AAA', 'U11AA': 'U11AAA', 'U12AA': 'U12AAA',
  'U13AA': 'U13AAA', 'U13AALR': 'U13AAA', 'U14AA': 'U14AAA',
  'U15AA': 'U15AAA', 'U15AALR': 'U15AAA', 'U15ALR': 'U15AAA',
  'U16AA': 'U16AAA', 'U18AA': 'U18AAA', 'U18ALR': 'U18AAA',
}

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

function calcTeamAvg(entries: CombineEntry[], test: TestType): number | null {
  const scores = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!scores.length) return null
  if (test === 'BroadJump') {
    const totalIn = scores.map(broadJumpToInches).reduce((a,b)=>a+b,0) / scores.length
    return totalIn
  }
  return scores.reduce((a,b)=>a+b,0) / scores.length
}

function getPercentile(score: number, allScores: number[], test: TestType): number {
  if (!allScores.length) return 0
  const better = test === 'Sprint'
    ? allScores.filter(s => s > score).length
    : allScores.filter(s => s < score).length
  return Math.round((better / allScores.length) * 100)
}

function Sparkline({ entries, test, color }: { entries: CombineEntry[]; test: TestType; color: string }) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  if (sorted.length < 2) return <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Only 1 data point</p>
  const W = 220, H = 65, PAD = { top: 10, right: 8, bottom: 22, left: 40 }
  const vals = sorted.map(e => e.score)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const sx = (i: number) => PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right)
  const sy = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom)
  const pts = sorted.map((e, i) => `${sx(i)},${sy(e.score)}`).join(' ')
  const area = `${sx(0)},${H-PAD.bottom} ${pts} ${sx(sorted.length-1)},${H-PAD.bottom}`
  const improved = test === 'Sprint' ? vals[vals.length-1] < vals[0] : vals[vals.length-1] > vals[0]

  return (
    <svg width={W} height={H} style={{ width: '100%', height: 'auto' }}>
      {[0,0.5,1].map(t => {
        const v = min + t * range
        const y = sy(v)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,2"/>
            <text x={PAD.left-3} y={y+3} textAnchor="end" fontSize="7" fill="#94a3b8">
              {test === 'BroadJump' ? inchesToDisplay(broadJumpToInches(v)) : v.toFixed(1)}
            </text>
          </g>
        )
      })}
      <polygon points={area} fill={color} fillOpacity="0.08"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      {sorted.map((e,i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(e.score)} r="2.5" fill={i===sorted.length-1 ? color : 'white'} stroke={color} strokeWidth="1.5"/>
          <text x={sx(i)} y={H-PAD.bottom+10} textAnchor="middle" fontSize="6.5" fill="#94a3b8">{e.month.slice(0,3)}</text>
        </g>
      ))}
      <text x={W-PAD.right} y={PAD.top-1} textAnchor="end" fontSize="9" fontWeight="bold" fill={improved ? '#059669' : '#dc2626'}>
        {improved ? '▲' : '▼'}
      </text>
    </svg>
  )
}

function ReportContent() {
  const params = useSearchParams()
  const athleteId = params.get('id')
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [teamEntries, setTeamEntries] = useState<CombineEntry[]>([])
  const [aaaEntries, setAaaEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState('')

  useEffect(() => {
    if (!athleteId) return
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch(`/api/entries?athlete_id=${athleteId}`).then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([athletes, athEntries, allEntries]) => {
      const ath = athletes.find((a: Athlete) => a.id === athleteId)
      setAthlete(ath || null)
      setEntries(athEntries)
      if (ath) {
        setTeamEntries(allEntries.filter((e: CombineEntry) => e.team === ath.team))
        const aaaTeam = AGE_GROUP_AAA[ath.team]
        if (aaaTeam) setAaaEntries(allEntries.filter((e: CombineEntry) => e.team === aaaTeam))
      }
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }))
    })
  }, [athleteId])

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial' }}><p>Generating report card...</p></div>
  if (!athlete) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial' }}><p>Athlete not found</p></div>

  const TEST_COLORS = ['#1d4ed8','#059669','#7c3aed','#d97706','#dc2626']
  const testsWithData = TEST_TYPES.filter(t => entries.some(e => e.test_type === t))
  const aaaTeam = AGE_GROUP_AAA[athlete.team]

  function getTestLabel(test: TestType) {
    if (test === 'ChinHold') return 'Chin Hold'
    if (test === 'BroadJump') return 'Broad Jump'
    return TEST_LABELS[test].replace(' (reps)','').replace(' (sec)','')
  }

  function formatAvg(avg: number | null, test: TestType) {
    if (avg === null) return '—'
    if (test === 'BroadJump') return inchesToDisplay(avg)
    return formatScore(avg, test)
  }

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', color: '#0f172a', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 12mm; size: A4 portrait; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="no-print" style={{ position:'fixed', top:'16px', right:'16px', zIndex:100, display:'flex', gap:'8px' }}>
        <button onClick={() => window.print()} style={{ padding:'10px 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 12px rgba(29,78,216,0.3)' }}>🖨 Print / Save PDF</button>
        <button onClick={() => window.close()} style={{ padding:'10px 16px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>✕ Close</button>
      </div>

      <div style={{ maxWidth:'780px', margin:'0 auto', padding:'32px 36px 48px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', paddingBottom:'18px', borderBottom:'3px solid #0f172a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'60px', height:'60px', background:'#0f172a', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'white', fontSize:'20px', fontWeight:700 }}>{athlete.first_name[0]}{athlete.last_name[0]}</span>
            </div>
            <div>
              <h1 style={{ margin:'0 0 5px', fontSize:'24px', fontWeight:700, letterSpacing:'0.02em' }}>{athlete.first_name.toUpperCase()} {athlete.last_name.toUpperCase()}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ background:'#0f172a', color:'white', borderRadius:'4px', padding:'2px 10px', fontSize:'11px', fontWeight:700, letterSpacing:'0.06em' }}>{athlete.team}</span>
                <span style={{ fontSize:'12px', color:'#64748b' }}>Player Performance Report Card</span>
                {aaaTeam && <span style={{ fontSize:'11px', color:'#94a3b8' }}>· {aaaTeam} comparison included</span>}
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right', fontSize:'11px', color:'#64748b', lineHeight:1.8 }}>
            <p style={{ margin:0, fontWeight:600, color:'#0f172a' }}>KMHA Combine Tracker</p>
            <p style={{ margin:0 }}>Generated: {generated}</p>
            <p style={{ margin:0 }}>CONFIDENTIAL</p>
          </div>
        </div>

        {/* Stat summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(testsWithData.length,5)},1fr)`, gap:'8px', marginBottom:'24px' }}>
          {testsWithData.map((test, idx) => {
            const color = TEST_COLORS[idx % TEST_COLORS.length]
            const current = getLatest(entries, test)
            const best = getBest(entries, test)
            const first = getFirst(entries, test)
            const teamAvg = calcTeamAvg(teamEntries, test)
            const aaaAvg = aaaTeam ? calcTeamAvg(aaaEntries, test) : null
            const teamScores = teamEntries.filter(e => e.test_type === test).map(e => e.score)
            const pct = best !== null && teamScores.length ? getPercentile(best, teamScores, test) : null

            // vs team avg
            let vsTeam: string | null = null
            if (current !== null && teamAvg !== null) {
              if (test === 'BroadJump') {
                const diff = broadJumpToInches(current) - teamAvg
                vsTeam = diff >= 0 ? `+${Math.round(diff)}"` : `-${Math.round(Math.abs(diff))}"`
              } else {
                const diff = test === 'Sprint' ? teamAvg - current : current - teamAvg
                vsTeam = diff >= 0 ? `+${Math.abs(diff).toFixed(2)}` : `-${Math.abs(diff).toFixed(2)}`
              }
            }

            // vs AAA avg
            let vsAAA: string | null = null
            if (current !== null && aaaAvg !== null) {
              if (test === 'BroadJump') {
                const diff = broadJumpToInches(current) - aaaAvg
                vsAAA = diff >= 0 ? `+${Math.round(diff)}"` : `-${Math.round(Math.abs(diff))}"`
              } else {
                const diff = test === 'Sprint' ? aaaAvg - current : current - aaaAvg
                vsAAA = diff >= 0 ? `+${Math.abs(diff).toFixed(2)}` : `-${Math.abs(diff).toFixed(2)}`
              }
            }

            const improved = first !== null && current !== null && (test === 'Sprint' ? current < first : current > first)

            return (
              <div key={test} style={{ border:`2px solid ${color}25`, borderRadius:'10px', padding:'12px 10px', background:`${color}05` }}>
                <p style={{ margin:'0 0 8px', fontSize:'9px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>{getTestLabel(test)}</p>

                {/* Current score - big */}
                <p style={{ margin:'0 0 2px', fontSize:'20px', fontWeight:700, color, textAlign:'center', fontFamily:'Georgia,serif' }}>
                  {current !== null ? formatScore(current, test) : '—'}
                </p>
                <p style={{ margin:'0 0 8px', fontSize:'8px', color:'#94a3b8', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>Current</p>

                {/* Best */}
                {best !== current && best !== null && (
                  <div style={{ textAlign:'center', marginBottom:'6px' }}>
                    <span style={{ fontSize:'9px', color:'#64748b' }}>Best: </span>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#0f172a' }}>{formatScore(best, test)}</span>
                    <span style={{ fontSize:'8px', marginLeft:'2px' }}>⭐</span>
                  </div>
                )}

                {/* Change from first */}
                {first !== null && current !== null && first !== current && (
                  <p style={{ margin:'0 0 6px', fontSize:'10px', fontWeight:600, color: improved ? '#059669' : '#dc2626', textAlign:'center' }}>
                    {improved ? '▲' : '▼'} from {formatScore(first, test)}
                  </p>
                )}

                <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'6px', marginTop:'4px' }}>
                  {/* vs team avg */}
                  {vsTeam !== null && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'3px' }}>
                      <span style={{ color:'#94a3b8' }}>vs {athlete.team} avg</span>
                      <span style={{ fontWeight:700, color: vsTeam.startsWith('+') ? '#059669' : '#dc2626' }}>{vsTeam}</span>
                    </div>
                  )}
                  {/* vs AAA avg */}
                  {vsAAA !== null && aaaTeam && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'3px' }}>
                      <span style={{ color:'#94a3b8' }}>vs {aaaTeam} avg</span>
                      <span style={{ fontWeight:700, color: vsAAA.startsWith('+') ? '#059669' : '#dc2626' }}>{vsAAA}</span>
                    </div>
                  )}
                  {/* Team percentile */}
                  {pct !== null && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px' }}>
                      <span style={{ color:'#94a3b8' }}>Team rank</span>
                      <span style={{ fontWeight:700, color }}>Top {pct}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts */}
        <div style={{ marginBottom:'24px' }}>
          <h2 style={{ margin:'0 0 12px', fontSize:'12px', fontWeight:700, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f1f5f9', paddingBottom:'6px' }}>Performance Trends</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
            {testsWithData.map((test, idx) => {
              const color = TEST_COLORS[idx % TEST_COLORS.length]
              const best = getBest(entries, test)
              const first = getFirst(entries, test)
              const current = getLatest(entries, test)
              const teamAvg = calcTeamAvg(teamEntries, test)
              const aaaAvg = aaaTeam ? calcTeamAvg(aaaEntries, test) : null
              return (
                <div key={test} style={{ border:'1px solid #f1f5f9', borderRadius:'8px', padding:'10px', background:'#fafafa' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <p style={{ margin:0, fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>{getTestLabel(test)}</p>
                    <span style={{ fontSize:'8px', color:'#94a3b8' }}>{TEST_UNITS[test]}</span>
                  </div>
                  <Sparkline entries={entries} test={test} color={color} />
                  <div style={{ marginTop:'6px', fontSize:'8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px' }}>
                    <span style={{ color:'#94a3b8' }}>First: <strong style={{ color:'#475569' }}>{first!==null?formatScore(first,test):'—'}</strong></span>
                    <span style={{ color:'#94a3b8' }}>Best: <strong style={{ color }}>{best!==null?formatScore(best,test):'—'}</strong></span>
                    <span style={{ color:'#94a3b8' }}>{athlete.team} avg: <strong style={{ color:'#475569' }}>{formatAvg(teamAvg,test)}</strong></span>
                    {aaaAvg!==null && aaaTeam && <span style={{ color:'#94a3b8' }}>{aaaTeam} avg: <strong style={{ color:'#475569' }}>{formatAvg(aaaAvg,test)}</strong></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Score history table */}
        <div style={{ marginBottom:'20px' }}>
          <h2 style={{ margin:'0 0 10px', fontSize:'12px', fontWeight:700, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f1f5f9', paddingBottom:'6px' }}>Score History</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
            <thead>
              <tr style={{ background:'#0f172a' }}>
                <th style={{ padding:'7px 10px', textAlign:'left', color:'white', fontWeight:700, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Month</th>
                {testsWithData.map((test,idx) => (
                  <th key={test} style={{ padding:'7px 10px', textAlign:'center', color:'white', fontWeight:700, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{getTestLabel(test)}</th>
                ))}
              </tr>
              {/* Team avg row */}
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                <td style={{ padding:'5px 10px', fontSize:'9px', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{athlete.team} Avg</td>
                {testsWithData.map((test,idx) => {
                  const avg = calcTeamAvg(teamEntries, test)
                  return <td key={test} style={{ padding:'5px 10px', textAlign:'center', fontSize:'10px', fontWeight:600, color:'#475569' }}>{formatAvg(avg,test)}</td>
                })}
              </tr>
              {/* AAA avg row */}
              {aaaTeam && (
                <tr style={{ background:'#f0f4ff', borderBottom:'2px solid #e2e8f0' }}>
                  <td style={{ padding:'5px 10px', fontSize:'9px', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{aaaTeam} Avg</td>
                  {testsWithData.map((test,idx) => {
                    const avg = calcTeamAvg(aaaEntries, test)
                    return <td key={test} style={{ padding:'5px 10px', textAlign:'center', fontSize:'10px', fontWeight:600, color:'#475569' }}>{formatAvg(avg,test)}</td>
                  })}
                </tr>
              )}
            </thead>
            <tbody>
              {[...new Set(sortEntries(entries).map(e=>`${e.month} ${e.year}`))].map((monthYear, i) => {
                const parts = monthYear.lastIndexOf(' ')
                const month = monthYear.slice(0, parts)
                const year = parseInt(monthYear.slice(parts+1))
                return (
                  <tr key={monthYear} style={{ background: i%2===0?'white':'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'6px 10px', fontWeight:500, color:'#0f172a', fontSize:'11px' }}>{month} {year}</td>
                    {testsWithData.map((test,tidx) => {
                      const e = entries.find(e=>e.test_type===test&&e.month===month&&e.year===year)
                      const best = getBest(entries, test)
                      const isBest = e && best!==null && e.score===best
                      const isCurrent = e && getLatest(entries,test)===e.score && i===([...new Set(sortEntries(entries).map(e=>`${e.month} ${e.year}`))].length-1)
                      return (
                        <td key={test} style={{ padding:'6px 10px', textAlign:'center', fontWeight: isBest?700:400, color: isBest?TEST_COLORS[tidx%TEST_COLORS.length]:'#475569', fontSize:'11px' }}>
                          {e ? <span>{formatScore(e.score,test)}{isBest&&<span style={{ marginLeft:'2px',fontSize:'8px' }}>★</span>}</span> : <span style={{ color:'#e2e8f0' }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* Personal best row */}
              <tr style={{ background:'#f0f4ff', borderTop:'2px solid #e2e8f0' }}>
                <td style={{ padding:'7px 10px', fontWeight:700, fontSize:'9px', color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>Personal Best ⭐</td>
                {testsWithData.map((test,idx)=>{
                  const best = getBest(entries, test)
                  return <td key={test} style={{ padding:'7px 10px', textAlign:'center', fontWeight:700, color:TEST_COLORS[idx%TEST_COLORS.length], fontSize:'12px' }}>{best!==null?formatScore(best,test):'—'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:'12px', display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#94a3b8' }}>
          <span>Kitchener Minor Hockey Association · KMHA Combine Performance Tracker</span>
          <span>CONFIDENTIAL · {generated}</span>
        </div>
      </div>
    </div>
  )
}

export default function AthleteReportPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial' }}><p>Loading...</p></div>}>
      <ReportContent />
    </Suspense>
  )
}
