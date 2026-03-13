'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'

interface ImportResult {
  athletes: number
  entries: number
  errors: string[]
}

export default function ImportPage() {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<{ athletes: any[], entries: any[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const athleteRef = useRef<HTMLInputElement>(null)
  const entryRef = useRef<HTMLInputElement>(null)

  function parseAthletes(file: File): Promise<any[]> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const athletes = (results.data as any[])
            .filter(r => r.first_name && r.last_name && r.team && r.is_sample !== 'true')
            .map(r => ({
              id: r.id || crypto.randomUUID(),
              first_name: r.first_name.trim(),
              last_name: r.last_name.trim(),
              team: r.team.trim(),
              active: true,
            }))
          resolve(athletes)
        }
      })
    })
  }

  function parseEntries(file: File): Promise<any[]> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const entries = (results.data as any[])
            .filter(r => r.score !== undefined && r.month && r.year && r.test_type && r.is_sample !== 'true')
            .map(r => ({
              id: r.id || crypto.randomUUID(),
              athlete_id: r.athlete_id,
              athlete_name: (r.athlete_name || '').trim(),
              team: r.team?.trim() || '',
              score: parseFloat(r.score) || 0,
              month: r.month?.trim(),
              year: parseInt(r.year),
              test_type: r.test_type?.trim(),
            }))
          resolve(entries)
        }
      })
    })
  }

  async function handlePreview() {
    const athleteFile = athleteRef.current?.files?.[0]
    const entryFile = entryRef.current?.files?.[0]

    setStatus('parsing')
    setErrorMsg('')

    const athletes = athleteFile ? await parseAthletes(athleteFile) : []
    const entries = entryFile ? await parseEntries(entryFile) : []

    setPreview({ athletes, entries })
    setStatus('idle')
  }

  async function handleImport() {
    if (!preview) return
    setStatus('importing')

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview),
    })

    const data = await res.json()

    if (res.ok) {
      setResult(data)
      setStatus('done')
      setPreview(null)
    } else {
      setErrorMsg(data.error || 'Import failed')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-wide">IMPORT CSV</h1>
        <p className="text-sm mt-0.5" style={{ color: '#475569' }}>Upload athlete rosters and combine test results</p>
      </div>

      {/* Upload area */}
      <div className="kmha-card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
            Athletes CSV
          </label>
          <p className="text-xs mb-2" style={{ color: '#475569' }}>
            Required columns: <code className="px-1 rounded" style={{ background: '#0d1b2a', color: '#38bdf8' }}>first_name, last_name, team, id</code>
          </p>
          <input ref={athleteRef} type="file" accept=".csv" className="kmha-input w-full" style={{ padding: '6px' }} />
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
            Combine Entries CSV
          </label>
          <p className="text-xs mb-2" style={{ color: '#475569' }}>
            Required columns: <code className="px-1 rounded" style={{ background: '#0d1b2a', color: '#38bdf8' }}>score, month, year, athlete_id, team, athlete_name, test_type, id</code>
          </p>
          <input ref={entryRef} type="file" accept=".csv" className="kmha-input w-full" style={{ padding: '6px' }} />
        </div>

        <button onClick={handlePreview} disabled={status === 'parsing'} className="kmha-btn-ghost">
          {status === 'parsing' ? 'Parsing...' : 'Preview Import'}
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="kmha-card p-5 space-y-4" style={{ borderColor: 'rgba(14,165,233,0.3)' }}>
          <h3 className="font-display font-semibold text-sm tracking-wider" style={{ color: '#64748b', textTransform: 'uppercase' }}>
            Import Preview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded" style={{ background: '#0d1b2a' }}>
              <p className="text-3xl font-display font-bold" style={{ color: '#38bdf8' }}>{preview.athletes.length}</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>Athletes</p>
            </div>
            <div className="text-center p-4 rounded" style={{ background: '#0d1b2a' }}>
              <p className="text-3xl font-display font-bold" style={{ color: '#34d399' }}>{preview.entries.length}</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>Test Entries</p>
            </div>
          </div>

          {/* Sample preview */}
          {preview.athletes.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#64748b' }}>Sample athletes:</p>
              <div className="text-xs space-y-1">
                {preview.athletes.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex gap-2 px-3 py-1.5 rounded" style={{ background: '#0d1b2a' }}>
                    <span style={{ color: '#94a3b8' }}>{a.first_name} {a.last_name}</span>
                    <span className="team-badge" style={{ fontSize: '10px' }}>{a.team}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleImport} disabled={status === 'importing'} className="kmha-btn w-full">
            {status === 'importing' ? 'Importing...' : `Import ${preview.athletes.length + preview.entries.length} Records`}
          </button>
        </div>
      )}

      {/* Success */}
      {status === 'done' && result && (
        <div className="kmha-card p-5" style={{ borderColor: 'rgba(52,211,153,0.4)' }}>
          <h3 className="font-display font-semibold text-sm tracking-wider mb-3" style={{ color: '#34d399', textTransform: 'uppercase' }}>
            ✓ Import Complete
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded" style={{ background: '#0d1b2a' }}>
              <p className="text-2xl font-display font-bold" style={{ color: '#34d399' }}>{result.athletes}</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>Athletes imported</p>
            </div>
            <div className="p-3 rounded" style={{ background: '#0d1b2a' }}>
              <p className="text-2xl font-display font-bold" style={{ color: '#34d399' }}>{result.entries}</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>Entries imported</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 text-xs space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} style={{ color: '#f87171' }}>{e}</p>
              ))}
            </div>
          )}
          <button onClick={() => { setStatus('idle'); setResult(null) }} className="kmha-btn-ghost mt-4 w-full">
            Import More
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {errorMsg}
        </div>
      )}

      {/* Instructions */}
      <div className="kmha-card p-4">
        <h3 className="font-display text-sm font-semibold tracking-wider mb-3" style={{ color: '#64748b', textTransform: 'uppercase' }}>
          Your CSV Files Are Ready
        </h3>
        <p className="text-sm mb-3" style={{ color: '#64748b' }}>
          Your exported CSVs from Base44 match the expected format exactly. Just upload them above — no reformatting needed.
        </p>
        <p className="text-xs" style={{ color: '#475569' }}>
          Test types supported: <code style={{ color: '#38bdf8' }}>Sprint, Vertical, Chinups, ChinHold, BroadJump</code>
        </p>
      </div>
    </div>
  )
}
