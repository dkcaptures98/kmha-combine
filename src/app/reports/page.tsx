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

const AGE_GROUPS = ['U10','U11','U12','U13','U14','U15','U16','U18']

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'team'|'agegroup'>('team')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('U15')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026 In-Season')

  function openReport() {
    const params = new URLSearchParams()
    params.set('season', selectedSeason)
    params.set('type', reportType)
    if (reportType === 'team' && selectedTeam) params.set('team', selectedTeam)
    if (reportType === 'agegroup') params.set('age_group', selectedAgeGroup)
    window.open(`/report?${params.toString()}`, '_blank')
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>REPORTS</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Generate PDF performance reports for leadership meetings</p>
      </div>

      <div style={{ maxWidth: '560px' }}>
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>

          {/* Report type selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Report Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { value: 'team', label: 'Team Report', desc: 'Trend graphs + full roster scores for one or all teams' },
                { value: 'agegroup', label: 'Age Group Comparison', desc: 'Compare all teams within an age group side by side' },
              ].map(r => (
                <button key={r.value} onClick={() => setReportType(r.value as any)} style={{
                  padding: '14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' as const,
                  background: reportType === r.value ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${reportType === r.value ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.1)'}`,
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: reportType === r.value ? '#60a5fa' : '#94a3b8', fontFamily: 'var(--font-display)' }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Season */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Season</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="kmha-select w-full">
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Team selector */}
          {reportType === 'team' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Team (leave blank for all teams)</label>
              <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
                <option value="">All Teams</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Age group selector */}
          {reportType === 'agegroup' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Age Group</label>
              <select value={selectedAgeGroup} onChange={e => setSelectedAgeGroup(e.target.value)} className="kmha-select w-full">
                {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {/* What's included */}
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>Report includes:</p>
            {reportType === 'team' ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
                · Line graph showing team average trend per test over the season<br/>
                · Full athlete roster with first score and personal best<br/>
                · Improvement indicators (▲▼) per athlete<br/>
                · Team averages row at the bottom<br/>
                · One page per team, landscape print-ready
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
                · Side-by-side line graph comparing all teams in the age group<br/>
                · One chart per test type (Sprint, Vertical, Chinups, etc.)<br/>
                · Each team shown as a different coloured line<br/>
                · Easy to see which team is leading each test category
              </p>
            )}
          </div>

          <button onClick={openReport} style={{ width: '100%', padding: '13px', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', letterSpacing: '0.04em' }}>
            🖨 Generate PDF Report
          </button>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#334155', textAlign: 'center' }}>Opens in new tab · Cmd+P → Save as PDF</p>
        </div>

        <div style={{ background: 'rgba(10,20,40,0.4)', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>How to save as PDF:</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.7 }}>
            1. Click Generate PDF Report<br/>
            2. Press <strong style={{ color: '#64748b' }}>Cmd + P</strong> (Mac) or <strong style={{ color: '#64748b' }}>Ctrl + P</strong> (Windows)<br/>
            3. Change destination to <strong style={{ color: '#64748b' }}>"Save as PDF"</strong><br/>
            4. Set layout to <strong style={{ color: '#64748b' }}>Landscape</strong> for best results<br/>
            5. Click Save
          </p>
        </div>
      </div>
    </div>
  )
}
