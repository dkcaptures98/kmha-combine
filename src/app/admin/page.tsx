'use client'

import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_EMAIL = 'd423kim@uwaterloo.ca'

type AppUser = {
  id: string
  email: string
  role?: string | null
  teams?: string[] | string | null
  status?: string | null
  last_sign_in_at?: string | null
  created_at?: string | null
  email_confirmed_at?: string | null
}

const roleCards = [
  {
    title: 'SUPER ADMIN',
    description: 'Protected owner account — unrestricted control',
    color: '#f87171',
    bg: 'rgba(127,29,29,0.28)',
    border: 'rgba(248,113,113,0.18)',
  },
  {
    title: 'ADMIN',
    description: 'Full access — manage users and edit records',
    color: '#fbbf24',
    bg: 'rgba(120,53,15,0.24)',
    border: 'rgba(251,191,36,0.2)',
  },
  {
    title: 'DATA ENTRY',
    description: 'Enter attendance and testing data, submit changes — no deletion',
    color: '#60a5fa',
    bg: 'rgba(30,64,175,0.2)',
    border: 'rgba(96,165,250,0.2)',
  },
  {
    title: 'READ ONLY',
    description: 'View specific data only — no dashboards, no reports',
    color: '#34d399',
    bg: 'rgba(6,78,59,0.24)',
    border: 'rgba(52,211,153,0.2)',
  },
]

function isSuperAdmin(user: AppUser) {
  return user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}

