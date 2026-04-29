'use client'
import { useState, useEffect } from 'react'
import { Athlete, TEAMS } from '@/types'

export const dynamic = 'force-dynamic'

export default function PlayerReportCardsPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<Athlete | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState('')

  useEffect(() => {
    fetch('/api/athletes').then(r => r.json()).then(data => {
      setAthletes(data)
      setLoading(false)
    })
  }, [])

  function openReport(athleteId: string) {
    setGenerating(athleteId)
    window.open(`/athlete-report?id=${athleteId}`, '_blank')
    setTimeout(() => setGenerating(null), 1000)
  }

  function openAllTeamReports() {
    filtered.forEach((athlete, i) => {
      setTimeout(() => window.open(`/athlete-report?id=${athlete.id}`, '_blank'), i * 400)
    })
  }

  async function handleEmailReport() {
    if (!emailModal || !emailAddress) return
    setEmailSending(true)
    setEmailResult('')
    // Build the report URL
    const reportUrl = `${window.location.origin}/athlete-report?id=${emailModal.id}`
    // For now, open mailto with the link (full email sending requires backend email provider)
    const subject = encodeURIComponent(`KMHA Combine Report Card — ${emailModal.first_name} ${emailModal.last_name}`)
    const body = encodeURIComponent(`Hi,\n\nPlease find the KMHA Combine Performance Report Card for ${emailModal.first_name} ${emailModal.last_name} (${emailModal.team}) at the link below:\n\n${reportUrl}\n\nTo save as PDF: open the link, then press Cmd+P (Mac) or Ctrl+P (Windows) and choose "Save as PDF".\n\nKitchener Minor Hockey Association\nCombine Performance Tracker`)
    window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`)
    setEmailResult(`✓ Email draft opened for ${emailAddress}`)
    setEmailSending(false)
  }

  const filtered = athletes.filter(a => {
    const matchTeam = !selectedTeam || a.team === selectedTeam
    const matchSearch = !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase())
    return matchTeam && matchSearch
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  const teamCounts = filtered.reduce((acc, a) => { acc[a.team] = (acc[a.team] || 0) + 1; return acc }, {} as Record<string,number>)

  return (
    <div style={{ paddingBottom: '48px' }}>
      {/* Email modal */}
      {emailModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#0a1428', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'12px', padding:'28px', maxWidth:'420px', width:'100%' }}>
            <h2 style={{ margin:'0 0 4px', fontSize:'18px', fontWeight:700, color:'white', fontFamily:'var(--font-display)' }}>Email Report Card</h2>
            <p style={{ margin:'0 0 20px', fontSize:'13px', color:'#64748b' }}>{emailModal.first_name} {emailModal.last_name} · {emailModal.team}</p>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'8px' }}>Recipient Email</label>
              <input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="parent@email.com"
                style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.25)', color:'white', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'6px', padding:'10px 12px', marginBottom:'16px' }}>
              <p style={{ margin:0, fontSize:'12px', color:'#64748b', lineHeight:1.6 }}>
                This will open your email client with a pre-written message containing a link to the report card. The recipient can open the link and print/save as PDF.
              </p>
            </div>
            {emailResult && <p style={{ margin:'0 0 12px', fontSize:'13px', color:'#34d399' }}>{emailResult}</p>}
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => { setEmailModal(null); setEmailAddress(''); setEmailResult('') }} style={{ flex:1, padding:'10px', borderRadius:'6px', background:'transparent', border:'1px solid rgba(59,130,246,0.2)', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Cancel</button>
              <button onClick={handleEmailReport} disabled={!emailAddress || emailSending} style={{ flex:1, padding:'10px', borderRadius:'6px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'var(--font-display)', opacity: !emailAddress ? 0.5 : 1 }}>
                {emailSending ? 'Opening...' : '✉ Open Email Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, letterSpacing:'0.06em', color:'white' }}>PLAYER REPORT CARDS</h1>
        <p style={{ margin:'4px 0 0', color:'#475569', fontSize:'13px' }}>Generate and share individual performance reports for each player</p>
      </div>

      {/* Filters */}
      <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', padding:'16px', marginBottom:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'12px', alignItems:'end' }}>
          <div>
            <label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Filter by Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full">
              <option value="">All Teams</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Search Player</label>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
              style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} />
          </div>
          {filtered.length > 1 && (
            <button onClick={openAllTeamReports} style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', alignSelf:'flex-end' }}>
              🖨 Print All {filtered.length}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
        <span style={{ fontSize:'20px', flexShrink:0 }}>📋</span>
        <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.7 }}>
          <strong style={{ color:'#60a5fa' }}>Report Card includes:</strong> Current score · Personal best · Score history · Trend chart · vs team average · vs {'{AAA team}'} average · Team percentile ranking<br/>
          Click <strong style={{ color:'#60a5fa' }}>Print</strong> to open a print-ready PDF. Click <strong style={{ color:'#60a5fa' }}>Email</strong> to send a link to parents or coaches.
        </div>
      </div>

      {/* Athletes table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>Loading players...</div>
      ) : (
        <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(59,130,246,0.08)', background:'rgba(5,15,35,0.4)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ margin:0, fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' as const }}>{filtered.length} PLAYERS</p>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
              <thead>
                <tr>
                  {['Player','Team','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign: h === 'Actions' ? 'right' as const : 'left' as const, fontSize:'11px', fontWeight:600, color:'#334155', letterSpacing:'0.06em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(athlete => (
                  <tr key={athlete.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', flexShrink:0 }}>
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:500 }}>{athlete.last_name}, {athlete.first_name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#60a5fa', borderRadius:'3px', padding:'1px 6px', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:600 }}>{athlete.team}</span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}>
                        <button onClick={() => openReport(athlete.id)} disabled={generating === athlete.id}
                          style={{ padding:'5px 14px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white', opacity: generating === athlete.id ? 0.7 : 1 }}>
                          {generating === athlete.id ? '...' : '🖨 Print'}
                        </button>
                        <button onClick={() => { setEmailModal(athlete); setEmailAddress(''); setEmailResult('') }}
                          style={{ padding:'5px 14px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' }}>
                          ✉ Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign:'center', padding:'32px', color:'#475569', fontSize:'13px' }}>No players found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
