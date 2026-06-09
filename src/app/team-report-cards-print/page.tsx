'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete } from '@/types'

type CombineResult = { athlete_id?: string; season?: string; roster_phase?: string | null }
type RegularEntry = { athlete_id?: string; month?: string; year?: number }

const REGULAR_SEASONS = ['All Regular Testing','2024-2025 In-Season','2025 Off-Season','2025-2026 In-Season','2026 Off-Season','2026-2027 In-Season','2027 Off-Season','2027-2028 In-Season','2028 Off-Season','2028-2029 In-Season']
function getSeasonWindow(label: string) { if (!label || label === 'All Regular Testing') return null; const off = label.match(/^(\d{4}) Off-Season$/i); if (off) return { years:[Number(off[1])], months:['May','June','July','August'], fallYear:Number(off[1]), springYear:Number(off[1]) }; const ins = label.match(/^(\d{4})-(\d{4}) In-Season$/i); if (ins) return { years:[Number(ins[1]), Number(ins[2])], months:['September','October','November','December','January','February','March'], fallYear:Number(ins[1]), springYear:Number(ins[2]) }; return null }
function entryInRegularSeason(e: RegularEntry, season: string) { const w = getSeasonWindow(season); if (!w) return true; if (!e.year || !e.month || !w.years.includes(e.year) || !w.months.includes(e.month)) return false; if (w.years.length === 2) { if (['September','October','November','December'].includes(e.month)) return e.year === w.fallYear; if (['January','February','March'].includes(e.month)) return e.year === w.springYear } return true }

function TeamReportCardsPrintContent() {
  const params = useSearchParams()
  const team = params.get('team') || ''
  const mode = params.get('mode') === 'annual' ? 'annual' : 'regular'
  const regularSeason = params.get('season_filter') || REGULAR_SEASONS[0]
  const annualSeason = params.get('season') || '2026-2027'
  const phase = params.get('roster_phase') || 'offseason'
  const [athletes,setAthletes]=useState<Athlete[]>([])
  const [combine,setCombine]=useState<CombineResult[]>([])
  const [entries,setEntries]=useState<RegularEntry[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{Promise.all([fetch('/api/athletes').then(r=>r.json()),fetch('/api/combine').then(r=>r.json()).catch(()=>[]),fetch('/api/entries').then(r=>r.json()).catch(()=>[])]).then(([a,c,e])=>{setAthletes(Array.isArray(a)?a:[]);setCombine(Array.isArray(c)?c:[]);setEntries(Array.isArray(e)?e:[]);setLoading(false)})},[])
  const annualIds = new Set(combine.filter(r=>r.season===annualSeason && (!r.roster_phase || r.roster_phase===phase)).map(r=>r.athlete_id).filter(Boolean) as string[])
  const regularIds = new Set(entries.filter(e=>entryInRegularSeason(e, regularSeason)).map(e=>e.athlete_id).filter(Boolean) as string[])
  const selected = athletes.filter(a=>a.team===team && (mode==='annual'?annualIds.has(a.id):(regularSeason==='All Regular Testing'||regularIds.has(a.id)))).sort((a,b)=>a.last_name.localeCompare(b.last_name))
  function reportUrl(id:string){return mode==='annual'?`/athlete-annual-report?id=${id}&season=${annualSeason}&roster_phase=${phase}`:`/athlete-report?id=${id}${regularSeason==='All Regular Testing'?'':`&season_filter=${encodeURIComponent(regularSeason)}`}`}
  if(!team)return <div style={{padding:48,fontFamily:'Arial'}}>No team selected.</div>
  if(loading)return <div style={{padding:48,fontFamily:'Arial'}}>Building team report-card packet...</div>
  return <div style={{background:'#e5e7eb',minHeight:'100vh'}}><style>{`@page{size:A4 portrait;margin:0} @media print{.no-print{display:none!important} body{margin:0;background:white!important}.packet-page{break-after:page;page-break-after:always;margin:0!important;box-shadow:none!important}.packet-page:last-child{break-after:auto;page-break-after:auto} iframe{border:0!important}}`}</style><div className="no-print" style={{position:'sticky',top:0,zIndex:10,background:'#0f172a',color:'white',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 6px 20px rgba(0,0,0,.25)'}}><div><strong>{team} Report Card Packet</strong><div style={{fontSize:12,color:'#94a3b8'}}>{mode==='annual'?`${annualSeason} · ${phase}`:regularSeason} · {selected.length} athletes</div></div><button onClick={()=>window.print()} style={{background:'#2563eb',color:'white',border:'none',borderRadius:8,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>🖨 Print Packet</button></div>{selected.length===0&&<div style={{padding:48,fontFamily:'Arial'}}>No athletes found for this team/selection.</div>}<div>{selected.map(a=><div className="packet-page" key={a.id} style={{width:'210mm',height:'297mm',margin:'18px auto',background:'white',boxShadow:'0 12px 34px rgba(15,23,42,.2)',overflow:'hidden'}}><iframe src={reportUrl(a.id)} style={{width:'100%',height:'100%',border:0,display:'block'}} /></div>)}</div></div>
}

export default function TeamReportCardsPrintPage(){return <Suspense fallback={<div style={{padding:48,fontFamily:'Arial'}}>Loading...</div>}><TeamReportCardsPrintContent/></Suspense>}
