'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore, broadJumpToInches, inchesToDisplay, avgBroadJump } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = ['September','October','November','December','January','February','March','April','May','June','July','August']

// Comparison team mapping — each team compares against the next level up
// LR teams compare against the highest LR team in same age group
const COMPARISON_TEAM: Record<string, string> = {
  // AA compares to AAA
  'U10AA': 'U10AAA',
  'U11AA': 'U11AAA',
  'U12AA': 'U12AAA',
  'U13AA': 'U13AAA',
  'U14AA': 'U14AAA',
  'U15AA': 'U15AAA',
  'U16AA': 'U16AAA',
  'U18AA': 'U18AAA',
  // LR teams compare to AALR (next level up for LR stream)
  'U13AALR': 'U13AAA',
  'U15ALR':  'U15AALR',  // ALR compares to AALR
  'U15AALR': 'U15AAA',   // AALR compares to AAA
  'U18ALR':  'U18AAA',
}

function sortEntries(entries: CombineEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })
}

function getBest(entries: CombineEntry[], test: TestType) {
  const s = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!s.length) return null
  return test === 'Sprint' ? Math.min(...s) : Math.max(...s)
}

function getFirst(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  return sorted[0]?.score ?? null
}

function getLatest(entries: CombineEntry[], test: TestType) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  return sorted[sorted.length - 1]?.score ?? null
}

function calcAvg(entries: CombineEntry[], test: TestType): number | null {
  const s = entries.filter(e => e.test_type === test).map(e => e.score)
  if (!s.length) return null
  if (test === 'BroadJump') return s.map(broadJumpToInches).reduce((a,b)=>a+b,0) / s.length
  return s.reduce((a,b)=>a+b,0) / s.length
}

function fmtAvg(avg: number | null, test: TestType) {
  if (avg === null) return '—'
  if (test === 'BroadJump') return inchesToDisplay(avg)
  return formatScore(avg, test)
}

function vsAvg(score: number, avg: number | null, test: TestType): { label: string; positive: boolean } | null {
  if (avg === null) return null
  let diff: number
  if (test === 'BroadJump') {
    diff = broadJumpToInches(score) - avg
    const positive = diff > 0
    const abs = Math.round(Math.abs(diff))
    return { label: `${positive ? '+' : '-'}${abs}"`, positive }
  }
  diff = test === 'Sprint' ? avg - score : score - avg
  const positive = diff > 0
  return { label: `${positive ? '+' : ''}${diff.toFixed(2)}`, positive }
}

function getPercentile(score: number, allScores: number[], test: TestType): number {
  if (!allScores.length) return 0
  const better = test === 'Sprint'
    ? allScores.filter(s => s > score).length
    : allScores.filter(s => s < score).length
  return Math.round((better / allScores.length) * 100)
}

const TEST_COLORS = ['#1d4ed8','#059669','#7c3aed','#d97706','#dc2626']

function getLabel(test: TestType) {
  if (test === 'ChinHold') return 'Chin Hold'
  if (test === 'BroadJump') return 'Broad Jump'
  if (test === 'Chinups') return 'Chin-Ups'
  if (test === 'Sprint') return '10m Sprint'
  if (test === 'Vertical') return 'Vertical Jump'
  return TEST_LABELS[test]
}

