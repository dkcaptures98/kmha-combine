'use client'

import { useEffect, useMemo, useState } from 'react'

const TEAMS = ['U10AA','U10AAA','U11AA','U11AAA','U12AA','U12AAA','U13AA','U13AAA','U13AALR','U14AA','U14AAA','U15AA','U15AAA','U15AALR','U15ALR','U16AA','U16AAA','U18AA','U18AAA','U18ALR']

type Row = {
  id: string
  savedAt: string
  deviceLabel: string
  athlete: string
  team: string
  season: string
  phase: string
  sprint: string
  height_ft: string
  height_in: string
  wingspan_ft: string
  wingspan_in: string
  vertical: string
  broad_jump_ft: string
  broad_jump_in: string
  chinup_hold: string
  chinups: string
  bike_time: string
  bike_watts: string
  notes: string
}

const EMPTY: Omit<Row,'id'|'savedAt'> = {
  deviceLabel:'', athlete:'', team:'', season:'2026-2027', phase:'inseason', sprint:'', height_ft:'', height_in:'', wingspan_ft:'', wingspan_in:'', vertical:'', broad_jump_ft:'', broad_jump_in:'', chinup_hold:'', chinups:'', bike_time:'', bike_watts:'', notes:''
}

const KEY='kmha-emergency-combine-v1'
const DEVICE_KEY='kmha-emergency-device-label'

function csvEscape(v:string){ return `"${String(v??'').replace(/"/g,'""')}"` }

