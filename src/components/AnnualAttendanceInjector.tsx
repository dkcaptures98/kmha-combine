'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function AnnualAttendanceInjector(){
  const pathname=usePathname(), params=useSearchParams()
  useEffect(()=>{
    if(pathname!=='/athlete-annual-report')return
    const athleteId=params.get('id'), season=params.get('season')||'2026-2027'
    if(!athleteId)return
    let node:HTMLDivElement|null=null, cancelled=false
    const place=async()=>{
      try{
        const r=await fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`)
        if(!r.ok)return
        const rows=await r.json(); if(cancelled||!Array.isArray(rows)||!rows.length)return
        const a=rows[0]
        const heading=[...document.querySelectorAll('h2')].find(h=>h.textContent?.includes('Annual Combine Score Summary'))
        if(!heading)return
        document.getElementById('annual-attendance-summary')?.remove()
        node=document.createElement('div');node.id='annual-attendance-summary'
        node.style.cssText='margin:8px 0 22px;padding:11px 14px;border:1px solid #dbeafe;border-radius:8px;background:#f8fbff;display:flex;align-items:center;justify-content:space-between;gap:16px;'
        node.innerHTML=`<div><div style="font-size:9px;font-weight:800;color:#64748b;letter-spacing:.09em;text-transform:uppercase">Attendance</div><div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:2px">${a.adjusted_attended} / ${a.total_sessions} sessions <span style="color:#2563eb">· ${Number(a.adjusted_percentage).toFixed(1)}%</span></div></div><div style="text-align:right;font-size:9px;color:#94a3b8">TeamBuildr attendance<br>includes +7% adjustment</div>`
        heading.parentElement?.insertBefore(node,heading)
      }catch{}
    }
    const timer=setTimeout(place,250)
    return()=>{cancelled=true;clearTimeout(timer);node?.remove()}
  },[pathname,params])
  return null
}
