'use client'
import { useState, useRef } from 'react'
import { TEAMS, ALL_MONTHS, TEST_TYPES, TEST_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

const YEARS = [2024, 2025, 2026, 2027]

export default function ImportPage() {
  const [tab, setTab] = useState<'import'|'delete'>('import')

  // Import state
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [delTeam, setDelTeam] = useState('')
  const [delMonth, setDelMonth] = useState('')
  const [delYear, setDelYear] = useState<number|''>('')
  const [delTest, setDelTest] = useState('')
  const [delAthleteSearch, setDelAthleteSearch] = useState('')
  const [athletes, setAthletes] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [deleteResult, setDeleteResult] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [wiping, setWiping] = useState(false)

  // --- IMPORT ---
  function parseCSV(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    }).filter(r => r.score && !isNaN(parseFloat(r.score)))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      setPreview(parseCSV(text).slice(0, 10))
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    const rows = parseCSV(csvText)
    if (!rows.length) return
    setImporting(true)
    setImportResult('')

    const entries = rows.map(r => ({
      id: crypto.randomUUID(),
      athlete_id: r.athlete_id || r.id || '',
      athlete_name: r.athlete_name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      team: r.team || '',
      test_type: r.test_type || r.test || '',
      score: parseFloat(r.score),
      month: r.month || '',
      year: parseInt(r.year) || new Date().getFullYear(),
    })).filter(e => e.athlete_id && e.team && e.test_type && e.month && e.year)

    if (!entries.length) {
      setImportResult('❌ No valid rows found. Check your CSV has: athlete_id, team, test_type, score, month, year columns.')
      setImporting(false)
      return
    }

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries)
    })

    if (res.ok) setImportResult(`✓ Successfully imported ${entries.length} entries`)
    else setImportResult('❌ Import failed — check your data format')
    setImporting(false)
  }

  // --- DELETE ---
  async function loadEntries() {
    if (!delTeam && !delAthleteSearch) return
    setLoadingEntries(true)
    setEntries([])
    const params = new URLSearchParams()
    if (delTeam) params.set('team', delTeam)
    if (delYear) params.set('year', String(delYear))
    if (delMonth) params.set('month', delMonth)
    const [entriesRes, athletesRes] = await Promise.all([
      fetch(`/api/entries?${params}`).then(r => r.json()),
      fetch('/api/athletes').then(r => r.json()),
    ])
    setAthletes(athletesRes)
    let filtered = entriesRes
    if (delTest) filtered = filtered.filter((e: any) => e.test_type === delTest)
    if (delAthleteSearch) {
      const q = delAthleteSearch.toLowerCase()
      const matchingIds = new Set(athletesRes.filter((a: any) =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
      ).map((a: any) => a.id))
      filtered = filtered.filter((e: any) => matchingIds.has(e.athlete_id))
    }
    setEntries(filtered)
    setLoadingEntries(false)
  }

  async function deleteEntry(id: string) {
    setDeletingIds(prev => new Set([...prev, id]))
    await fetch(`/api/entries?id=${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function wipeFiltered() {
    setWiping(true)
    for (const entry of entries) {
      await fetch(`/api/entries?id=${entry.id}`, { method: 'DELETE' })
    }
    setEntries([])
    setDeleteResult(`✓ Deleted ${entries.length} entries`)
    setConfirmWipe(false)
    setWiping(false)
  }

  function getAthleteName(athleteId: string) {
    const a = athletes.find(a => a.id === athleteId)
    return a ? `${a.first_name} ${a.last_name}` : athleteId
  }

  const tabStyle = (t: string) => ({
    padding: '8px 20px', borderRadius: '6px', fontSize: '13px',
    fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer',
    background: tab === t ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
    border: tab === t ? 'none' : '1px solid rgba(59,130,246,0.2)',
    color: tab === t ? 'white' : '#64748b',
  })

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>DATA MANAGEMENT</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Import from CSV or delete incorrect entries</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button style={tabStyle('import') as any} onClick={() => setTab('import')}>↑ Import CSV</button>
        <button style={tabStyle('delete') as any} onClick={() => setTab('delete')}>✕ Delete Entries</button>
      </div>

      {/* IMPORT TAB */}
      {tab === 'import' && (
        <div style={{ maxWidth: '640px' }}>
          <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'white', fontFamily: 'var(--font-display)' }}>IMPORT FROM CSV</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              CSV must have these columns: <code style={{ background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: '3px', color: '#60a5fa', fontSize: '12px' }}>athlete_id, athlete_name, team, test_type, score, month, year</code>
            </p>

            <div style={{ border: '2px dashed rgba(59,130,246,0.2)', borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              <p style={{ margin: '0 0 8px', fontSize: '32px' }}>📄</p>
              <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8' }}>Click to upload CSV file</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>or paste CSV text below</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setPreview(parseCSV(e.target.value).slice(0, 10)) }}
              placeholder="Or paste CSV content here..."
              rows={6}
              style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />

            {preview.length > 0 && (
              <div style={{ marginTop: '12px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '6px', padding: '10px 14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>Preview ({parseCSV(csvText).length} rows detected):</p>
                {preview.slice(0,3).map((row, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    {row.athlete_name || row.athlete_id} · {row.team} · {row.test_type} · {row.score} · {row.month} {row.year}
                  </p>
                ))}
                {preview.length > 3 && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#334155' }}>...and {parseCSV(csvText).length - 3} more</p>}
              </div>
            )}

            {importResult && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: importResult.startsWith('✓') ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${importResult.startsWith('✓') ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                <p style={{ margin: 0, fontSize: '13px', color: importResult.startsWith('✓') ? '#34d399' : '#f87171' }}>{importResult}</p>
              </div>
            )}

            <button onClick={handleImport} disabled={!csvText || importing} style={{ marginTop: '16px', width: '100%', padding: '11px', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: !csvText || importing ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: !csvText || importing ? 0.5 : 1 }}>
              {importing ? 'Importing...' : `Import ${parseCSV(csvText).length || 0} Entries`}
            </button>
          </div>

          <div style={{ background: 'rgba(10,20,40,0.4)', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>CSV Format Example:</p>
            <pre style={{ margin: 0, fontSize: '11px', color: '#334155', fontFamily: 'monospace', lineHeight: 1.6, overflow: 'auto' }}>
{`athlete_id,athlete_name,team,test_type,score,month,year
abc123,John Smith,U15AAA,Sprint,1.85,October,2025
abc123,John Smith,U15AAA,Vertical,65,October,2025
def456,Jane Doe,U15AAA,Sprint,1.92,October,2025`}
            </pre>
          </div>
        </div>
      )}

      {/* DELETE TAB */}
      {tab === 'delete' && (
        <div>
          {/* Confirm wipe modal */}
          {confirmWipe && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ background: '#0a1428', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <p style={{ fontSize: '36px', margin: '0 0 12px' }}>⚠️</p>
                <h2 style={{ margin: '0 0 8px', color: '#f87171', fontFamily: 'var(--font-display)', fontSize: '20px' }}>DELETE {entries.length} ENTRIES?</h2>
                <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>This will permanently delete all {entries.length} filtered entries. This cannot be undone.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setConfirmWipe(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button onClick={wipeFiltered} disabled={wiping} style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'rgba(239,68,68,0.8)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    {wiping ? 'Deleting...' : 'Yes, Delete All'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'white', fontFamily: 'var(--font-display)' }}>FILTER ENTRIES TO DELETE</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Team</label>
                <select value={delTeam} onChange={e => setDelTeam(e.target.value)} className="kmha-select w-full">
                  <option value="">All Teams</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Month</label>
                <select value={delMonth} onChange={e => setDelMonth(e.target.value)} className="kmha-select w-full">
                  <option value="">All Months</option>
                  {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Year</label>
                <select value={delYear} onChange={e => setDelYear(e.target.value ? parseInt(e.target.value) : '')} className="kmha-select w-full">
                  <option value="">All Years</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Test Type</label>
                <select value={delTest} onChange={e => setDelTest(e.target.value)} className="kmha-select w-full">
                  <option value="">All Tests</option>
                  {TEST_TYPES.map(t => <option key={t} value={t}>{TEST_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Athlete Name</label>
                <input type="search" value={delAthleteSearch} onChange={e => setDelAthleteSearch(e.target.value)} placeholder="Search name..."
                  style={{ width: '100%', background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={loadEntries} disabled={loadingEntries} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: loadingEntries ? 0.7 : 1 }}>
                {loadingEntries ? 'Loading...' : 'Search Entries'}
              </button>
              {entries.length > 0 && (
                <button onClick={() => setConfirmWipe(true)} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  Delete All {entries.length} Results
                </button>
              )}
            </div>
          </div>

          {deleteResult && (
            <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#34d399' }}>{deleteResult}</p>
            </div>
          )}

          {/* Results table */}
          {entries.length > 0 && (
            <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{entries.length} ENTRIES FOUND</p>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      {['Athlete','Team','Test','Score','Month','Year',''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.95)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry: any) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.04)' }}>
                        <td style={{ padding: '8px 14px', color: '#e2e8f0', fontSize: '13px' }}>{getAthleteName(entry.athlete_id)}</td>
                        <td style={{ padding: '8px 14px' }}><span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{entry.team}</span></td>
                        <td style={{ padding: '8px 14px', color: '#94a3b8', fontSize: '12px' }}>{TEST_LABELS[entry.test_type as keyof typeof TEST_LABELS] || entry.test_type}</td>
                        <td style={{ padding: '8px 14px', color: '#fbbf24', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{entry.score}</td>
                        <td style={{ padding: '8px 14px', color: '#64748b', fontSize: '12px' }}>{entry.month}</td>
                        <td style={{ padding: '8px 14px', color: '#64748b', fontSize: '12px' }}>{entry.year}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <button onClick={() => deleteEntry(entry.id)} disabled={deletingIds.has(entry.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                            {deletingIds.has(entry.id) ? '...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {entries.length === 0 && !loadingEntries && (
            <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#334155', margin: 0, fontSize: '13px' }}>Use the filters above and click Search Entries to find data to delete</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
