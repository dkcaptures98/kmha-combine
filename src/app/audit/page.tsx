'use client'
import { useEffect, useMemo, useState } from 'react'

export const dynamic = 'force-dynamic'

type AuditLog = {
  id: string
  user_email?: string | null
  action: string
  table_name?: string | null
  record_id?: string | null
  details?: Record<string, any> | null
  created_at: string
}

const PALETTE: Record<string, { color: string; bg: string; border: string }> = {
  INSERT: { color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)' },
  UPDATE: { color: '#60a5fa', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
  DELETE: { color: '#f87171', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)' },
  COMBINE_ENTRY: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)' },
  SCHEDULE_ADD: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  SCHEDULE_DELETE: { color: '#fb7185', bg: 'rgba(251,113,133,0.10)', border: 'rgba(251,113,133,0.25)' },
  ROSTER_SYNC: { color: '#22d3ee', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.25)' },
  EMAIL_SENT: { color: '#c084fc', bg: 'rgba(192,132,252,0.10)', border: 'rgba(192,132,252,0.25)' },
  LOGIN: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)' },
}

const FALLBACK = { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)' }
const LIMIT = 100

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

function readableDetails(log: AuditLog) {
  const d = log.details || {}
  if (log.action === 'COMBINE_ENTRY') {
    const changed = Array.isArray(d.changed_fields) ? d.changed_fields.join(', ') : d.field || 'result'
    const value = d.value !== undefined ? ` = ${String(d.value)}` : ''
    return `${d.athlete || 'Athlete'} · ${d.team || 'team'} · ${d.season || ''} · ${changed}${value}`
  }
  if (log.table_name === 'combine_entries') {
    return `${d.athlete || 'Athlete'} · ${d.team || 'team'} · ${d.test || 'test'}${d.score !== undefined ? ` = ${d.score}` : ''} · ${d.month || ''} ${d.year || ''}`
  }
  if (log.action === 'SCHEDULE_ADD') return `${d.test_type || 'Session'} scheduled for ${d.week_start || ''}${d.notes ? ` · ${d.notes}` : ''}`
  if (log.action === 'SCHEDULE_DELETE') return `${d.test_type || 'Session'} removed from ${d.week_start || ''}`
  if (log.action === 'ROSTER_SYNC') return `${d.team || ''} ${d.season || ''} ${d.roster_phase || ''}`.trim() || JSON.stringify(d)
  const parts = Object.entries(d).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k.replaceAll('_', ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
  return parts.join(' · ') || '—'
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterText, setFilterText] = useState('')

  async function load(silent = false) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/audit?limit=${LIMIT}&offset=0&_=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not load audit log.')
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setTotal(Number(data.total || 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load audit log.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load(true), 10000)
    return () => window.clearInterval(timer)
  }, [])

  const actions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs])
  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return logs.filter(log => {
      if (filterAction && log.action !== filterAction) return false
      if (!q) return true
      return [log.user_email, log.action, log.table_name, readableDetails(log)].some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [logs, filterAction, filterText])

  const combineCount = logs.filter(l => l.action === 'COMBINE_ENTRY').length
  const weeklyCount = logs.filter(l => l.table_name === 'combine_entries' && (l.action === 'INSERT' || l.action === 'UPDATE')).length
  const deleteCount = logs.filter(l => l.action === 'DELETE' || l.action === 'SCHEDULE_DELETE').length

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>AUDIT LOG</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>Live activity feed · refreshes every 10 seconds</p>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{total.toLocaleString()} total events</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          ['RECENT EVENTS', logs.length, '#e2e8f0'],
          ['ANNUAL COMBINE', combineCount, '#fbbf24'],
          ['WEEKLY ENTRIES', weeklyCount, '#60a5fa'],
          ['DELETIONS', deleteCount, '#f87171'],
        ].map(([label, count, color]) => (
          <div key={String(label)} style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 9, padding: '12px 15px' }}>
            <p style={{ margin: 0, color: String(color), fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>{label}</p>
            <p style={{ margin: '4px 0 0', color: 'white', fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{Number(count)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Search user, athlete, team, test..." style={{ minWidth: 280, flex: 1, background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">All activity</option>
          {actions.map(a => <option key={a} value={a}>{a.replaceAll('_', ' ')}</option>)}
        </select>
        <button onClick={() => load()} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)', color: '#60a5fa', cursor: 'pointer', fontWeight: 700 }}>Refresh</button>
      </div>

      {error && <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13 }}>Audit log error: {error}</div>}

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? <p style={{ margin: 0, padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading activity…</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Time','User','Activity','Details'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.45)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No matching audit activity</td></tr>}
                {filtered.map(log => {
                  const c = PALETTE[log.action] || FALLBACK
                  return <tr key={log.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{formatTime(log.created_at)}</td>
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: 11, whiteSpace: 'nowrap' }}>{log.user_email || 'System'}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', padding: '3px 7px', borderRadius: 4, color: c.color, background: c.bg, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 700 }}>{log.action.replaceAll('_', ' ')}</span></td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11, minWidth: 340 }}>{readableDetails(log)}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ margin: '10px 0 0', color: '#475569', fontSize: 11 }}>Showing the newest {Math.min(LIMIT, total)} events. Use search to find an athlete, team, user, or test.</p>
    </div>
  )
}
