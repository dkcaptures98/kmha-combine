'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete } from '@/types'

export const dynamic = 'force-dynamic'

const U10_12 = ['U10AA','U10AAA','U11AA','U11AAA','U12AA','U12AAA']

type CombineResult = {
  athlete_id?: string
  athlete_name?: string
  team?: string
  season?: string
  roster_phase?: string | null
  sprint?: number | null
  height_ft?: number | null
  height_in?: number | null
  wingspan_ft?: number | null
  wingspan_in?: number | null
  vertical?: number | null
  broad_jump_ft?: number | null
  broad_jump_in?: number | null
  chinup_hold?: number | null
  chinups?: number | null
  mile02_time?: string | null
  mile02_watts?: number | null
}

type RegularEntry = {
  athlete_id?: string
  athlete_name?: string
  team: string
  test_type: string
  score: number
}

function isU1012(team: string) { return U10_12.includes(team) }
function isLRTeam(team: string) { return /LR/i.test(team) }
function getTeamAge(team: string) { const m = team.match(/U(\d+)/i); return m ? Number(m[1]) : null }
function fmtJump(ft?: number | null, inches?: number | null) { if (ft == null && inches == null) return '—'; return `${ft ?? 0}'${inches ?? 0}"` }
function toInches(ft?: number | null, inches?: number | null) { if (ft == null && inches == null) return null; return (ft ?? 0) * 12 + (inches ?? 0) }
function fmtInches(v: number) { const ft = Math.floor(v / 12); const inches = Math.round((v - ft * 12) * 10) / 10; return `${ft}'${inches}"` }
function fmtNum(v: unknown, suffix = '') { return typeof v === 'number' && Number.isFinite(v) ? `${Number.isInteger(v) ? v : v.toFixed(2)}${suffix}` : '—' }
function parseTimeSeconds(v?: string | null) { if (!v) return null; const s = String(v).trim(); if (!s) return null; if (s.includes(':')) { const [m, sec] = s.split(':').map(Number); return Number.isFinite(m) && Number.isFinite(sec) ? m * 60 + sec : null } const n = Number(s); return Number.isFinite(n) ? n : null }
function avg(values: Array<number | null | undefined>) { const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)); return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null }

function eligibleForPool(athleteTeam: string, rowTeam: string) {
  const age = getTeamAge(athleteTeam)
  const rowAge = getTeamAge(rowTeam)
  if (!age || !rowAge) return false
  if (isLRTeam(athleteTeam)) return isLRTeam(rowTeam) && rowAge >= age
  return !isLRTeam(rowTeam) && rowAge >= age
}

function regularTestFor(key: string) {
  if (key === 'sprint') return 'Sprint'
  if (key === 'vertical') return 'Vertical'
  if (key === 'broad') return 'BroadJump'
  if (key === 'chinups') return 'Chinups'
  if (key === 'chinhold') return 'ChinHold'
  return null
}

function combineValue(row: CombineResult, key: string) {
  if (key === 'sprint') return row.sprint ?? null
  if (key === 'height') return toInches(row.height_ft, row.height_in)
  if (key === 'wingspan') return toInches(row.wingspan_ft, row.wingspan_in)
  if (key === 'vertical') return row.vertical ?? null
  if (key === 'broad') return toInches(row.broad_jump_ft, row.broad_jump_in)
  if (key === 'chinhold') return row.chinup_hold ?? null
  if (key === 'chinups') return row.chinups ?? null
  if (key === 'time') return parseTimeSeconds(row.mile02_time)
  if (key === 'watts') return row.mile02_watts ?? null
  return null
}

