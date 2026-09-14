'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Athlete, TEAMS } from '@/types'
import { generateId } from '@/lib/uuid'

export const dynamic = 'force-dynamic'

const SEASONS = ['2025-2026', '2026-2027']
const PHASES = ['offseason', 'inseason']

type AthleteRow = Athlete & { season?: string; roster_phase?: string | null; active?: boolean }
type FormState = { first_name: string; last_name: string; team: string; season: string; roster_phase: string; active: boolean }

const inputStyle: React.CSSProperties = { width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', boxSizing:'border-box', outline:'none' }
const labelStyle: React.CSSProperties = { display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteRow[]>([])
  const [filter, setFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('2026-2027')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [exportingCSV, setExportingCSV] = useState(false)
  const [newAthlete, setNewAthlete] = useState<FormState>({ first_name:'', last_name:'', team:'', season:'2026-2027', roster_phase:'inseason', active:true })
  const [editAthlete, setEditAthlete] = useState<FormState>({ first_name:'', last_name:'', team:'', season:'2026-2027', roster_phase:'inseason', active:true })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/athletes?season=${encodeURIComponent(seasonFilter)}`)
    const data = await res.json()
    if (res.ok && Array.isArray(data)) setAthletes(data)
    else setError(data?.error || 'Could not load athletes.')
    setLoading(false)
  }

  useEffect(() => { load() }, [seasonFilter])

  const filtered = athletes.filter(a => {
    const nameMatch = !filter || `${a.first_name} ${a.last_name}`.toLowerCase().includes(filter.toLowerCase())
    const teamMatch = !teamFilter || a.team === teamFilter
    const phaseMatch = !phaseFilter || (a.roster_phase || '') === phaseFilter
    return nameMatch && teamMatch && phaseMatch
  }).sort((a,b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))

  const teamCounts = TEAMS.reduce((acc,t) => { acc[t] = athletes.filter(a => a.team === t).length; return acc }, {} as Record<string,number>)

  async function apiJson(url: string, init?: RequestInit) {
    const res = await fetch(url, init)
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Request failed.')
    return data
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      await apiJson('/api/athletes', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ id:generateId(), ...newAthlete })
      })
      setMessage(`${newAthlete.first_name} ${newAthlete.last_name} added to ${newAthlete.team} (${newAthlete.roster_phase}).`)
      setNewAthlete({ first_name:'', last_name:'', team:'', season:seasonFilter, roster_phase:'inseason', active:true })
      setAdding(false)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add athlete.') }
    finally { setSaving(false) }
  }

  function startEdit(a: AthleteRow) {
    setEditingId(a.id)
    setEditAthlete({ first_name:a.first_name, last_name:a.last_name, team:a.team, season:a.season || seasonFilter, roster_phase:a.roster_phase || 'inseason', active:a.active !== false })
    setError(''); setMessage('')
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true); setError(''); setMessage('')
    try {
      await apiJson('/api/athletes', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ id:editingId, ...editAthlete })
      })
      setMessage(`${editAthlete.first_name} ${editAthlete.last_name} updated.`)
      setEditingId(null)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update athlete.') }
    finally { setSaving(false) }
  }

  async function toggleActive(a: AthleteRow) {
    setError(''); setMessage('')
    try {
      await apiJson('/api/athletes', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ id:a.id, first_name:a.first_name, last_name:a.last_name, team:a.team, season:a.season || seasonFilter, roster_phase:a.roster_phase || 'inseason', active:a.active === false })
      })
      setMessage(`${a.first_name} ${a.last_name} ${a.active === false ? 'activated' : 'set inactive'}.`)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not change status.') }
  }

  async function deleteAthlete(a: AthleteRow) {
    if (!confirm(`Delete ${a.first_name} ${a.last_name} from ${a.team}? This only works when the athlete has no linked test or attendance records.`)) return
    setError(''); setMessage('')
    try {
      await apiJson(`/api/athletes?id=${encodeURIComponent(a.id)}`, { method:'DELETE' })
      setMessage(`${a.first_name} ${a.last_name} deleted.`)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete athlete.') }
  }

  async function handleExportCSV() {
    setExportingCSV(true)
    try {
      const entries = await fetch('/api/entries').then(r => r.json())
      const rows = [['First Name','Last Name','Team','Season','Roster Phase','Test','Score','Month','Year']]
      entries.forEach((e:any) => {
        const athlete = athletes.find(a => a.id === e.athlete_id)
        rows.push([athlete?.first_name || e.athlete_name.split(' ')[0], athlete?.last_name || e.athlete_name.split(' ').slice(1).join(' '), e.team, seasonFilter, athlete?.roster_phase || '', e.test_type, e.score, e.month, e.year])
      })
      const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type:'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = `kmha-athletes-${seasonFilter}-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url)
    } finally { setExportingCSV(false) }
  }

  function FormFields({ value, setValue }: { value:FormState; setValue:(v:FormState)=>void }) {
    return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'12px',marginBottom:'12px'}}>
      <div><label style={labelStyle}>First Name</label><input value={value.first_name} onChange={e=>setValue({...value,first_name:e.target.value})} required style={inputStyle}/></div>
      <div><label style={labelStyle}>Last Name</label><input value={value.last_name} onChange={e=>setValue({...value,last_name:e.target.value})} required style={inputStyle}/></div>
      <div><label style={labelStyle}>Season</label><select value={value.season} onChange={e=>setValue({...value,season:e.target.value})} style={inputStyle}>{SEASONS.map(s=><option key={s}>{s}</option>)}</select></div>
      <div><label style={labelStyle}>Team</label><select value={value.team} onChange={e=>setValue({...value,team:e.target.value})} required style={inputStyle}><option value="">Select team...</option>{TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
      <div><label style={labelStyle}>Roster Phase</label><select value={value.roster_phase} onChange={e=>setValue({...value,roster_phase:e.target.value})} style={inputStyle}>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
      <div><label style={labelStyle}>Status</label><select value={value.active ? 'active':'inactive'} onChange={e=>setValue({...value,active:e.target.value==='active'})} style={inputStyle}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    </div>
  }

  if (loading) return <div style={{padding:'48px',color:'#94a3b8'}}>Loading athletes…</div>

  return <div style={{paddingBottom:'48px'}}>
    <div style={{borderBottom:'1px solid rgba(59,130,246,0.1)',padding:'24px 0 20px',marginBottom:'24px',display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
      <div><h1 style={{margin:0,fontFamily:'var(--font-display)',fontSize:'36px',fontWeight:700,letterSpacing:'0.06em',color:'white'}}>ATHLETES</h1><p style={{margin:'4px 0 0',color:'#475569',fontSize:'13px'}}>{athletes.length} athlete records in {seasonFilter}</p></div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        <Link href="/roster-sync" style={{padding:'8px 16px',borderRadius:'6px',fontSize:'12px',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.35)',color:'#60a5fa',textDecoration:'none'}}>Roster Sync</Link>
        <button onClick={handleExportCSV} disabled={exportingCSV}>{exportingCSV?'Exporting…':'↓ Export CSV'}</button>
        <button onClick={()=>{setNewAthlete({first_name:'',last_name:'',team:teamFilter||'',season:seasonFilter,roster_phase:phaseFilter||'inseason',active:true});setAdding(true)}} style={{background:'#2563eb',color:'white',border:'none',borderRadius:'6px',padding:'8px 16px'}}>+ Add Athlete</button>
      </div>
    </div>

    {message && <div style={{marginBottom:'14px',padding:'10px 14px',border:'1px solid rgba(52,211,153,.3)',background:'rgba(52,211,153,.08)',color:'#34d399',borderRadius:'6px'}}>{message}</div>}
    {error && <div style={{marginBottom:'14px',padding:'10px 14px',border:'1px solid rgba(248,113,113,.3)',background:'rgba(248,113,113,.08)',color:'#f87171',borderRadius:'6px'}}>{error}</div>}

    {adding && <form onSubmit={handleAdd} style={{background:'rgba(10,20,40,.8)',border:'1px solid rgba(59,130,246,.3)',borderRadius:'10px',padding:'20px',marginBottom:'20px'}}>
      <h3 style={{margin:'0 0 16px',fontSize:'14px',color:'#60a5fa'}}>NEW ATHLETE</h3>
      <FormFields value={newAthlete} setValue={setNewAthlete}/>
      <div style={{display:'flex',gap:'8px'}}><button type="submit" disabled={saving}>{saving?'Saving…':'Save Athlete'}</button><button type="button" onClick={()=>setAdding(false)}>Cancel</button></div>
    </form>}

    <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
      <select value={seasonFilter} onChange={e=>{setSeasonFilter(e.target.value);setTeamFilter('')}} style={inputStyle}>{SEASONS.map(s=><option key={s}>{s}</option>)}</select>
      <input type="search" placeholder="Search athletes…" value={filter} onChange={e=>setFilter(e.target.value)} style={{...inputStyle,minWidth:'200px',width:'220px'}}/>
      <select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)} style={{...inputStyle,width:'180px'}}><option value="">All Teams</option>{TEAMS.map(t=><option key={t} value={t}>{t} ({teamCounts[t]||0})</option>)}</select>
      <select value={phaseFilter} onChange={e=>setPhaseFilter(e.target.value)} style={{...inputStyle,width:'160px'}}><option value="">All Phases</option><option value="offseason">offseason</option><option value="inseason">inseason</option><option value="legacy">legacy / unset</option></select>
      <span style={{color:'#475569',fontSize:'12px'}}>{filtered.length} shown</span>
    </div>

    <div style={{background:'rgba(10,20,40,.8)',border:'1px solid rgba(59,130,246,.12)',borderRadius:'10px',overflow:'hidden'}}><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr>{['Last Name','First Name','Season','Team','Phase','Status','Actions'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',color:'#475569',borderBottom:'1px solid rgba(59,130,246,.08)'}}>{h}</th>)}</tr></thead>
      <tbody>{filtered.map(a => editingId===a.id ? <tr key={a.id}><td colSpan={7} style={{padding:'14px'}}><div style={{background:'rgba(5,15,35,.75)',padding:'14px',borderRadius:'8px',border:'1px solid rgba(59,130,246,.25)'}}><FormFields value={editAthlete} setValue={setEditAthlete}/><div style={{display:'flex',gap:'8px'}}><button onClick={saveEdit} disabled={saving}>{saving?'Saving…':'Save Changes'}</button><button onClick={()=>setEditingId(null)}>Cancel</button></div></div></td></tr> : <tr key={a.id} style={{borderBottom:'1px solid rgba(59,130,246,.05)'}}>
        <td style={{padding:'10px 12px',color:'#e2e8f0'}}>{a.last_name}</td><td style={{padding:'10px 12px',color:'#94a3b8'}}>{a.first_name}</td><td style={{padding:'10px 12px',color:'#94a3b8'}}>{a.season||seasonFilter}</td><td style={{padding:'10px 12px',color:'#60a5fa'}}>{a.team}</td><td style={{padding:'10px 12px',color:a.roster_phase?'#cbd5e1':'#f59e0b'}}>{a.roster_phase||'UNSET'}</td><td style={{padding:'10px 12px',color:a.active===false?'#64748b':'#34d399'}}>{a.active===false?'Inactive':'Active'}</td>
        <td style={{padding:'10px 12px'}}><div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}><button onClick={()=>startEdit(a)}>Edit</button><button onClick={()=>toggleActive(a)}>{a.active===false?'Activate':'Deactivate'}</button><button onClick={()=>deleteAthlete(a)} style={{color:'#f87171'}}>Delete</button><a href={`/athlete?id=${a.id}`} style={{color:'#3b82f6',fontSize:'12px',textDecoration:'none'}}>Profile →</a></div></td>
      </tr>)}{filtered.length===0&&<tr><td colSpan={7} style={{padding:'32px',textAlign:'center',color:'#475569'}}>No athletes found.</td></tr>}</tbody>
    </table></div></div>
  </div>
}
