'use client'
import { useState, useEffect } from 'react'

export const dynamic = 'force-dynamic'

interface AuditLog {
  id: string
  user_email: string
  action: string
  table_name: string
  record_id: string
  details: any
  created_at: string
}

const ACTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  INSERT: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
  UPDATE: { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  DELETE: { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  LOGIN:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterEmail, setFilterEmail] = useState('')
  const limit = 50

  async function load(off = 0) {
    setLoading(true)
    const res = await fetch(`/api/audit?limit=${limit}&offset=${off}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load(0) }, [])

  function fmt(d: string) {
    return new Date(d).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false
    if (filterEmail && !l.user_email?.toLowerCase().includes(filterEmail.toLowerCase())) return false
    return true
  })

  const uniqueActions = [...new Set(logs.map(l => l.action))]
  const uniqueEmails = [...new Set(logs.map(l => l.user_email).filter(Boolean))]

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>AUDIT LOG</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Every action tracked — super admin only</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }} />
          <span style={{ color: '#475569', fontSize: '12px' }}>{total.toLocaleString()} total events</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(ACTION_COLORS).map(([action, c]) => {
          const count = logs.filter(l => l.action === action).length
          return (
            <div key={action} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: c.color, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em' }}>{action}</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input type="search" placeholder="Filter by email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)}
          style={{ background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', minWidth: '200px' }} />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          style={{ background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: 'white', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', appearance: 'none' }}>
          <option value="">All actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => load(0)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', cursor: 'pointer' }}>↻ Refresh</button>
        <span style={{ alignSelf: 'center', color: '#475569', fontSize: '12px' }}>{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading && <p style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '13px', margin: 0 }}>Loading audit log...</p>}
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  {['Time','User','Action','Table','Details'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '13px' }}>No audit events yet</td></tr>
                )}
                {filtered.map(log => {
                  const c = ACTION_COLORS[log.action] || ACTION_COLORS.UPDATE
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                      <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap' as const }}>{fmt(log.created_at)}</td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{log.user_email || 'System'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{log.action}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'var(--font-display)' }}>{log.table_name || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(59,130,246,0.08)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span style={{ color: '#475569', fontSize: '12px' }}>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <button onClick={() => { const o = Math.max(0, offset - limit); setOffset(o); load(o) }} disabled={offset === 0} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: offset === 0 ? '#334155' : '#64748b', cursor: offset === 0 ? 'not-allowed' : 'pointer' }}>← Prev</button>
            <button onClick={() => { const o = offset + limit; setOffset(o); load(o) }} disabled={offset + limit >= total} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: offset + limit >= total ? '#334155' : '#64748b', cursor: offset + limit >= total ? 'not-allowed' : 'pointer' }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
