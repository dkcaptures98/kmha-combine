'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function AnnualAttendanceInjector(){
  const pathname=usePathname(), params=useSearchParams()
  useEffect(()=>{
    if(pathname!=='/athlete-annual-report')return
    const athleteId=params.get('id'), season=params.get('season')||'2026-2027'
    if(!athleteId)return

    let node:HTMLDivElement|null=null
    let cancelled=false
    let observer:MutationObserver|null=null
    let retryTimer:ReturnType<typeof setTimeout>|null=null

    const place=async()=>{
      try{
        const r=await fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`)
        if(!r.ok)return
        const rows=await r.json()
        if(cancelled||!Array.isArray(rows)||!rows.length)return
        const a=rows[0]

        const insert=()=>{
          if(cancelled)return true
          const heading=[...document.querySelectorAll('h2')].find(h=>h.textContent?.includes('Annual Combine Score Summary'))
          if(!heading)return false
          document.getElementById('annual-attendance-summary')?.remove()
          node=document.createElement('div')
          node.id='annual-attendance-summary'
          node.style.cssText='margin:12px 0 16px;padding:8px 14px;border:1px solid #dbeafe;border-radius:7px;background:#f8fbff;display:flex;align-items:center;justify-content:space-between;gap:12px;break-inside:avoid;page-break-inside:avoid;min-height:0;'
          node.innerHTML=`<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><div style="font-size:8px;font-weight:800;color:#64748b;letter-spacing:.09em;text-transform:uppercase">Attendance</div><div style="font-size:15px;line-height:1.2;font-weight:900;color:#0f172a">${a.adjusted_attended} / ${a.total_sessions} sessions <span style="color:#2563eb">· ${Number(a.adjusted_percentage).toFixed(1)}%</span></div></div>`
          heading.parentElement?.insertBefore(node,heading)
          return true
        }

        if(insert())return
        observer=new MutationObserver(()=>{if(insert())observer?.disconnect()})
        observer.observe(document.body,{childList:true,subtree:true})
        retryTimer=setTimeout(()=>{insert();observer?.disconnect()},4000)
      }catch{}
    }

    place()
    return()=>{
      cancelled=true
      observer?.disconnect()
      if(retryTimer)clearTimeout(retryTimer)
      node?.remove()
    }
  },[pathname,params])
  return null
}
