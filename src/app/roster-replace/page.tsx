'use client'
import { useState } from 'react'

export const dynamic = 'force-dynamic'

const SEASONS = ['2025-2026', '2026-2027']

type PreviewResult = {
  dryRun: boolean
  season: string
  masterRows: number
  duplicatesRemoved: number
  existingSeasonRows: number
  upserts: number
  safeToDeactivate?: number
  deactivated?: number
  protectedNotInMaster: number
  teamCounts: Record<string, number>
  duplicateExamples?: any[]
  protectedExamples?: any[]
  error?: string
}

export default function RosterReplacePage() {
  const [season, setSeason] = useState('2025-2026')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [error, setError] = useState('')

  async function handleFile(file?: File) {
    if (!file) return
    setFileName(file.name)
    setCsvText(await file.text())
    setResult(null)
    setError('')
  }

  async function runReplace(dryRun: boolean) {
    if (!csvText.trim()) {
      setError('Upload a CSV first.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/roster-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season, csvText, dryRun }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Roster replace failed.')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Roster replace failed.')
    } finally {
      setLoading(false)
    }
  }

  const canConfirm = result?.dryRun === true && !loading && !error

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700, letterSpacing:'0.06em', color:'white' }}>ROSTER REPLACE</h1>
        <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:'13px' }}>Replace one season roster from a master CSV. Score tables are protected.</p>
      </div>

      <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
        <p style={{ margin:0, color:'#f87171', fontSize:'13px', fontWeight:600 }}>Use Preview first. Confirm only after the counts look correct.</p>
      </div>

      <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', padding:'18px', marginBottom:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'14px', marginBottom:'16px' }}>
          <div>
            <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Season to Replace</label>
            <select value={season} onChange={e => { setSeason(e.target.value); setResult(null) }} className="kmha-select w-full">
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'11px', color:'#64748b', marginBottom:'6px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Master CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={e => handleFile(e.target.files?.[0])} style={{ width:'100%', color:'#94a3b8', fontSize:'13px' }} />
            {fileName && <p style={{ margin:'6px 0 0', color:'#60a5fa', fontSize:'12px' }}>{fileName}</p>}
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <button onClick={() => runReplace(true)} disabled={loading || !csvText} style={{ padding:'9px 18px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:700, cursor: loading || !csvText ? 'not-allowed' : 'pointer', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)', color:'#60a5fa' }}>{loading ? 'Working...' : 'Preview / Dry Run'}</button>
          <button onClick={() => runReplace(false)} disabled={!canConfirm} style={{ padding:'9px 18px', borderRadius:'6px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:700, cursor: canConfirm ? 'pointer' : 'not-allowed', background: canConfirm ? 'rgba(239,68,68,0.12)' : 'rgba(30,41,59,0.4)', border: canConfirm ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(51,65,85,0.4)', color: canConfirm ? '#f87171' : '#475569' }}>Confirm Replace This Season</button>
        </div>
      </div>

      {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px', color:'#f87171', fontSize:'13px' }}>{error}</div>}

      {result && (
        <div style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
            <h2 style={{ margin:0, color:'white', fontSize:'18px', fontFamily:'var(--font-display)' }}>{result.dryRun ? 'Preview Result' : 'Replacement Complete'} · {result.season}</h2>
          </div>
          <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'12px' }}>
            {[
              ['Master Rows', result.masterRows],
              ['Duplicates Removed', result.duplicatesRemoved],
              ['Existing Season Rows', result.existingSeasonRows],
              ['Rows Upserted', result.upserts],
              ['Safe To Deactivate', result.safeToDeactivate ?? result.deactivated ?? 0],
              ['Protected Not In Master', result.protectedNotInMaster],
            ].map(([label, value]) => (
              <div key={label} style={{ background:'rgba(5,15,35,0.7)', border:'1px solid rgba(59,130,246,0.1)', borderRadius:'8px', padding:'12px' }}>
                <p style={{ margin:'0 0 6px', color:'#475569', fontSize:'10px', fontFamily:'var(--font-display)', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</p>
                <p style={{ margin:0, color:'#e2e8f0', fontSize:'22px', fontWeight:700, fontFamily:'var(--font-display)' }}>{String(value)}</p>
              </div>
            ))}
          </div>

          <div style={{ padding:'0 16px 16px' }}>
            <h3 style={{ color:'#60a5fa', fontSize:'13px', fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>Team Counts</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'8px' }}>
              {Object.entries(result.teamCounts || {}).sort(([a], [b]) => a.localeCompare(b)).map(([team, count]) => (
                <div key={team} style={{ display:'flex', justifyContent:'space-between', background:'rgba(5,15,35,0.55)', border:'1px solid rgba(59,130,246,0.08)', borderRadius:'6px', padding:'8px 10px', color:'#94a3b8', fontSize:'12px' }}>
                  <span>{team}</span><strong style={{ color:'#e2e8f0' }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          {result.protectedExamples && result.protectedExamples.length > 0 && (
            <div style={{ padding:'0 16px 16px' }}>
              <h3 style={{ color:'#fbbf24', fontSize:'13px', fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>Protected Rows Not In Master</h3>
              <p style={{ color:'#64748b', fontSize:'12px' }}>These rows have score data attached, so they will not be deactivated automatically.</p>
              <pre style={{ whiteSpace:'pre-wrap', overflowX:'auto', background:'rgba(5,15,35,0.8)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:'8px', padding:'12px', color:'#94a3b8', fontSize:'11px' }}>{JSON.stringify(result.protectedExamples, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
