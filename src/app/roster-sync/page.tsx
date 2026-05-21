'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SyncResult = {
  preview?: boolean
  success?: boolean
  counts?: {
    incoming: number
    returning: number
    newAthletes: number
    teamChanges: number
    toArchive: number
  }
  returning?: any[]
  newAthletes?: any[]
  teamChanges?: any[]
  toArchive?: any[]
  error?: string
}

export default function RosterSyncPage() {
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return

    setFileName(file.name)
    setResult(null)

    const text = await file.text()
    setCsv(text)
  }

  async function runSync(confirm: boolean) {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()

      const response = await fetch('/api/admin/roster-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, confirm, userEmail: data.user?.email || 'unknown' }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Roster sync failed.')
      }

      setResult(payload)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Roster sync failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>
          ROSTER SYNC
        </h1>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>
          Upload the new roster CSV. The system will preview returning athletes, new athletes, team changes, and athletes that will be archived.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CSV File
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={e => void handleFile(e.target.files?.[0] || null)}
            style={{ color: '#94a3b8' }}
          />

          {fileName && <p style={{ margin: '8px 0 0', color: '#60a5fa', fontSize: '12px' }}>{fileName}</p>}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!csv || loading}
            onClick={() => void runSync(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(59,130,246,0.25)',
              background: !csv || loading ? 'rgba(15,23,42,0.6)' : 'rgba(59,130,246,0.12)',
              color: !csv || loading ? '#475569' : '#60a5fa',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: !csv || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Checking...' : 'Preview Sync'}
          </button>

          <button
            type="button"
            disabled={!result?.preview || loading}
            onClick={() => void runSync(true)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(52,211,153,0.25)',
              background: !result?.preview || loading ? 'rgba(15,23,42,0.6)' : 'rgba(52,211,153,0.10)',
              color: !result?.preview || loading ? '#475569' : '#34d399',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: !result?.preview || loading ? 'not-allowed' : 'pointer',
            }}
          >
            Confirm Sync
          </button>
        </div>
      </div>

      {result?.error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          {result.error}
        </div>
      )}

      {result?.counts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            ['Incoming', result.counts.incoming],
            ['Returning', result.counts.returning],
            ['New Athletes', result.counts.newAthletes],
            ['Team Changes', result.counts.teamChanges],
            ['To Archive', result.counts.toArchive],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px' }}>
              <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ margin: 0, color: 'white', fontSize: '26px', fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {result?.success && (
        <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          Roster sync completed successfully.
        </div>
      )}

      {result?.preview && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <PreviewTable title="Team Changes" rows={result.teamChanges || []} columns={['first_name', 'last_name', 'old_team', 'new_team']} />
          <PreviewTable title="New Athletes" rows={result.newAthletes || []} columns={['first_name', 'last_name', 'team']} />
          <PreviewTable title="To Archive" rows={result.toArchive || []} columns={['first_name', 'last_name', 'team']} />
        </div>
      )}
    </div>
  )
}

function PreviewTable({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return (
    <div style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.42)' }}>
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title} ({rows.length})
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                  {column.replaceAll('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                {columns.map(column => (
                  <td key={column} style={{ padding: '10px 14px', color: '#e2e8f0', fontSize: '12px' }}>
                    {row[column] || ''}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  None
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