export default function EmergencyCombinePage(){
  const [form,setForm]=useState(EMPTY)
  const [rows,setRows]=useState<Row[]>([])
  const [message,setMessage]=useState('')

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'[]')
      if(Array.isArray(saved)) setRows(saved)
      const device=localStorage.getItem(DEVICE_KEY)||''
      setForm(f=>({...f,deviceLabel:device}))
    }catch{}
  },[])

  function persist(next:Row[]){ setRows(next); localStorage.setItem(KEY,JSON.stringify(next)) }
  function set<K extends keyof typeof EMPTY>(key:K,value:(typeof EMPTY)[K]){ setForm(f=>({...f,[key]:value})) }
  function save(){
    if(!form.athlete.trim()||!form.team){ setMessage('Athlete name and team are required.'); return }
    const row:Row={...form,id:crypto.randomUUID(),savedAt:new Date().toISOString()}
    const next=[row,...rows]
    persist(next)
    if(form.deviceLabel) localStorage.setItem(DEVICE_KEY,form.deviceLabel)
    setForm(f=>({...EMPTY,deviceLabel:f.deviceLabel,team:f.team,season:f.season,phase:f.phase}))
    setMessage('SAVED ON THIS DEVICE ✓')
  }
  function downloadCsv(){
    if(!rows.length){ setMessage('Nothing saved yet.'); return }
    const headers=['saved_at','device','athlete','team','season','phase','sprint_10m','height_ft','height_in','wingspan_ft','wingspan_in','vertical_cm','broad_jump_ft','broad_jump_in','chinup_hold_sec','chinups','bike_0_5km_time','bike_avg_watts','notes']
    const body=rows.map(r=>[r.savedAt,r.deviceLabel,r.athlete,r.team,r.season,r.phase,r.sprint,r.height_ft,r.height_in,r.wingspan_ft,r.wingspan_in,r.vertical,r.broad_jump_ft,r.broad_jump_in,r.chinup_hold,r.chinups,r.bike_time,r.bike_watts,r.notes].map(csvEscape).join(','))
    const blob=new Blob([[headers.join(','),...body].join('\n')],{type:'text/csv'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`KMHA-emergency-combine-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  function clearAll(){ if(confirm('Delete ALL emergency entries saved on THIS device?')) persist([]) }
  const savedCount=useMemo(()=>rows.length,[rows])
  const input={width:'100%',background:'#071326',border:'1px solid #284568',color:'white',borderRadius:7,padding:'10px',fontSize:14} as const
  const label={display:'block',fontSize:11,color:'#93a4ba',marginBottom:5,fontWeight:700,letterSpacing:'.04em'} as const

  return <main style={{minHeight:'100vh',background:'#020b18',color:'white',fontFamily:'Arial, sans-serif',padding:18}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{border:'2px solid #f59e0b',background:'#3a2505',borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:18}}>EMERGENCY OFFLINE COMBINE ENTRY</div>
        <div style={{fontSize:13,color:'#fcd34d',marginTop:4}}>Does NOT use Supabase. Every save stays on this device. Export CSV before leaving this device.</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
        <div><h1 style={{margin:0,fontSize:30}}>KMHA Annual Combine</h1><div style={{color:'#94a3b8',fontSize:13}}>Saved on this device: <b style={{color:'white'}}>{savedCount}</b></div></div>
        <div style={{display:'flex',gap:8}}><button onClick={downloadCsv} style={{background:'#16a34a',color:'white',border:0,borderRadius:8,padding:'11px 16px',fontWeight:800,cursor:'pointer'}}>EXPORT CSV</button><button onClick={clearAll} style={{background:'#3f1720',color:'#fca5a5',border:'1px solid #7f1d1d',borderRadius:8,padding:'11px 12px',fontWeight:800,cursor:'pointer'}}>CLEAR</button></div>
      </div>
      <section style={{background:'#091427',border:'1px solid #1e3552',borderRadius:12,padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <div><label style={label}>DEVICE / COACH NAME</label><input style={input} value={form.deviceLabel} onChange={e=>set('deviceLabel',e.target.value)} placeholder="e.g. Daniel iPad" /></div>
          <div><label style={label}>ATHLETE NAME *</label><input autoFocus style={input} value={form.athlete} onChange={e=>set('athlete',e.target.value)} placeholder="First Last" /></div>
          <div><label style={label}>TEAM *</label><select style={input} value={form.team} onChange={e=>set('team',e.target.value)}><option value="">Select team</option>{TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={label}>SEASON</label><select style={input} value={form.season} onChange={e=>set('season',e.target.value)}><option>2026-2027</option><option>2027-2028</option></select></div>
          <div><label style={label}>PHASE</label><select style={input} value={form.phase} onChange={e=>set('phase',e.target.value)}><option value="inseason">IN-SEASON</option><option value="offseason">OFF-SEASON</option></select></div>
        </div>
        <hr style={{border:0,borderTop:'1px solid #1e3552',margin:'18px 0'}} />
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:12}}>
          {[['sprint','10m Sprint (s)'],['height_ft','Height ft'],['height_in','Height in'],['wingspan_ft','Wingspan ft'],['wingspan_in','Wingspan in'],['vertical','Vertical (cm)'],['broad_jump_ft','Broad ft'],['broad_jump_in','Broad in'],['chinup_hold','Chin Hold (s)'],['chinups','Chin-Ups'],['bike_time','0.5km Bike Time'],['bike_watts','Bike Avg Watts']].map(([k,l])=><div key={k}><label style={label}>{l}</label><input style={input} value={(form as any)[k]} onChange={e=>set(k as keyof typeof EMPTY,e.target.value as any)} /></div>)}
        </div>
        <div style={{marginTop:12}}><label style={label}>NOTES</label><input style={input} value={form.notes} onChange={e=>set('notes',e.target.value)} /></div>
        <button onClick={save} style={{width:'100%',marginTop:16,background:'#2563eb',color:'white',border:0,borderRadius:9,padding:'15px',fontWeight:900,fontSize:17,cursor:'pointer'}}>SAVE ATHLETE LOCALLY</button>
        {message&&<div style={{marginTop:10,textAlign:'center',fontWeight:800,color:message.includes('✓')?'#4ade80':'#fca5a5'}}>{message}</div>}
      </section>
      {rows.length>0&&<section style={{marginTop:16,background:'#091427',border:'1px solid #1e3552',borderRadius:12,overflow:'hidden'}}><div style={{padding:12,fontWeight:800}}>RECENT LOCAL SAVES</div><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr>{['Time','Athlete','Team','Sprint','Vertical','Broad','Chin-Ups','Bike'].map(h=><th key={h} style={{textAlign:'left',padding:9,borderTop:'1px solid #1e3552',borderBottom:'1px solid #1e3552',color:'#94a3b8'}}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,50).map(r=><tr key={r.id}><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{new Date(r.savedAt).toLocaleTimeString()}</td><td style={{padding:9,borderBottom:'1px solid #13263d',fontWeight:700}}>{r.athlete}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{r.team}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{r.sprint||'—'}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{r.vertical||'—'}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{[r.broad_jump_ft,r.broad_jump_in].filter(Boolean).join("' ")||'—'}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{r.chinups||r.chinup_hold||'—'}</td><td style={{padding:9,borderBottom:'1px solid #13263d'}}>{r.bike_time||'—'}</td></tr>)}</tbody></table></div></section>}
    </div>
  </main>
}
