'use client'

import { ReactNode, Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'

type Attendance = {
  adjusted_attended?: number
  total_sessions?: number
  adjusted_percentage?: number
}

function AnnualReportLayoutInner({ children }: { children: ReactNode }) {
  const params = useSearchParams()
  const athleteId = params.get('id') || ''
  const season = params.get('season') || '2026-2027'
  const phase = params.get('roster_phase') || 'offseason'
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [summaryHeading, setSummaryHeading] = useState<Element | null>(null)

  useEffect(() => {
    if (!athleteId || phase !== 'inseason') { setAttendance(null); return }
    fetch(`/api/attendance-import?athlete_id=${encodeURIComponent(athleteId)}&season=${encodeURIComponent(season)}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => setAttendance(Array.isArray(rows) && rows.length ? rows[0] : null))
      .catch(() => setAttendance(null))
  }, [athleteId, season, phase])

  useEffect(() => {
    const findHeading = () => {
      const headings = Array.from(document.querySelectorAll('h2'))
      const heading = headings.find(h => h.textContent?.includes('Annual Combine Score Summary')) || null
      setSummaryHeading(heading)
    }
    findHeading()
    const timer = window.setTimeout(findHeading, 100)
    return () => window.clearTimeout(timer)
  }, [athleteId, season, phase])

  const attendanceCard = phase === 'inseason' && attendance ? (
    <div className="attendance-report-card">
      <style>{`
        .attendance-report-card{box-sizing:border-box;background:#f8fafc;border:2px solid #dbeafe;border-radius:10px;padding:14px 18px;font-family:Arial;color:#0f172a;display:grid;grid-template-columns:1.2fr 1fr 1fr;align-items:center;gap:12px;margin:0 0 24px;break-inside:avoid}
        .attendance-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8}
        .attendance-stat{text-align:center;border-left:1px solid #dbeafe}.attendance-label{font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}.attendance-value{font-size:18px;font-weight:800;color:#0f172a;margin-top:3px}.attendance-percent{color:#1d4ed8}
      `}</style>
      <div><div className="attendance-title">Attendance</div></div>
      <div className="attendance-stat"><div className="attendance-label">Attendance</div><div className="attendance-value">{attendance.adjusted_attended ?? 0}/{attendance.total_sessions ?? 0}</div></div>
      <div className="attendance-stat"><div className="attendance-label">Attendance Rate</div><div className="attendance-value attendance-percent">{attendance.adjusted_percentage ?? 0}%</div></div>
    </div>
  ) : null

  return <>
    {children}
    {attendanceCard && summaryHeading ? createPortal(attendanceCard, summaryHeading.parentElement!, summaryHeading) : null}
  </>
}

export default function AnnualReportLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AnnualReportLayoutInner>{children}</AnnualReportLayoutInner>
    </Suspense>
  )
}
