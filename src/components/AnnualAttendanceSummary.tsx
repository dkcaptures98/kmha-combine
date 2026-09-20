'use client'
import { useEffect, useState } from 'react'

type Attendance={adjusted_attended:number;total_sessions:number;adjusted_percentage:number;raw_attended:number;bonus_sessions:number;first_session?:string;last_session?:string}
export default function AnnualAttendanceSummary({athleteId,season}:{athleteId:string;season:string}){
  const [a,setA]=useState<Attendance|null>(null)
  useEffect(()=>{if(!athleteId)return;fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`).then(r=>r.ok?r.json():[]).then(d=>setA(Array.isArray(d)&&d.length?d[0]:null)).catch(()=>setA(null))},[athleteId,season])
  if(!a)return null
  return <div style={{margin:'8px 0 20px',padding:'11px 14px',border:'1px solid #dbeafe',borderRadius:8,background:'#f8fbff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}><div><div style={{fontSize:9,fontWeight:800,color:'#64748b',letterSpacing:'.09em',textTransform:'uppercase'}}>Attendance</div><div style={{fontSize:18,fontWeight:900,color:'#0f172a',marginTop:2}}>{a.adjusted_attended} / {a.total_sessions} sessions <span style={{color:'#2563eb'}}>· {Number(a.adjusted_percentage).toFixed(1)}%</span></div></div><div style={{textAlign:'right',fontSize:9,color:'#94a3b8'}}>TeamBuildr attendance<br/>includes +7% adjustment</div></div>
}
