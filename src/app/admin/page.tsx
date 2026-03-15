'use client'
import { useState, useEffect } from 'react'
export const dynamic = 'force-dynamic'
interface User { id: string; email: string; created_at: string; last_sign_in_at: string; email_confirmed_at: string }
export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }
  useEffect(() => { loadUsers() }, [])
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); setInviting(true); setMessage(''); setError('')
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    const data = await res.json()
    if (res.ok) { setMessage(`Invite sent to ${inviteEmail}`); setInviteEmail(''); loadUsers() }
    else setError(data.error || 'Failed to send invite')
    setInviting(false)
  }
  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Remove access for ${email}?`)) return
    setDeletingId(userId)
    await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
    setDeletingId(null)
    loadUsers()
  }
  function fmt(d: string) { if (!d) return 'Never'; return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) }
  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>ADMIN PANEL</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Manage coach and parent access</p>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '520px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>INVITE NEW USER</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>They'll receive an email with a link to set up their account.</p>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="coach@kmha.ca"
              style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
            <button type="submit" disabled={inviting} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: inviting ? 0.7 : 1, whiteSpace: 'nowrap' as const }}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {message && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#10b981' }}>✓ {message}</p>}
          {error && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#ef4444' }}>{error}</p>}
        </form>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)' }}>
            ALL USERS {!loading && `(${users.length})`}
          </h2>
          <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}>↻ Refresh</button>
        </div>
        {loading && <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Loading users...</p>}
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Email','Joined','Last Sign In','Status',''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{fmt(user.created_at)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{fmt(user.last_sign_in_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {user.email_confirmed_at
                        ? <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>ACTIVE</span>
                        : <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>PENDING</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' as const }}>
                      <button onClick={() => handleDelete(user.id, user.email)} disabled={deletingId === user.id}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '4px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                        {deletingId === user.id ? '...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
