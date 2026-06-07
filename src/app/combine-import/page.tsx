'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SEASONS = ['2025-2026', '2026-2027']
const PHASES = ['offseason', 'inseason']

type ImportResult = {
  dryRun: boolean
  season: string
  roster_phase: string
  teamsDetected?: string[]
  rowsWithNames?: number
  rowsWithResults?: number
  matched?: number
  missing?: number
  readyToImport?: number
  imported?: number
  skippedMissing?: number
  missingExamples?: any[]
  teamCounts?: Record<string, number>
}

export default function CombineImportPage() {
  const [season, setSeason] = useState('2026-2027')
  const [phase, setPhase] = useState('offseason')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file?: File) {
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setCsvText(text)
    setResult(null)
    setError('')
  }

  async function runImport(dryRun: boolean) {
    if (!csvText.trim()) {
      setError('Upload a combine CSV first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/import-combine-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, season, roster_phase: phase, dryRun }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Combine import failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Combine import failed')
    } finally {
      setLoading(false)
    }
  }

  const canConfirm = result?.dryRun === true && !loading

  return (
    <div style={{ paddingBottom:'48px' }}>
      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px' }}>
        <Link href="/dashboard" style={{ display:'inline-block', marginBottom:'12px', color:'#60a5fa', fontSize:'13px', textDecoration:'none' }}>← Back to Dashboard</Link>
        <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, letterSpacing:'0.06em', color:'white' }}>COMBINE IMPORT</h1>
        <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:'13px' }}>Upload one off-season combine CSV sheet at a time. Missing test cells are okay.</p>
      </div>

      <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', padding:'20px', marginBottom:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px', marginBottom:'16px' }}>
          <div><label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Season</label><select value={season} onChange={e=>{setSeason(e.target.value); setResult(null)}} className="kmha-select w-full">{SEASONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Roster Phase</label><select value={phase} onChange={e=>{setPhase(e.target.value); setResult(null)}} className="kmha-select w-full">{PHASES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
        </div>

        <div onClick={() => fileRef.current?.click()} style={{ border:'2px dashed rgba(59,130,246,0.2)', borderRadius:'8px', padding:'30px', textAlign:'center', cursor:'pointer', marginBottom:'14px' }}>
          <p style={{ margin:'0 0 8px', fontSize:'32px' }}>📊</p>
          <p style={{ margin:'0 0 4px', fontSize:'14px', color:'#94a3b8' }}>Click to upload combine CSV</p>
          <p style={{ margin:0, fontSize:'12px', color:'#334155' }}>Export one Excel sheet as CSV, then upload here</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e => handleFile(e.target.files?.[0])} style={{ display:'none' }} />
        </div>
        {fileName && <p style={{ margin:'0 0 12px', color:'#60a5fa', fontSize:'12px' }}>{fileName}</p>}

        <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setResult(null); setError('') }} placeholder="Or paste CSV content here..." rows={6} style={{ width:'100%', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(59,130,246,0.2)', color:'white', borderRadius:'6px', padding:'10px 12px', fontSize:'12px', fontFamily:'monospace', resize:'vertical', outline:'none', boxSizing:'border-box' }} />

        {error && <div style={{ marginTop:'12px', padding:'10px 14px', borderRadius:'6px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', fontSize:'13px' }}>{error}</div>}

        <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
          <button onClick={() => runImport(true)} disabled={!csvText || loading} style={{ flex:1, padding:'11px', borderRadius:'8px', fontSize:'13px', fontFamily:'var(--font-display)', fontWeight:700, cursor:!csvText||loading?'not-allowed':'pointer', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)', color:'#60a5fa', opacity:!csvText||loading?0.5:1 }}>{loading ? 'Working...' : 'Preview Import'}</button>
          <button onClick={() => runImport(false)} disabled={!canConfirm} style={{ flex:1, padding:'11px', borderRadius:'8px', fontSize:'13px', fontFamily:'var(--font-display)', fontWeight:700, cursor:canConfirm?'pointer':'not-allowed', background:canConfirm?'linear-gradient(135deg,#1d4ed8,#2563eb)':'rgba(30,41,59,0.4)', border:'none', color:canConfirm?'white':'#475569' }}>Confirm Import</button>
        </div>
      </div>

      {result && (
        <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(59,130,246,0.1)' }}><h2 style={{ margin:0, color:'white', fontSize:'18px', fontFamily:'var(--font-display)' }}>{result.dryRun ? 'Preview Result' : 'Import Complete'} · {result.season} · {result.roster_phase}</h2></div>
          <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px' }}>
            {[
              ['Teams Detected', result.teamsDetected?.join(', ') || '-'],
              ['Rows With Names', result.rowsWithNames ?? 0],
              ['Rows With Results', result.rowsWithResults ?? 0],
              ['Matched', result.matched ?? result.imported ?? 0],
              ['Missing', result.missing ?? result.skippedMissing ?? 0],
              ['Ready', result.readyToImport ?? result.imported ?? 0],
            ].map(([label, value]) => <div key={String(label)} style={{ background:'rgba(5,15,35,0.7)', border:'1px solid rgba(59,130,246,0.1)', borderRadius:'8px', padding:'12px' }}><p style={{ margin:'0 0 6px', color:'#475569', fontSize:'10px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</p><p style={{ margin:0, color:'#e2e8f0', fontSize:'18px', fontWeight:700, fontFamily:'var(--font-display)' }}>{String(value)}</p></div>)}
          </div>
          {result.teamCounts && <div style={{ padding:'0 16px 16px' }}><h3 style={{ color:'#60a5fa', fontSize:'13px', fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>Imported Team Counts</h3><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'8px' }}>{Object.entries(result.teamCounts).sort(([a],[b])=>a.localeCompare(b)).map(([team,count])=><div key={team} style={{ display:'flex', justifyContent:'space-between', background:'rgba(5,15,35,0.55)', border:'1px solid rgba(59,130,246,0.08)', borderRadius:'6px', padding:'8px 10px', color:'#94a3b8', fontSize:'12px' }}><span>{team}</span><strong style={{ color:'#e2e8f0' }}>{count}</strong></div>)}</div></div>}
          {result.missingExamples && result.missingExamples.length > 0 && <div style={{ padding:'0 16px 16px' }}><h3 style={{ color:'#f87171', fontSize:'13px', fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>Missing Athlete Examples</h3>{result.missingExamples.slice(0,10).map((m:any,i:number)=><p key={i} style={{ margin:'2px 0', color:'#94a3b8', fontSize:'12px', fontFamily:'monospace' }}>{m.team} · {m.first_name} {m.last_name}</p>)}</div>}
        </div>
      )}
    </div>
  )
}
