'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

type AppUser = {
  id: string
  email: string
  role?: string | null
  teams?: string[] | string | null
  status?: string | null
  last_sign_in_at?: string | null
  created_at?: string | null
}

const roleCards = [
  {
    title: 'SYSTEM ADMIN',
    description: 'Full access — unrestricted control',
    color: '#f87171',
    bg: 'rgba(127,29,29,0.28)',
    border: 'rgba(248,113,113,0.18)',
  },
  {
    title: 'ADMIN',
    description: 'Full data access — manage users and edit records',
    color: '#fbbf24',
    bg: 'rgba(120,53,15,0.24)',
    border: 'rgba(251,191,36,0.2)',
  },
  {
    title: 'COACH',
    description: 'View athlete/team data, submit changes — no deletion',
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

function prettyRole(role?: string | null) {
  if (!role) return 'Editor'

  if (role === 'system_admin') return 'System Admin'
  if (role === 'admin') return 'Admin'
  if (role === 'coach') return 'Editor'
  if (role === 'editor') return 'Editor'
  if (role === 'read_only') return 'Read Only'

  return role.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function roleBadgeStyle(role?: string | null) {
  const normalized = role || 'editor'

  if (normalized === 'system_admin') {
    return {
      background: 'rgba(239,68,68,0.13)',
      border: '1px solid rgba(239,68,68,0.35)',
      color: '#f87171',
    }
  }

  if (normalized === 'admin') {
    return {
      background: 'rgba(245,158,11,0.13)',
      border: '1px solid rgba(245,158,11,0.35)',
      color: '#fbbf24',
    }
  }

  if (normalized === 'read_only') {
    return {
      background: 'rgba(52,211,153,0.13)',
      border: '1px solid rgba(52,211,153,0.35)',
      color: '#34d399',
    }
  }

  return {
    background: 'rgba(52,211,153,0.13)',
    border: '1px solid rgba(52,211,153,0.35)',
    color: '#34d399',
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

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadUsers() {
    setLoadingUsers(true)
    setError('')

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('users')
        .select('id,email,role,teams,status,last_sign_in_at,created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
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
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })

      if (error) throw error

      setMessage(`Invite sent to ${email}`)
      setEmail('')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while sending the invite.')
    } finally {
      setInviting(false)
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
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Manage users, roles and team access</p>
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
            <p style={{ margin: 0, color: '#64748b', fontSize: '12px', lineHeight: 1.55 }}>{card.description}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) minmax(520px, 1fr)',
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

            {message && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  color: '#34d399',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                }}
              >
                ✓ {message}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                }}
              >
                {error}
              </div>
            )}
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
                    const styles = roleBadgeStyle(user.role)

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                        <td style={{ padding: '12px 14px', color: '#e2e8f0', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {user.email || 'No email'}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
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
                            {prettyRole(user.role)}
                          </span>
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
                            {user.status || 'Active'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
                            <a
                              href="https://supabase.com/dashboard"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '5px 9px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                background: 'rgba(59,130,246,0.11)',
                                border: '1px solid rgba(59,130,246,0.25)',
                                color: '#60a5fa',
                                textDecoration: 'none',
                              }}
                            >
                              Edit
                            </a>

                            <a
                              href="https://supabase.com/dashboard"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '5px 9px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                background: 'rgba(239,68,68,0.11)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#f87171',
                                textDecoration: 'none',
                              }}
                            >
                              Remove
                            </a>
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
