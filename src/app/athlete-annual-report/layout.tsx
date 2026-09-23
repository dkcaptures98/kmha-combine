'use client'

import { ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Attendance = { adjusted_attended?: number; total_sessions?: number; adjusted_percentage?: number }

function AnnualReportLayoutInner({ children }: { children: ReactNode }) {
  const params = useSearchParams()
  const athleteId = params.get('id') || ''
  const season = params.get('season') || '2026-2027'
  const phase = params.get('roster_phase') || 'offseason'
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!athleteId || phase !== 'inseason') { setAttendance(null); return }
    fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => setAttendance(Array.isArray(rows) && rows.length ? rows[0] : null))
      .catch(() => setAttendance(null))
  }, [athleteId, season, phase])

  useEffect(() => {
    if (!attendance) return
    let stopped = false
    const place = () => {
      if (stopped || !cardRef.current) return false
      const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Annual Combine Score Summary'))
      if (!heading?.parentElement) return false
      if (cardRef.current.nextElementSibling !== heading) heading.parentElement.insertBefore(cardRef.current, heading)
      return true
    }
    place()
    const observer = new MutationObserver(() => place())
    observer.observe(document.body, { childList: true, subtree: true })
    const timers = [50,150,300,600,1000].map(ms => window.setTimeout(place, ms))
    return () => { stopped = true; observer.disconnect(); timers.forEach(window.clearTimeout) }
  }, [attendance, athleteId, season, phase])

  return <>
    {children}
    {phase === 'inseason' && attendance && (
      <div ref={cardRef} className="attendance-report-card">
        <style>{`
          .attendance-report-card{box-sizing:border-box;background:#f8fafc;border:1.5px solid #dbeafe;border-radius:8px;padding:7px 12px;font-family:Arial;color:#0f172a;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:6px;margin:0 0 10px;break-inside:avoid;page-break-inside:avoid}
          .attendance-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8}
          .attendance-stat{text-align:center;border-left:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;gap:8px;min-height:24px}
          .attendance-label{font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
          .attendance-value{font-size:15px;font-weight:800;color:#0f172a}
          .attendance-percent{color:#1d4ed8}
          @media print{.attendance-report-card{padding:6px 10px;margin-bottom:8px}}
        `}</style>
        <div className="attendance-title">Attendance</div>
        <div className="attendance-stat"><div className="attendance-label">Attendance</div><div className="attendance-value">{attendance.adjusted_attended ?? 0}/{attendance.total_sessions ?? 0}</div></div>
        <div className="attendance-stat"><div className="attendance-label">Attendance Rate</div><div className="attendance-value attendance-percent">{attendance.adjusted_percentage ?? 0}%</div></div>
      </div>
    )}
  </>
}

export default function AnnualReportLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={children}><AnnualReportLayoutInner>{children}</AnnualReportLayoutInner></Suspense>
}
