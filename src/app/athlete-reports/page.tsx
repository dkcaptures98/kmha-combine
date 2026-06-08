'use client'

import JSZip from 'jszip'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useState, useEffect } from 'react'
import { Athlete, TEAMS } from '@/types'

export const dynamic = 'force-dynamic'

const ANNUAL_SEASONS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029']
const ROSTER_PHASES = ['offseason', 'inseason']
const REGULAR_SEASONS = [
  'All Regular Testing',
  '2024-2025 In-Season',
  '2025 Off-Season',
  '2025-2026 In-Season',
  '2026 Off-Season',
  '2026-2027 In-Season',
  '2027 Off-Season',
  '2027-2028 In-Season',
  '2028 Off-Season',
  '2028-2029 In-Season',
]

type CombineResult = { athlete_id?: string; athlete_name?: string; team?: string; season?: string; roster_phase?: string }

function safeFileName(value: string) { return value.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, ' ').trim() }
async function renderReportToPdfBlob(url: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'; iframe.style.left = '-10000px'; iframe.style.top = '0'; iframe.style.width = '920px'; iframe.style.height = '1400px'; iframe.src = url
  document.body.appendChild(iframe)
  await new Promise<void>((resolve, reject) => { iframe.onload = () => resolve(); iframe.onerror = () => reject(new Error('Could not load report card.')) })
  await new Promise(resolve => setTimeout(resolve, 700))
  const target = iframe.contentDocument?.querySelector('.report-wrapper') as HTMLElement | null
  if (!target) { document.body.removeChild(iframe); throw new Error('Could not find report card content.') }
  const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight(); const margin = 8; const usableWidth = pageWidth - margin * 2; const imgHeight = (canvas.height * usableWidth) / canvas.width
  let heightLeft = imgHeight; let position = margin
  pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight); heightLeft -= pageHeight - margin * 2
  while (heightLeft > 0) { pdf.addPage(); position = heightLeft - imgHeight + margin; pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight); heightLeft -= pageHeight - margin * 2 }
  document.body.removeChild(iframe)
  return pdf.output('blob')
}
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }

