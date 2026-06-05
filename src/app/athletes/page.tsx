'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Athlete, TEAMS } from '@/types'
import { generateId } from '@/lib/uuid'

export const dynamic = 'force-dynamic'

const SEASONS = ['2025-2026', '2026-2027']

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filter, setFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('2026-2027')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newAthlete, setNewAthlete] = useState({ first_name: '', last_name: '', team: '', season: '2026-2027' })
  const [saving, setSaving] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/athletes?season=${seasonFilter}`)
    setAthletes(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [seasonFilter])

  const filtered = athletes.filter(a => {
    const nameMatch = !filter || `${a.first_name} ${a.last_name}`.toLowerCase().includes(filter.toLowerCase())
    const teamMatch = !teamFilter || a.team === teamFilter
    return nameMatch && teamMatch
  }).sort((a, b) => {
    const last = a.last_name.localeCompare(b.last_name)
    if (last !== 0) return last
    return a.first_name.localeCompare(b.first_name)
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newAthlete.first_name || !newAthlete.last_name || !newAthlete.team || !newAthlete.season) return
    setSaving(true)
    await fetch('/api/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: generateId(), ...newAthlete, active: true }),
    })
    setNewAthlete({ first_name: '', last_name: '', team: '', season: seasonFilter })
    setAdding(false)
    setSaving(false)
    load()
  }

  async function handleExportCSV() {
    setExportingCSV(true)
    const entries = await fetch('/api/entries').then(r => r.json())
    const rows = [['First Name','Last Name','Team','Season','Test','Score','Month','Year']]
    entries.forEach((e: any) => {
      const athlete = athletes.find(a => a.id === e.athlete_id)
      rows.push([
        athlete?.first_name || e.athlete_name.split(' ')[0],
        athlete?.last_name || e.athlete_name.split(' ').slice(1).join(' '),
        e.team,
        seasonFilter,
        e.test_type, e.score, e.month, e.year
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kmha-athletes-${seasonFilter}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportingCSV(false)
  }

  const teamCounts = TEAMS.reduce((acc, t) => { acc[t] = athletes.filter(a => a.team === t).length; return acc }, {} as Record<string, number>)

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:'48px' }}><div style={{ width:'24px', height:'24px', border:'2px solid #2563eb', borderTopColor:'transparent', borderRadius:'50%' }} /></div>

  return (
    <div style={{ paddingBottom:'48px' }}>
      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, letterSpacing:'0.06em', color:'white' }}>ATHLETES</h1>
          <p style={{ margin:'4px 0 0', color:'#475569', fontSize:'13px' }}>{athletes.length} athletes in {seasonFilter}</p>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <Link href="/roster-sync" style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)', color:'#60a5fa', textDecoration:'none' }}>Roster Sync</Link>
          <button onClick={handleExportCSV} disabled={exportingCSV} style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' }}>
            {exportingCSV ? 'Exporting...' : '↓ Export CSV'}
          </button>
          <button onClick={() => { setNewAthlete(p => ({ ...p, season: seasonFilter })); setAdding(true) }} style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white', boxShadow:'0 4px 12px rgba(37,99,235,0.25)' }}>
            + Add Athlete
          </button>
        </div>
      </div>

      {adding && (
        <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:'14px', fontWeight:600, color:'#60a5fa', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>New Athlete</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'12px', marginBottom:'12px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>First Name</label>
                <input value={newAthlete.first_name} onChange={e => setNewAthlete(p => ({...p, first_name: e.target.value}))} required placeholder="First name" style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', boxSizing:'border-box', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Last Name</label>
                <input value={newAthlete.last_name} onChange={e => setNewAthlete(p => ({...p, last_name: e.target.value}))} required placeholder="Last name" style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', boxSizing:'border-box', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Season</label>
                <select value={newAthlete.season} onChange={e => setNewAthlete(p => ({...p, season: e.target.value}))} required style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', appearance:'none', outline:'none' }}>
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Team</label>
                <select value={newAthlete.team} onChange={e => setNewAthlete(p => ({...p, team: e.target.value}))} required style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', appearance:'none', outline:'none' }}>
                  <option value="">Select team...</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button type="submit" disabled={saving} style={{ padding:'8px 20px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', border:'none', color:'white' }}>{saving ? 'Saving...' : 'Save Athlete'}</button>
              <button type="button" onClick={() => setAdding(false)} style={{ padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', cursor:'pointer', background:'transparent', border:'1px solid rgba(59,130,246,0.2)', color:'#64748b' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <select value={seasonFilter} onChange={e => { setSeasonFilter(e.target.value); setTeamFilter('') }} style={{ background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', appearance:'none', outline:'none' }}>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="search" placeholder="Search athletes..." value={filter} onChange={e => setFilter(e.target.value)} style={{ background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', outline:'none', minWidth:'200px' }} />
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', appearance:'none', outline:'none' }}>
          <option value="">All Teams</option>
          {TEAMS.map(t => <option key={t} value={t}>{t} ({teamCounts[t] || 0})</option>)}
        </select>
        <span style={{ color:'#475569', fontSize:'12px' }}>{filtered.length} athletes shown</span>
      </div>

      <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'10px', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Last Name','First Name','Season','Team','Status','Profile'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign: h === 'Profile' ? 'right' : 'left', fontSize:'11px', fontWeight:600, color:'#334155', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'var(--font-display)', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(athlete => (
                <tr key={athlete.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
                  <td style={{ padding:'10px 16px', color:'#e2e8f0', fontSize:'13px', fontWeight:500 }}>{athlete.last_name}</td>
                  <td style={{ padding:'10px 16px', color:'#94a3b8', fontSize:'13px' }}>{athlete.first_name}</td>
                  <td style={{ padding:'10px 16px', color:'#94a3b8', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600 }}>{(athlete as any).season || seasonFilter}</td>
                  <td style={{ padding:'10px 16px' }}><span style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#60a5fa', borderRadius:'3px', padding:'1px 6px', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:600 }}>{athlete.team}</span></td>
                  <td style={{ padding:'10px 16px' }}><span style={{ background:(athlete as any).active === false ? 'rgba(100,116,139,0.12)' : 'rgba(52,211,153,0.08)', border:(athlete as any).active === false ? '1px solid rgba(100,116,139,0.25)' : '1px solid rgba(52,211,153,0.22)', color:(athlete as any).active === false ? '#64748b' : '#34d399', borderRadius:'3px', padding:'1px 6px', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:600 }}>{(athlete as any).active === false ? 'Inactive Historical' : 'Active'}</span></td>
                  <td style={{ padding:'10px 16px', textAlign:'right' }}>
                    <a href={`/athlete?id=${athlete.id}`} style={{ color:'#3b82f6', fontSize:'12px', textDecoration:'none', fontFamily:'var(--font-display)', fontWeight:600 }}>View Profile →</a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:'32px', color:'#334155', fontSize:'13px' }}>No athletes found for {seasonFilter}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
