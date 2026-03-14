'use client'
import { useState, useEffect, useRef } from 'react'
import { Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS, ALL_MONTHS } from '@/types'
import { generateId } from '@/lib/uuid'
export const dynamic = 'force-dynamic'
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
export default function EntryPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()])
  const [scores, setScores] = useState<Record<string, Partial<Record<TestType, string>>>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving'|'saved'|''>>({}); 
  const timers = useRef<Record<string, any>>({})
  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/athletes?team=${selectedTeam}`).then(r => r.json()).then(data => { setAthletes(data); setScores({}) })
  }, [selectedTeam])
  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/entries?team=${selectedTeam}&year=${selectedYear}&month=${selectedMonth}`).then(r => r.json()).then((data: any[]) => {
      const s: Record<string, Partial<Record<TestType, string>>> = {}
      data.forEach(e => { if (!s[e.athlete_id]) s[e.athlete_id] = {}; s[e.athlete_id][e.test_type as TestType] = e.score.toString() })
      setScores(s)
    })
  }, [selectedTeam, selectedYear, selectedMonth])
  function setScore(athleteId: string, test: TestType, value: string, name: string, team: string) {
    setScores(prev => ({ ...prev, [athleteId]: { ...(prev[athleteId]||{}), [test]: value } }))
    const key = `${athleteId}-${test}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      if (!value || isNaN(parseFloat(value))) return
      setSaveStatus(p => ({...p, [key]: 'saving'}))
      await fetch('/api/entries', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify([{ id: generateId(), athlete_id: athleteId, athlete_name: name, team, score: parseFloat(value), month: selectedMonth, year: selectedYear, test_type: test }]) })
      setSaveStatus(p => ({...p, [key]: 'saved'}))
      setTimeout(() => setSaveStatus(p => ({...p, [key]: ''})), 2000)
    }, 800)
  }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold tracking-wide">DATA ENTRY</h1><p className="text-sm mt-0.5" style={{color:'#475569'}}>Scores auto-save as you type — existing data loads automatically</p></div>
      <div className="kmha-card p-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#64748b',fontFamily:'var(--font-display)'}}>Team</label><select value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)} className="kmha-select w-full"><option value="">Select team...</option>{TEAMS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#64748b',fontFamily:'var(--font-display)'}}>Month</label><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value as any)} className="kmha-select w-full">{ALL_MONTHS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div><label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#64748b',fontFamily:'var(--font-display)'}}>Year</label><select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))} className="kmha-select w-full">{YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
      </div></div>
      {selectedTeam && athletes.length > 0 && (
        <div className="kmha-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:'1px solid #1e3a5f'}}>
            <div><h2 className="font-display font-bold text-lg tracking-wide">{selectedTeam}</h2><p className="text-xs" style={{color:'#475569'}}>{selectedMonth} {selectedYear} — {athletes.length} athletes</p></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-xs" style={{color:'#34d399'}}>Auto-save on</span></div>
          </div>
          <div className="overflow-x-auto"><table className="w-full data-table"><thead><tr><th className="text-left">Athlete</th>{TEST_TYPES.map(test=><th key={test} className="text-center">{TEST_LABELS[test]}<span className="block font-normal" style={{textTransform:'none',letterSpacing:0,color:'#334155'}}>({TEST_UNITS[test]})</span></th>)}</tr></thead>
          <tbody>{[...athletes].sort((a,b)=>a.last_name.localeCompare(b.last_name)).map(athlete=>(
            <tr key={athlete.id}><td style={{color:'#e2e8f0',minWidth:'150px'}}><span className="font-medium">{athlete.last_name}</span><span style={{color:'#64748b'}}>, {athlete.first_name}</span></td>
            {TEST_TYPES.map(test=>{const key=`${athlete.id}-${test}`;const status=saveStatus[key];return(<td key={test} className="text-center" style={{padding:'6px 8px'}}><div style={{position:'relative',display:'inline-flex',alignItems:'center',gap:'4px'}}><input type="number" step="0.01" min="0" value={scores[athlete.id]?.[test]??''} onChange={e=>setScore(athlete.id,test,e.target.value,`${athlete.first_name} ${athlete.last_name}`,athlete.team)} className="kmha-input text-center" style={{width:'90px',padding:'4px 8px',borderColor:status==='saved'?'rgba(52,211,153,0.5)':undefined}} placeholder="—"/>{status==='saving'&&<span style={{color:'#64748b',fontSize:'10px'}}>…</span>}{status==='saved'&&<span style={{color:'#34d399',fontSize:'10px'}}>✓</span>}</div></td>)})}
            </tr>))}</tbody></table></div>
        </div>
      )}
      {selectedTeam && athletes.length===0 && <div className="kmha-card p-8 text-center"><p style={{color:'#475569'}}>No athletes for {selectedTeam}</p></div>}
      {!selectedTeam && <div className="kmha-card p-8 text-center"><p style={{color:'#475569'}}>Select a team to begin</p></div>}
    </div>
  )
}