function displayRole(user: AppUser) {
  if (isSuperAdmin(user)) return 'Super Admin'

  const role = (user.role || 'coach').toLowerCase()

  if (role === 'admin') return 'Admin'
  if (role === 'coach') return 'Data Entry'
  if (role === 'data_entry') return 'Data Entry'
  if (role === 'editor') return 'Data Entry'
  if (role === 'read_only') return 'Read Only'
  if (role === 'viewer') return 'Read Only'

  return role.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function apiRole(user: AppUser) {
  if (isSuperAdmin(user)) return 'super_admin'

  const role = (user.role || 'coach').toLowerCase()

  if (role === 'editor') return 'data_entry'
  if (role === 'coach') return 'data_entry'
  if (role === 'viewer') return 'read_only'

  return role
}

function roleBadgeStyle(user: AppUser) {
  const role = apiRole(user)

  if (role === 'super_admin') {
    return {
      background: 'rgba(239,68,68,0.13)',
      border: '1px solid rgba(239,68,68,0.35)',
      color: '#f87171',
    }
  }

  if (role === 'admin') {
    return {
      background: 'rgba(245,158,11,0.13)',
      border: '1px solid rgba(245,158,11,0.35)',
      color: '#fbbf24',
    }
  }

  if (role === 'read_only') {
    return {
      background: 'rgba(52,211,153,0.13)',
      border: '1px solid rgba(52,211,153,0.35)',
      color: '#34d399',
    }
  }

  return {
    background: 'rgba(59,130,246,0.13)',
    border: '1px solid rgba(59,130,246,0.35)',
    color: '#60a5fa',
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'

  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTeams(teams?: string[] | string | null) {
  if (!teams) return 'All teams'
  if (Array.isArray(teams)) return teams.length ? teams.join(', ') : 'All teams'
  return teams || 'All teams'
}

function statusFor(user: AppUser) {
  if (user.status) return user.status
  return user.email_confirmed_at ? 'Active' : 'Invited'
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({})
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadUsers() {
    setLoadingUsers(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load users.')
      }

      const loadedUsers = Array.isArray(payload) ? payload : payload.users || []
      setUsers(loadedUsers)

      const nextDraftRoles: Record<string, string> = {}
      loadedUsers.forEach((user: AppUser) => {
        nextDraftRoles[user.id] = apiRole(user)
      })
      setDraftRoles(nextDraftRoles)
    } catch (err) {
      setUsers([])
      setError(err instanceof Error ? err.message : 'Could not load users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setInviting(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Something went wrong while sending the invite.')
      }

      setMessage(`Invite sent to ${email}`)
      setEmail('')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while sending the invite.')
    } finally {
      setInviting(false)
    }
  }

  async function saveRole(user: AppUser) {
    if (isSuperAdmin(user)) {
      setError(`${SUPER_ADMIN_EMAIL} is the protected Super Admin account and cannot be changed.`)
      return
    }

    const selectedRole = draftRoles[user.id] || apiRole(user)

    if (selectedRole === 'super_admin') {
      setError(`Only ${SUPER_ADMIN_EMAIL} can be Super Admin.`)
      return
    }

    setSavingUserId(user.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          role: selectedRole,
          teams: Array.isArray(user.teams) ? user.teams : null,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update user role.')
      }

      setMessage(`Updated ${user.email} to ${selectedRole.replaceAll('_', ' ')}.`)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user role.')
    } finally {
      setSavingUserId(null)
    }
  }

  async function removeUser(user: AppUser) {
    if (isSuperAdmin(user)) {
      setError(`${SUPER_ADMIN_EMAIL} is the protected Super Admin account and cannot be removed.`)
      return
    }

    const confirmed = window.confirm(`Remove ${user.email}? This will delete their account access.`)
    if (!confirmed) return

    setDeletingUserId(user.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not remove user.')
      }

      setMessage(`Removed ${user.email}.`)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove user.')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'white',
          }}
        >
          ADMIN PANEL
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>
          Manage users, roles and team access
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))',
          gap: '14px',
          maxWidth: '820px',
          marginBottom: '24px',
        }}
      >
        {roleCards.map(card => (
          <div
            key={card.title}
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: '10px',
              padding: '16px 18px',
              minHeight: '92px',
            }}
          >
            <h2
              style={{
                margin: '0 0 8px',
                color: card.color,
                fontSize: '12px',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.06em',
                fontWeight: 700,
              }}
            >
              {card.title}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '12px', lineHeight: 1.55 }}>
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {(message || error) && (
        <div
          style={{
            maxWidth: '820px',
            marginBottom: '16px',
            background: error ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
            border: error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(52,211,153,0.3)',
            color: error ? '#f87171' : '#34d399',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
          }}
        >
          {error || `✓ ${message}`}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) minmax(620px, 1fr)',
          gap: '26px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: 'rgba(10,20,40,0.86)',
            border: '1px solid rgba(59,130,246,0.16)',
            borderRadius: '10px',
            padding: '24px',
          }}
        >
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#e2e8f0',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.04em',
            }}
          >
            INVITE NEW USER
          </h2>

          <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748b', lineHeight: 1.65 }}>
            Send an invite email — they will receive a magic link to set up their account. No password needed on their end.
          </p>

          <form onSubmit={handleInvite}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: '#64748b',
                marginBottom: '8px',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="coach@kmha.ca"
              style={{
                width: '100%',
                background: 'rgba(5,15,35,0.88)',
                border: '1px solid rgba(59,130,246,0.24)',
                color: '#e2e8f0',
                borderRadius: '7px',
                padding: '10px 12px',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: '12px',
              }}
            />

            <button
              type="submit"
              disabled={inviting}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '7px',
                fontSize: '13px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                cursor: inviting ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                border: 'none',
                color: 'white',
                opacity: inviting ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>

        <div
          style={{
            background: 'rgba(10,20,40,0.86)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '13px 16px',
              borderBottom: '1px solid rgba(59,130,246,0.08)',
              background: 'rgba(5,15,35,0.42)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#64748b',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              All Users ({users.length})
            </p>

            <button
              type="button"
              onClick={() => void loadUsers()}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.22)',
                color: '#60a5fa',
              }}
            >
              ↻ Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Email', 'Role', 'Teams', 'Last Login', 'Status', 'Actions'].map(header => (
                    <th
                      key={header}
                      style={{
                        padding: '10px 14px',
                        textAlign: header === 'Actions' ? 'right' : 'left',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#334155',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-display)',
                        borderBottom: '1px solid rgba(59,130,246,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '34px', color: '#64748b', fontSize: '13px' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '34px', color: '#64748b', fontSize: '13px' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    const protectedUser = isSuperAdmin(user)
                    const styles = roleBadgeStyle(user)
                    const selectedRole = draftRoles[user.id] || apiRole(user)

                    return (
                      <tr key={user.id || user.email} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                        <td style={{ padding: '12px 14px', color: '#e2e8f0', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {user.email || 'No email'}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          {protectedUser ? (
                            <span
                              style={{
                                ...styles,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '9px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {displayRole(user)}
                            </span>
                          ) : (
                            <select
                              value={selectedRole}
                              onChange={e => {
                                const nextRole = e.target.value
                                setDraftRoles(prev => ({ ...prev, [user.id]: nextRole }))
                              }}
                              style={{
                                background: styles.background,
                                border: styles.border,
                                color: styles.color,
                                borderRadius: '4px',
                                padding: '5px 8px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                outline: 'none',
                              }}
                            >
                              <option value="admin">Admin</option>
                              <option value="data_entry">Data Entry</option>
                              <option value="read_only">Read Only</option>
                            </select>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px', color: '#34d399', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {formatTeams(user.teams)}
                        </td>

                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {formatDate(user.last_sign_in_at)}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: 'rgba(52,211,153,0.11)',
                              border: '1px solid rgba(52,211,153,0.25)',
                              color: '#34d399',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '9px',
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {statusFor(user)}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
                            <button
                              type="button"
                              disabled={protectedUser || savingUserId === user.id}
                              onClick={() => void saveRole(user)}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                background: 'rgba(59,130,246,0.11)',
                                border: '1px solid rgba(59,130,246,0.25)',
                                color: '#60a5fa',
                                cursor: protectedUser ? 'not-allowed' : 'pointer',
                                opacity: protectedUser ? 0.45 : 1,
                              }}
                            >
                              {savingUserId === user.id ? 'Saving...' : protectedUser ? 'Locked' : 'Save'}
                            </button>

                            <button
                              type="button"
                              disabled={protectedUser || deletingUserId === user.id}
                              onClick={() => void removeUser(user)}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                background: 'rgba(239,68,68,0.11)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#f87171',
                                cursor: protectedUser ? 'not-allowed' : 'pointer',
                                opacity: protectedUser ? 0.45 : 1,
                              }}
                            >
                              {deletingUserId === user.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {!loadingUsers && users.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ padding: '13px 16px', color: '#334155', fontSize: '11px', textAlign: 'center' }}>
                      Finished
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