function formatValue(key: string, value: number | null, rawDisplay?: string) {
  if (value == null) return '—'
  if (rawDisplay) return rawDisplay
  if (key === 'height' || key === 'wingspan' || key === 'broad') return fmtInches(value)
  if (key === 'sprint') return `${value.toFixed(2)}s`
  if (key === 'time') return `${value.toFixed(1)}s`
  if (key === 'watts') return `${Math.round(value)} W`
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function AnnualReportContent() {
  const params = useSearchParams()
  const athleteId = params.get('id') || ''
  const season = params.get('season') || '2026-2027'
  const phase = params.get('roster_phase') || 'offseason'
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [combineRows, setCombineRows] = useState<CombineResult[]>([])
  const [regularEntries, setRegularEntries] = useState<RegularEntry[]>([])
  const [loading, setLoading] = useState(true)
  const generated = new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch('/api/combine').then(r => r.json()).catch(() => []),
      fetch('/api/entries').then(r => r.json()).catch(() => []),
    ]).then(([a, c, e]) => {
      setAthletes(Array.isArray(a) ? a : [])
      setCombineRows(Array.isArray(c) ? c : [])
      setRegularEntries(Array.isArray(e) ? e : [])
      setLoading(false)
    })
  }, [])

  const athlete = athletes.find(a => a.id === athleteId)
  const row = combineRows.find(r => r.athlete_id === athleteId && r.season === season && (!r.roster_phase || r.roster_phase === phase))
  const young = athlete ? isU1012(athlete.team) : false

  const testCards = useMemo(() => {
    if (!row || !athlete) return []
    const base = [
      { key: 'sprint', label: '10m Sprint', raw: row.sprint, display: undefined },
      { key: 'height', label: 'Height', raw: toInches(row.height_ft, row.height_in), display: fmtJump(row.height_ft, row.height_in) },
      { key: 'wingspan', label: 'Wingspan', raw: toInches(row.wingspan_ft, row.wingspan_in), display: fmtJump(row.wingspan_ft, row.wingspan_in) },
      { key: 'vertical', label: 'Vertical Jump', raw: row.vertical, display: undefined },
      { key: 'broad', label: 'Broad Jump', raw: toInches(row.broad_jump_ft, row.broad_jump_in), display: fmtJump(row.broad_jump_ft, row.broad_jump_in) },
      young ? { key: 'chinhold', label: 'Chin Hold', raw: row.chinup_hold, display: undefined } : { key: 'chinups', label: 'Chinups', raw: row.chinups, display: undefined },
      ...(!young ? [
        { key: 'time', label: '0.5km Time', raw: parseTimeSeconds(row.mile02_time), display: row.mile02_time ? `${row.mile02_time}s` : undefined },
        { key: 'watts', label: 'Avg Watts', raw: row.mile02_watts, display: undefined },
      ] : []),
    ]
    return base.filter(card => card.raw !== null && card.raw !== undefined && card.raw !== '')
  }, [row, athlete, young])

  function benchmarkFor(key: string) {
    if (!athlete) return null
    const combinePool = combineRows.filter(r => r.season === season && (!r.roster_phase || r.roster_phase === phase) && eligibleForPool(athlete.team, r.team || '')).map(r => combineValue(r, key))
    const regularTest = regularTestFor(key)
    const regularPool = regularTest ? regularEntries.filter(e => eligibleForPool(athlete.team, e.team) && e.test_type === regularTest && Number.isFinite(e.score)).map(e => e.score) : []
    return avg([...combinePool, ...regularPool])
  }

  if (!athleteId) return <div style={{ padding: 48, fontFamily: 'Arial' }}>No athlete selected</div>
  if (loading) return <div style={{ padding: 48, fontFamily: 'Arial' }}>Generating annual combine report card...</div>
  if (!athlete) return <div style={{ padding: 48, fontFamily: 'Arial' }}>Athlete not found</div>

  const poolLabel = isLRTeam(athlete.team) ? `${getTeamAge(athlete.team) ? `U${getTeamAge(athlete.team)}+ LR` : 'LR'} Average` : `${getTeamAge(athlete.team) ? `U${getTeamAge(athlete.team)}+` : 'Age Group+'} Average`
  const colors = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#be123c', '#4338ca']

  return (
    <div style={{ fontFamily:'Arial, Helvetica, sans-serif', background:'white', color:'#0f172a', minHeight:'100vh' }}>
      <style>{`@media print {.no-print{display:none!important} body{print-color-adjust:exact;-webkit-print-color-adjust:exact} @page{margin:12mm;size:A4 portrait}.report-wrapper{max-width:100%!important;padding:20px!important}}`}</style>
      <div className="no-print" style={{ position:'fixed', top:16, right:16, zIndex:100, display:'flex', gap:8 }}>
        <button onClick={() => window.print()} style={{ padding:'10px 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>🖨 Print / Save PDF</button>
        <button onClick={() => window.close()} style={{ padding:'10px 16px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:8, fontSize:14, cursor:'pointer' }}>✕ Close</button>
      </div>
      <div className="report-wrapper" style={{ maxWidth:920, margin:'0 auto', padding:'36px 36px 48px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:20, borderBottom:'3px solid #0f172a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:64, height:64, background:'#0f172a', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ color:'white', fontSize:22, fontWeight:700 }}>{athlete.first_name[0]}{athlete.last_name[0]}</span></div>
            <div>
              <h1 style={{ margin:'0 0 4px', fontSize:26, fontWeight:700, letterSpacing:'0.02em', color:'#0f172a' }}>{athlete.first_name.toUpperCase()} {athlete.last_name.toUpperCase()}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}><span style={{ background:'#0f172a', color:'white', borderRadius:4, padding:'2px 10px', fontSize:12, fontWeight:700, letterSpacing:'0.06em' }}>{athlete.team}</span><span style={{ fontSize:12, color:'#64748b' }}>Annual Combine Report Card · {season} · {phase}</span></div>
            </div>
          </div>
          <div style={{ textAlign:'right', fontSize:11, color:'#64748b', lineHeight:1.8 }}><p style={{ margin:0, fontWeight:600, color:'#0f172a' }}>KMHA Combine Tracker</p><p style={{ margin:0 }}>Generated: {generated}</p><p style={{ margin:0 }}>{testCards.length} combine tests recorded</p></div>
        </div>

        {!row && <div style={{ border:'1px solid #fee2e2', background:'#fef2f2', color:'#991b1b', borderRadius:8, padding:18, marginBottom:20 }}>No annual combine result found for {athlete.first_name} {athlete.last_name} in {season} · {phase}.</div>}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:28 }}>
          {testCards.map((card, idx) => {
            const color = colors[idx % colors.length]
            const benchmark = benchmarkFor(card.key)
            return <div key={card.key} style={{ border:`2px solid ${color}20`, borderRadius:10, padding:'14px 12px', textAlign:'center', background:`${color}06` }}>
              <p style={{ margin:'0 0 6px', fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>{card.label}</p>
              <p style={{ margin:'0 0 2px', fontSize:22, fontWeight:700, color, fontFamily:'Georgia, serif' }}>{formatValue(card.key, card.raw as number | null, card.display)}</p>
              <p style={{ margin:'0 0 8px', fontSize:9, color:'#94a3b8' }}>Annual Combine Result</p>
              <div style={{ background:'white', border:`1px solid ${color}30`, borderRadius:5, padding:'4px 7px', display:'inline-block', minWidth:104 }}>
                <div style={{ fontSize:8, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{benchmark === null ? 'Benchmark N/A' : poolLabel}</div>
                <div style={{ fontSize:11, fontWeight:700, color }}>{benchmark === null ? '—' : formatValue(card.key, benchmark)}</div>
              </div>
            </div>
          })}
        </div>

        <div style={{ marginBottom:14 }}>
          <h2 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f1f5f9', paddingBottom:8 }}>Annual Combine Score Summary</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead><tr style={{ background:'#0f172a' }}>{['Test','Score',poolLabel].map((h, i) => <th key={h} style={{ padding:'8px 12px', textAlign:i===0?'left':'center', color:'white', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>)}</tr></thead>
            <tbody>{testCards.map((card, idx) => { const benchmark = benchmarkFor(card.key); return <tr key={card.key} style={{ background:idx%2===0?'white':'#f8fafc', borderBottom:'1px solid #f1f5f9' }}><td style={{ padding:'8px 12px', fontWeight:700 }}>{card.label}</td><td style={{ padding:'8px 12px', textAlign:'center' }}>{formatValue(card.key, card.raw as number | null, card.display)}</td><td style={{ padding:'8px 12px', textAlign:'center', color:'#64748b' }}>{benchmark === null ? '—' : formatValue(card.key, benchmark)}</td></tr> })}</tbody>
          </table>
        </div>

        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:10, color:'#94a3b8' }}><span>Kitchener Minor Hockey Association · KMHA Annual Combine Report Card</span><span>CONFIDENTIAL · {generated}</span></div>
      </div>
    </div>
  )
}

export default function AthleteAnnualReportPage() {
  return <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}><p>Loading...</p></div>}><AnnualReportContent /></Suspense>
}
