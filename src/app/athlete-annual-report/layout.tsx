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
    if (!attendance || !cardRef.current) return
    const place = () => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Annual Combine Score Summary'))
      if (heading?.parentElement && cardRef.current) heading.parentElement.insertBefore(cardRef.current, heading)
    }
    place()
    const timer = window.setTimeout(place, 100)
    return () => window.clearTimeout(timer)
  }, [attendance, athleteId, season, phase])

  return <>
    {children}
    {phase === 'inseason' && attendance && (
      <div ref={cardRef} className="attendance-report-card">
        <style>{`
          .attendance-report-card{box-sizing:border-box;background:#f8fafc;border:2px solid #dbeafe;border-radius:10px;padding:14px 18px;font-family:Arial;color:#0f172a;display:grid;grid-template-columns:1.2fr 1fr 1fr;align-items:center;gap:12px;margin:0 0 24px;break-inside:avoid}
          .attendance-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8}
          .attendance-stat{text-align:center;border-left:1px solid #dbeafe}.attendance-label{font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}.attendance-value{font-size:18px;font-weight:800;color:#0f172a;margin-top:3px}.attendance-percent{color:#1d4ed8}
        `}</style>
        <div><div className="attendance-title">Attendance</div></div>
        <div className="attendance-stat"><div className="attendance-label">Attendance</div><div className="attendance-value">{attendance.adjusted_attended ?? 0}/{attendance.total_sessions ?? 0}</div></div>
        <div className="attendance-stat"><div className="attendance-label">Attendance Rate</div><div className="attendance-value attendance-percent">{attendance.adjusted_percentage ?? 0}%</div></div>
      </div>
    )}
  </>
}

export default function AnnualReportLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={children}><AnnualReportLayoutInner>{children}</AnnualReportLayoutInner></Suspense>
}