function Sparkline({ entries, test, color, teamAvg, cmpAvg, cmpLabel }:
  { entries: CombineEntry[]; test: TestType; color: string; teamAvg: number|null; cmpAvg: number|null; cmpLabel: string }) {
  const sorted = sortEntries(entries.filter(e => e.test_type === test))
  if (sorted.length < 2) return (
    <div style={{ textAlign:'center', padding:'20px 0', fontSize:'10px', color:'#94a3b8' }}>Only 1 entry recorded</div>
  )
  const W = 240, H = 80, PAD = { top: 12, right: 8, bottom: 24, left: 44 }
  const vals = sorted.map(e => e.score)
  const allVals = [...vals]
  if (teamAvg !== null && test !== 'BroadJump') allVals.push(teamAvg)
  const minV = Math.min(...allVals), maxV = Math.max(...allVals)
  const range = maxV - minV || 1
  const sx = (i: number) => PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right)
  const sy = (v: number) => PAD.top + (1 - (v - minV) / range) * (H - PAD.top - PAD.bottom)
  const pts = sorted.map((e, i) => `${sx(i)},${sy(e.score)}`).join(' ')
  const area = `${sx(0)},${H-PAD.bottom} ${pts} ${sx(sorted.length-1)},${H-PAD.bottom}`
  const improved = test === 'Sprint' ? vals[vals.length-1] < vals[0] : vals[vals.length-1] > vals[0]

  // Convert avg to chart scale — for BroadJump use raw score for line
  const teamAvgRaw = teamAvg !== null && test === 'BroadJump'
    ? vals.reduce((a,b)=>a+b,0)/vals.length  // use same scale
    : teamAvg

  return (
    <svg width={W} height={H} style={{ width:'100%', height:'auto', overflow:'visible' }}>
      {[0,1].map(t => {
        const v = minV + t * range
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
      {/* Team avg line */}
      {teamAvg !== null && teamAvgRaw !== null && (
        <>
          <line x1={PAD.left} y1={sy(teamAvgRaw)} x2={W-PAD.right} y2={sy(teamAvgRaw)} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4,2"/>
        </>
      )}
      <polygon points={area} fill={color} fillOpacity="0.08"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      {sorted.map((e, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(e.score)} r="2.5"
            fill={i===sorted.length-1?color:'white'} stroke={color} strokeWidth="1.5"/>
          <text x={sx(i)} y={H-PAD.bottom+10} textAnchor="middle" fontSize="6.5" fill="#94a3b8">
            {e.month.slice(0,3)}
          </text>
        </g>
      ))}
      <text x={W-PAD.right} y={PAD.top} textAnchor="end" fontSize="9" fontWeight="bold"
        fill={improved?'#059669':'#dc2626'}>{improved?'▲':'▼'}</text>
    </svg>
  )
}

function ReportContent() {
  const params = useSearchParams()
  const athleteId = params.get('id')
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [teamEntries, setTeamEntries] = useState<CombineEntry[]>([])
  const [cmpEntries, setCmpEntries] = useState<CombineEntry[]>([])
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
        const cmpTeam = COMPARISON_TEAM[ath.team]
        if (cmpTeam) setCmpEntries(allEntries.filter((e: CombineEntry) => e.team === cmpTeam))
      }
      setLoading(false)
      setGenerated(new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }))
    })
  }, [athleteId])

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial,sans-serif',color:'#64748b' }}><p>Generating report card...</p></div>
  if (!athlete) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial,sans-serif',color:'#64748b' }}><p>Athlete not found</p></div>

  const cmpTeam = COMPARISON_TEAM[athlete.team] || null
  const testsWithData = TEST_TYPES.filter(t => entries.some(e => e.test_type === t))
  const monthYears = [...new Set(sortEntries(entries).map(e => `${e.month}|||${e.year}`))]

  return (
    <div style={{ fontFamily:'Arial,Helvetica,sans-serif', background:'white', color:'#0f172a', minHeight:'100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 10mm; size: A4 portrait; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="no-print" style={{ position:'fixed', top:'16px', right:'16px', zIndex:100, display:'flex', gap:'8px' }}>
        <button onClick={() => window.print()} style={{ padding:'10px 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', boxShadow:'0 4px 12px rgba(29,78,216,0.3)', display:'flex', alignItems:'center', gap:'6px' }}>
          🖨 Print / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ padding:'10px 16px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}>✕</button>
      </div>

      <div style={{ maxWidth:'780px', margin:'0 auto', padding:'28px 32px 40px' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', paddingBottom:'16px', borderBottom:'3px solid #0f172a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'56px', height:'56px', background:'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(29,78,216,0.25)' }}>
              <span style={{ color:'white', fontSize:'18px', fontWeight:700 }}>{athlete.first_name[0]}{athlete.last_name[0]}</span>
            </div>
            <div>
              <h1 style={{ margin:'0 0 5px', fontSize:'22px', fontWeight:700, letterSpacing:'0.02em', color:'#0f172a' }}>
                {athlete.first_name} {athlete.last_name}
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                <span style={{ background:'#0f172a', color:'white', borderRadius:'4px', padding:'2px 10px', fontSize:'11px', fontWeight:700, letterSpacing:'0.06em' }}>{athlete.team}</span>
                {cmpTeam && <span style={{ background:'#e0e7ff', color:'#3730a3', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', fontWeight:600 }}>Compared vs {cmpTeam}</span>}
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:700, color:'#0f172a', letterSpacing:'0.04em' }}>KMHA COMBINE</p>
            <p style={{ margin:'0 0 2px', fontSize:'10px', color:'#64748b' }}>Player Performance Report Card</p>
            <p style={{ margin:0, fontSize:'10px', color:'#94a3b8' }}>{generated}</p>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(testsWithData.length,5)},1fr)`, gap:'8px', marginBottom:'20px' }}>
          {testsWithData.map((test, idx) => {
            const color = TEST_COLORS[idx % TEST_COLORS.length]
            const current = getLatest(entries, test)
            const best = getBest(entries, test)
            const first = getFirst(entries, test)
            const teamAvg = calcAvg(teamEntries, test)
            const cmpAvg = calcAvg(cmpEntries, test)
            const teamScores = teamEntries.filter(e => e.test_type === test).map(e => e.score)
            const pct = best !== null && teamScores.length ? getPercentile(best, teamScores, test) : null
            const vsteam = current !== null ? vsAvg(current, teamAvg, test) : null
            const vscmp = current !== null && cmpTeam ? vsAvg(current, cmpAvg, test) : null
            const improved = first !== null && current !== null && (test === 'Sprint' ? current < first : current > first)

            return (
              <div key={test} style={{ border:`1px solid ${color}30`, borderTop:`3px solid ${color}`, borderRadius:'8px', padding:'10px 8px', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                <p style={{ margin:'0 0 6px', fontSize:'8px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>{getLabel(test)}</p>

                {/* Current score */}
                <p style={{ margin:'0 0 1px', fontSize:'21px', fontWeight:700, color, textAlign:'center', lineHeight:1.1 }}>
                  {current !== null ? formatScore(current, test) : '—'}
                </p>
                <p style={{ margin:'0 0 6px', fontSize:'7.5px', color:'#94a3b8', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>Current</p>

                {/* Personal best if different */}
                {best !== null && best !== current && (
                  <div style={{ textAlign:'center', marginBottom:'5px' }}>
                    <span style={{ fontSize:'8.5px', color:'#64748b' }}>Best: </span>
                    <span style={{ fontSize:'10px', fontWeight:700, color:'#0f172a' }}>{formatScore(best, test)}</span>
                    <span style={{ fontSize:'8px', marginLeft:'2px' }}>★</span>
                  </div>
                )}

                {/* Trend from first */}
                {first !== null && current !== null && first !== current && (
                  <p style={{ margin:'0 0 5px', fontSize:'9px', fontWeight:600, color:improved?'#059669':'#dc2626', textAlign:'center' }}>
                    {improved?'▲':'▼'} from {formatScore(first, test)}
                  </p>
                )}

                <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'5px', display:'flex', flexDirection:'column', gap:'3px' }}>
                  {vsteam && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'8px' }}>
                      <span style={{ color:'#94a3b8' }}>vs {athlete.team}</span>
                      <span style={{ fontWeight:700, color:vsteam.positive?'#059669':'#dc2626' }}>{vsteam.label}</span>
                    </div>
                  )}
                  {vscmp && cmpTeam && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'8px' }}>
                      <span style={{ color:'#94a3b8' }}>vs {cmpTeam}</span>
                      <span style={{ fontWeight:700, color:vscmp.positive?'#059669':'#dc2626' }}>{vscmp.label}</span>
                    </div>
                  )}
                  {pct !== null && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'8px' }}>
                      <span style={{ color:'#94a3b8' }}>Team rank</span>
                      <span style={{ fontWeight:700, color }}>Top {pct}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Trend charts ── */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
            <h2 style={{ margin:0, fontSize:'11px', fontWeight:700, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em' }}>Performance Trends</h2>
            <div style={{ display:'flex', gap:'10px', fontSize:'8px', color:'#94a3b8' }}>
              <span>— — Team avg</span>
              {cmpTeam && <span style={{ color:'#94a3b8' }}>Solid line = this player</span>}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {testsWithData.map((test, idx) => {
              const color = TEST_COLORS[idx % TEST_COLORS.length]
              const teamAvg = calcAvg(teamEntries, test)
              const cmpAvg = calcAvg(cmpEntries, test)
              const best = getBest(entries, test)
              const first = getFirst(entries, test)
              return (
                <div key={test} style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px', background:'#fafafa' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                    <p style={{ margin:0, fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>{getLabel(test)}</p>
                    <span style={{ fontSize:'8px', color:'#94a3b8' }}>{TEST_UNITS[test]}</span>
                  </div>
                  <Sparkline entries={entries} test={test} color={color} teamAvg={teamAvg} cmpAvg={cmpAvg} cmpLabel={cmpTeam||''} />
                  <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:'5px', marginTop:'4px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px', fontSize:'8px', color:'#94a3b8' }}>
                    <span>First: <strong style={{ color:'#475569' }}>{first!==null?formatScore(first,test):'—'}</strong></span>
                    <span>Best: <strong style={{ color }}>{best!==null?formatScore(best,test):'—'}</strong></span>
                    <span>{athlete.team} avg: <strong style={{ color:'#475569' }}>{fmtAvg(teamAvg,test)}</strong></span>
                    {cmpTeam && <span>{cmpTeam} avg: <strong style={{ color:'#475569' }}>{fmtAvg(cmpAvg,test)}</strong></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Score history table (clean layout) ── */}
        <div style={{ marginBottom:'20px' }}>
          <h2 style={{ margin:'0 0 10px', fontSize:'11px', fontWeight:700, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f1f5f9', paddingBottom:'6px' }}>Score History</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'10.5px' }}>
            <thead>
              <tr style={{ background:'#0f172a' }}>
                <th style={{ padding:'7px 10px', textAlign:'left', color:'white', fontWeight:700, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.06em', borderRight:'1px solid #1e3a5f' }}>Month</th>
                {testsWithData.map(test => (
                  <th key={test} style={{ padding:'7px 10px', textAlign:'center', color:'white', fontWeight:700, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.04em', borderRight:'1px solid #1e3a5f' }}>{getLabel(test)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Score rows per month */}
              {monthYears.map((my, i) => {
                const [month, yearStr] = my.split('|||')
                const year = parseInt(yearStr)
                return (
                  <tr key={my} style={{ background: i%2===0?'white':'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'6px 10px', fontWeight:500, color:'#0f172a', fontSize:'10px', borderRight:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{month} {year}</td>
                    {testsWithData.map((test, tidx) => {
                      const e = entries.find(e => e.test_type===test && e.month===month && e.year===year)
                      const best = getBest(entries, test)
                      const isBest = e && best!==null && e.score===best
                      return (
                        <td key={test} style={{ padding:'6px 10px', textAlign:'center', borderRight:'1px solid #f1f5f9', fontWeight:isBest?700:400, color:isBest?TEST_COLORS[tidx%TEST_COLORS.length]:'#475569' }}>
                          {e ? <>{formatScore(e.score,test)}{isBest&&<span style={{ marginLeft:'2px', fontSize:'8px' }}>★</span>}</> : <span style={{ color:'#e2e8f0' }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            {/* Summary rows at the bottom, clearly separated */}
            <tfoot>
              <tr style={{ background:'#f0f4ff', borderTop:'2px solid #1d4ed8' }}>
                <td style={{ padding:'6px 10px', fontSize:'9px', fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.05em', borderRight:'1px solid #dbeafe' }}>Personal Best ★</td>
                {testsWithData.map((test,idx) => {
                  const best = getBest(entries, test)
                  return <td key={test} style={{ padding:'6px 10px', textAlign:'center', fontWeight:700, color:TEST_COLORS[idx%TEST_COLORS.length], fontSize:'11px', borderRight:'1px solid #dbeafe' }}>{best!==null?formatScore(best,test):'—'}</td>
                })}
              </tr>
              <tr style={{ background:'#f8fafc', borderTop:'1px solid #e2e8f0' }}>
                <td style={{ padding:'6px 10px', fontSize:'9px', fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', borderRight:'1px solid #e2e8f0' }}>{athlete.team} Avg</td>
                {testsWithData.map(test => {
                  const avg = calcAvg(teamEntries, test)
                  return <td key={test} style={{ padding:'6px 10px', textAlign:'center', fontWeight:600, color:'#475569', fontSize:'10px', borderRight:'1px solid #e2e8f0' }}>{fmtAvg(avg,test)}</td>
                })}
              </tr>
              {cmpTeam && (
                <tr style={{ background:'#f0f4ff', borderTop:'1px solid #e2e8f0' }}>
                  <td style={{ padding:'6px 10px', fontSize:'9px', fontWeight:600, color:'#3730a3', textTransform:'uppercase', letterSpacing:'0.05em', borderRight:'1px solid #e2e8f0' }}>{cmpTeam} Avg</td>
                  {testsWithData.map(test => {
                    const avg = calcAvg(cmpEntries, test)
                    return <td key={test} style={{ padding:'6px 10px', textAlign:'center', fontWeight:600, color:'#3730a3', fontSize:'10px', borderRight:'1px solid #e2e8f0' }}>{fmtAvg(avg,test)}</td>
                  })}
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'9px', color:'#94a3b8' }}>
          <span>Kitchener Minor Hockey Association · KMHA Combine Performance Tracker</span>
          <span style={{ color:'#cbd5e1', fontStyle:'italic' }}>Confidential — {generated}</span>
        </div>
      </div>
    </div>
  )
}

export default function AthleteReportPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial,sans-serif',color:'#64748b' }}><p>Loading...</p></div>}>
      <ReportContent />
    </Suspense>
  )
}
