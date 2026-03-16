'use client'
import { useState } from 'react'
import { TEAMS } from '@/types'

export const dynamic = 'force-dynamic'

const SEASONS = [
  '2024-2025 In-Season',
  '2025 Off-Season',
  '2025-2026 In-Season',
  '2026 Off-Season',
  '2026-2027 In-Season',
]

export default function ReportsPage() {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026 In-Season')

  function openReport() {
    const params = new URLSearchParams()
    if (selectedTeam) params.set('team', selectedTeam)
    params.set('season', selectedSeason)
    window.open(`/report?${params.toString()}`, '_blank')
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>REPORTS</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Generate PDF reports for leadership meetings</p>
      </div>

      <div style={{ maxWidth: '520px' }}>
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: 'white', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>TEAM PERFORMANCE REPORT</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Season</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="kmha-select w-full">
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Team (leave blank for all teams)</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">All Teams</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>Report includes:</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>
              · Executive summary (total tests, athletes, teams)<br/>
              · Top 3 leaderboard per test category<br/>
              · Full athlete roster with personal bests<br/>
              · Letter grades (A+/A/B/C/D/F) based on team percentile<br/>
              · Team averages per test<br/>
              · One page per team — print-ready
            </p>
          </div>

          <button onClick={openReport} style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', letterSpacing: '0.04em' }}>
            🖨 Generate PDF Report
          </button>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#334155', textAlign: 'center' }}>Opens in new tab · Use browser Print (Cmd+P) → Save as PDF</p>
        </div>

        <div style={{ background: 'rgba(10,20,40,0.4)', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>How to save as PDF:</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.7 }}>
            1. Click Generate PDF Report<br/>
            2. Press <strong style={{ color: '#64748b' }}>Cmd + P</strong> (Mac) or <strong style={{ color: '#64748b' }}>Ctrl + P</strong> (Windows)<br/>
            3. Change destination to <strong style={{ color: '#64748b' }}>"Save as PDF"</strong><br/>
            4. Click Save
          </p>
        </div>
      </div>
    </div>
  )
}
