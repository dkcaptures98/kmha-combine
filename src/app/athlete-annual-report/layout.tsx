'use client'

import { ReactNode, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Attendance = {
  raw_attended?: number
  adjusted_attended?: number
  total_sessions?: number
  adjusted_percentage?: number
  bonus_sessions?: number
  first_session?: string
  last_session?: string
}

function AnnualReportLayoutInner({ children }: { children: ReactNode }) {
  const params = useSearchParams()
  const athleteId = params.get('id') || ''
  const season = params.get('season') || '2026-2027'
  const phase = params.get('roster_phase') || 'offseason'
  const [attendance, setAttendance] = useState<Attendance | null>(null)

  useEffect(() => {
    if (!athleteId || phase !== 'inseason') { setAttendance(null); return }
    fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => setAttendance(Array.isArray(rows) && rows.length ? rows[0] : null))
      .catch(() => setAttendance(null))
  }, [athleteId, season, phase])

  return <>
    {children}
    {phase === 'inseason' && attendance && (
      <div className="attendance-report-card">
        <style>{`
          .attendance-report-card{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:min(848px,calc(100% - 72px));box-sizing:border-box;background:#f8fafc;border:2px solid #dbeafe;border-radius:10px;padding:12px 16px;font-family:Arial;color:#0f172a;z-index:5;display:grid;grid-template-columns:1.35fr repeat(3,1fr);align-items:center;gap:12px;box-shadow:0 4px 14px rgba(15,23,42,.06)}
          .attendance-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8}.attendance-sub{font-size:9px;color:#64748b;margin-top:3px}.attendance-stat{text-align:center;border-left:1px solid #dbeafe}.attendance-label{font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}.attendance-value{font-size:18px;font-weight:800;color:#0f172a;margin-top:3px}.attendance-percent{color:#1d4ed8}
          @media print{.attendance-report-card{position:fixed;bottom:8mm;box-shadow:none;width:calc(100% - 40px)}}
        `}</style>
        <div><div className="attendance-title">Attendance</div><div className="attendance-sub">{attendance.first_session || ''}{attendance.first_session && attendance.last_session ? ' – ' : ''}{attendance.last_session || ''} · +7% report-card adjustment applied</div></div>
        <div className="attendance-stat"><div className="attendance-label">Raw Attendance</div><div className="attendance-value">{attendance.raw_attended ?? 0}/{attendance.total_sessions ?? 0}</div></div>
        <div className="attendance-stat"><div className="attendance-label">Adjusted Attendance</div><div className="attendance-value">{attendance.adjusted_attended ?? 0}/{attendance.total_sessions ?? 0}</div></div>
        <div className="attendance-stat"><div className="attendance-label">Attendance Rate</div><div className="attendance-value attendance-percent">{attendance.adjusted_percentage ?? 0}%</div></div>
      </div>
    )}
  </>
}

export default function AnnualReportLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AnnualReportLayoutInner>{children}</AnnualReportLayoutInner>
    </Suspense>
  )
}