export default function PlayerReportCardsPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [combineResults, setCombineResults] = useState<CombineResult[]>([])
  const [loading, setLoading] = useState(true)
  const [exportingZip, setExportingZip] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<Athlete | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState('')
  const [reportMode, setReportMode] = useState<'regular' | 'annual'>('regular')
  const [regularSeason, setRegularSeason] = useState('All Regular Testing')
  const [annualSeason, setAnnualSeason] = useState('2026-2027')
  const [annualPhase, setAnnualPhase] = useState('offseason')

  useEffect(() => {
    Promise.all([fetch('/api/athletes').then(r => r.json()), fetch('/api/combine').then(r => r.json()).catch(() => [])])
      .then(([athleteData, combineData]) => { setAthletes(Array.isArray(athleteData) ? athleteData : []); setCombineResults(Array.isArray(combineData) ? combineData : []); setLoading(false) })
  }, [])

  function regularSeasonQuery() { return regularSeason === 'All Regular Testing' ? '' : `&season_filter=${encodeURIComponent(regularSeason)}` }
  function reportUrlFor(athleteId: string) { return reportMode === 'annual' ? `/athlete-annual-report?id=${athleteId}&season=${annualSeason}&roster_phase=${annualPhase}` : `/athlete-report?id=${athleteId}${regularSeasonQuery()}` }
  function reportLabel() { return reportMode === 'annual' ? 'Annual Combine Report Card' : 'Regular Report Card' }
  function openReport(athleteId: string) { setGenerating(athleteId); window.open(reportUrlFor(athleteId), '_blank'); setTimeout(() => setGenerating(null), 1000) }
  function openAllTeamReports() { filtered.forEach((athlete, i) => { setTimeout(() => window.open(reportUrlFor(athlete.id), '_blank'), i * 400) }) }

  async function handleEmailReport() {
    if (!emailModal || !emailAddress) return
    setEmailSending(true); setEmailResult('')
    const reportUrl = `${window.location.origin}${reportUrlFor(emailModal.id)}`
    const subject = encodeURIComponent(`KMHA ${reportLabel()} — ${emailModal.first_name} ${emailModal.last_name}`)
    const body = encodeURIComponent(`Hi,\n\nPlease find the KMHA ${reportLabel()} for ${emailModal.first_name} ${emailModal.last_name} (${emailModal.team}) at the link below:\n\n${reportUrl}\n\nTo save as PDF: open the link, then press Cmd+P (Mac) or Ctrl+P (Windows) and choose "Save as PDF".\n\nKitchener Minor Hockey Association\nCombine Performance Tracker`)
    window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`)
    setEmailResult(`✓ Email draft opened for ${emailAddress}`); setEmailSending(false)
  }

  const annualAthleteIds = new Set(combineResults.filter(r => r.season === annualSeason && (!annualPhase || !r.roster_phase || r.roster_phase === annualPhase)).map(r => r.athlete_id).filter(Boolean) as string[])
  const filtered = athletes.filter(a => {
    const matchMode = reportMode === 'regular' || annualAthleteIds.has(a.id)
    const matchTeam = !selectedTeam || a.team === selectedTeam
    const matchSearch = !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase())
    return matchMode && matchTeam && matchSearch
  }).sort((a, b) => a.last_name.localeCompare(b.last_name))

  async function downloadReportZip(scope: 'team' | 'all') {
    const selectedTeamForZip = selectedTeam; const zip = new JSZip(); setExportingZip(true)
    try {
      const athletesToExport = filtered.filter(athlete => scope === 'team' ? athlete.team === selectedTeamForZip : true)
      if (scope === 'team' && !selectedTeamForZip) { alert('Select a team first.'); return }
      if (!athletesToExport.length) { alert('No athletes found for this export.'); return }
      for (const athlete of athletesToExport) { const teamName = safeFileName(athlete.team || 'Unknown Team'); const folder = zip.folder(teamName); const athleteName = safeFileName(`${athlete.first_name} ${athlete.last_name}`); const reportUrl = `${window.location.origin}${reportUrlFor(athlete.id)}`; const pdfBlob = await renderReportToPdfBlob(reportUrl); folder?.file(`${athleteName} - ${teamName} ${reportLabel()}.pdf`, pdfBlob) }
      const seasonPart = reportMode === 'annual' ? `${annualSeason}-${annualPhase}` : safeFileName(regularSeason)
      const zipBlob = await zip.generateAsync({ type: 'blob' }); const filename = scope === 'team' ? `${safeFileName(selectedTeamForZip)}-${reportMode}-${seasonPart}-report-cards.zip` : `KMHA-all-${reportMode}-${seasonPart}-report-cards.zip`; downloadBlob(zipBlob, filename)
    } catch (err) { alert(err instanceof Error ? err.message : 'Could not generate report ZIP.') } finally { setExportingZip(false) }
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      {emailModal && <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}><div style={{ background:'#0a1428', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'12px', padding:'28px', maxWidth:'420px', width:'100%' }}><h2 style={{ margin:'0 0 4px', fontSize:'18px', fontWeight:700, color:'white', fontFamily:'var(--font-display)' }}>Email {reportLabel()}</h2><p style={{ margin:'0 0 20px', fontSize:'13px', color:'#64748b' }}>{emailModal.first_name} {emailModal.last_name} · {emailModal.team}</p><div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'8px' }}>Recipient Email</label><input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="parent@email.com" style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.25)', color:'white', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} /></div>{emailResult && <p style={{ margin:'0 0 12px', fontSize:'13px', color:'#34d399' }}>{emailResult}</p>}<div style={{ display:'flex', gap:'8px' }}><button onClick={() => { setEmailModal(null); setEmailAddress(''); setEmailResult('') }} style={{ flex:1, padding:'10px', borderRadius:'6px', background:'transparent', border:'1px solid rgba(59,130,246,0.2)', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Cancel</button><button onClick={handleEmailReport} disabled={!emailAddress || emailSending} style={{ flex:1, padding:'10px', borderRadius:'6px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'var(--font-display)', opacity: !emailAddress ? 0.5 : 1 }}>{emailSending ? 'Opening...' : '✉ Open Email Draft'}</button></div></div></div>}
      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px' }}><h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, letterSpacing:'0.06em', color:'white' }}>PLAYER REPORT CARDS</h1><p style={{ margin:'4px 0 0', color:'#475569', fontSize:'13px' }}>Generate and share individual performance reports for each player</p></div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}><button onClick={() => setReportMode('regular')} style={{ padding:'9px 18px', borderRadius:'8px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:700, cursor:'pointer', background: reportMode === 'regular' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border:`1px solid ${reportMode === 'regular' ? '#2563eb' : 'rgba(59,130,246,0.2)'}`, color: reportMode === 'regular' ? 'white' : '#60a5fa' }}>Regular Report Cards</button><button onClick={() => setReportMode('annual')} style={{ padding:'9px 18px', borderRadius:'8px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:700, cursor:'pointer', background: reportMode === 'annual' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border:`1px solid ${reportMode === 'annual' ? '#2563eb' : 'rgba(59,130,246,0.2)'}`, color: reportMode === 'annual' ? 'white' : '#60a5fa' }}>Annual Combine Report Cards</button></div>
      <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', padding:'16px', marginBottom:'20px' }}><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'12px', alignItems:'end' }}><div><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Filter by Team</label><select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="kmha-select w-full"><option value="">All Teams</option>{TEAMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>{reportMode === 'regular' && <div><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Regular Testing Season</label><select value={regularSeason} onChange={e => setRegularSeason(e.target.value)} className="kmha-select w-full">{REGULAR_SEASONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}{reportMode === 'annual' && <><div><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Annual Combine Season</label><select value={annualSeason} onChange={e => setAnnualSeason(e.target.value)} className="kmha-select w-full">{ANNUAL_SEASONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Roster Phase</label><select value={annualPhase} onChange={e => setAnnualPhase(e.target.value)} className="kmha-select w-full">{ROSTER_PHASES.map(p => <option key={p} value={p}>{p}</option>)}</select></div></>}<div><label style={{ display:'block', fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:'6px' }}>Search Player</label><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} /></div>{filtered.length > 1 && <button onClick={openAllTeamReports} style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', alignSelf:'flex-end' }}>🖨 Print All {filtered.length}</button>}</div></div>
      <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', display:'flex', gap:'12px', alignItems:'flex-start' }}><span style={{ fontSize:'20px', flexShrink:0 }}>📋</span><div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.7 }}><strong style={{ color:'#60a5fa' }}>{reportLabel()} includes:</strong> {reportMode === 'annual' ? `Annual combine results for ${annualSeason} · ${annualPhase}. Only athletes with combine data for this selection are shown.` : `Regular testing report cards${regularSeason === 'All Regular Testing' ? ' using all available testing history.' : ` filtered to ${regularSeason}.`}`}<br/>Click <strong style={{ color:'#60a5fa' }}>Print</strong> to open a print-ready PDF. Click <strong style={{ color:'#60a5fa' }}>Email</strong> to send a link.</div></div>
      {loading ? <div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>Loading players...</div> : <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'10px', overflow:'hidden' }}><div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(59,130,246,0.08)', background:'rgba(5,15,35,0.4)', display:'flex', justifyContent:'space-between', alignItems:'center' }}><p style={{ margin:0, fontSize:'11px', color:'#475569', fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' as const }}>{filtered.length} PLAYERS · {reportMode === 'annual' ? `${annualSeason} ${annualPhase} ANNUAL COMBINE` : regularSeason.toUpperCase()}</p></div><div style={{ overflowX:'auto' }}><table style={{ width:'100%', borderCollapse:'collapse' as const }}><thead><tr>{['Player','Team','Actions'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign: h === 'Actions' ? 'right' as const : 'left' as const, fontSize:'11px', fontWeight:600, color:'#334155', letterSpacing:'0.06em', textTransform:'uppercase' as const, fontFamily:'var(--font-display)', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>{h}</th>)}</tr></thead><tbody>{filtered.map(athlete => <tr key={athlete.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)' }}><td style={{ padding:'10px 16px' }}><div style={{ display:'flex', alignItems:'center', gap:'10px' }}><div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', flexShrink:0 }}>{athlete.first_name[0]}{athlete.last_name[0]}</div><span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:500 }}>{athlete.last_name}, {athlete.first_name}</span></div></td><td style={{ padding:'10px 16px' }}><span style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#60a5fa', borderRadius:'3px', padding:'1px 6px', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:600 }}>{athlete.team}</span></td><td style={{ padding:'10px 16px' }}><div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}><button onClick={() => openReport(athlete.id)} disabled={generating === athlete.id} style={{ padding:'5px 14px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white', opacity: generating === athlete.id ? 0.7 : 1 }}>{generating === athlete.id ? '...' : '🖨 Print'}</button><button onClick={() => { setEmailModal(athlete); setEmailAddress(''); setEmailResult('') }} style={{ padding:'5px 14px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' }}>✉ Email</button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={3} style={{ textAlign:'center', padding:'32px', color:'#475569', fontSize:'13px' }}>No players found for this selection</td></tr>}</tbody></table></div></div>}
    </div>
  )
}
