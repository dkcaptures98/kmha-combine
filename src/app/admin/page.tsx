'use client'
import { useState, useEffect } from 'react'
import { TEAMS } from '@/types'

export const dynamic = 'force-dynamic'

interface User {
  id: string; email: string; created_at: string;
  last_sign_in_at: string; email_confirmed_at: string;
  teams: string[] | null; role: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access to everything', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  { value: 'coach', label: 'Coach', desc: 'View dashboards, search, compare', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { value: 'entry_only', label: 'Data Entry', desc: 'Enter scores only, no dashboards', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
]

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editTeams, setEditTeams] = useState<string[]>([])
  const [editRole, setEditRole] = useState('coach')
  const [savingPerms, setSavingPerms] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault(); setInviting(true); setMessage(''); setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail })
    })
    const data = await res.json()
    if (res.ok) { setMessage(`Invite sent to ${inviteEmail}`); setInviteEmail(''); loadUsers() }
    else setError(data.error || 'Failed to send invite')
    setInviting(false)
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Remove access for ${email}? This cannot be undone.`)) return
    setDeletingId(userId)
    await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
    setDeletingId(null)
    loadUsers()
  }

  async function handleSavePerms() {
    if (!editingUser) return
    setSavingPerms(true)
    await fetch('/api/admin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editingUser.id, teams: editTeams, role: editRole })
    })
    setSavingPerms(false)
    setEditingUser(null)
    loadUsers()
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setEditTeams(user.teams || [])
    setEditRole(user.role || 'coach')
  }

  function fmt(d: string) {
    if (!d) return 'Never'
    return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getRoleBadge(role: string) {
    return ROLES.find(r => r.value === role) || ROLES[1]
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ADMIN PANEL</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Manage users, roles and team access</p>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0a1428', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>Edit User Access</h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>{editingUser.email}</p>

            {/* Role selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Role</label>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                {ROLES.map(r => (
                  <button key={r.value} onClick={() => setEditRole(r.value)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'left' as const,
                    background: editRole === r.value ? r.bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${editRole === r.value ? r.border : 'rgba(59,130,246,0.1)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: editRole === r.value ? r.color : '#334155', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: editRole === r.value ? r.color : '#94a3b8', fontFamily: 'var(--font-display)' }}>{r.label}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team selector — only for coach role */}
            {editRole !== 'admin' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Team Restrictions</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setEditTeams([])} style={{ background: 'none', border: 'none', color: '#34d399', fontSize: '11px', cursor: 'pointer', padding: 0 }}>All Teams</button>
                    <button onClick={() => setEditTeams([...TEAMS])} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Select All</button>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                  Leave empty for access to all teams. Select specific teams to restrict.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
                  {TEAMS.map(team => {
                    const sel = editTeams.includes(team)
                    return (
                      <button key={team} onClick={() => setEditTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team])} style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
                        fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer',
                        background: sel ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${sel ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.12)'}`,
                        color: sel ? '#60a5fa' : '#475569',
                      }}>{team}</button>
                    )
                  })}
                </div>

                <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', background: editTeams.length > 0 ? 'rgba(59,130,246,0.06)' : 'rgba(52,211,153,0.06)', border: `1px solid ${editTeams.length > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(52,211,153,0.2)'}` }}>
                  <p style={{ margin: 0, fontSize: '12px', color: editTeams.length > 0 ? '#60a5fa' : '#34d399' }}>
                    {editTeams.length > 0 ? `Restricted to: ${editTeams.join(', ')}` : 'Full access to all teams'}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(59,130,246,0.1)' }}>
              <button onClick={() => setEditingUser(null)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSavePerms} disabled={savingPerms} style={{ padding: '8px 24px', borderRadius: '6px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', cursor: 'pointer', opacity: savingPerms ? 0.7 : 1 }}>
                {savingPerms ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '520px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'white', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>INVITE NEW USER</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>They'll receive an email with a link to set up their account. You can set their role and team access after they accept.</p>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="coach@kmha.ca"
              style={{ flex: 1, background: 'rgba(5,15,35,0.8)', border: '1px solid rgba(59,130,246,0.25)', color: 'white', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }} />
            <button type="submit" disabled={inviting} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: inviting ? 0.7 : 1, whiteSpace: 'nowrap' as const }}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {message && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#10b981' }}>✓ {message}</p>}
          {error && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#ef4444' }}>{error}</p>}
        </form>
      </div>

      {/* Users table */}
      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)' }}>
            ALL USERS {!loading && `(${users.length})`}
          </h2>
          <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}>↻ Refresh</button>
        </div>
        {loading && <p style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '13px', margin: 0 }}>Loading users...</p>}
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  {['Email','Role','Teams','Last Sign In','Status',''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const rb = getRoleBadge(user.role)
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                      <td style={{ padding: '12px 16px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{user.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: rb.bg, border: `1px solid ${rb.border}`, color: rb.color, borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{rb.label.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {user.teams && user.teams.length > 0
                          ? <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '3px' }}>
                              {user.teams.slice(0, 2).map(t => <span key={t} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t}</span>)}
                              {user.teams.length > 2 && <span style={{ color: '#475569', fontSize: '11px' }}>+{user.teams.length - 2}</span>}
                            </div>
                          : <span style={{ color: '#34d399', fontSize: '11px' }}>All teams</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>{fmt(user.last_sign_in_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {user.email_confirmed_at
                          ? <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>ACTIVE</span>
                          : <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>PENDING</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(user)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, whiteSpace: 'nowrap' as const }}>Edit Access</button>
                          <button onClick={() => handleDelete(user.id, user.email)} disabled={deletingId === user.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                            {deletingId === user.id ? '...' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '13px' }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
