'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while sending the invite.')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>
          ADMIN PANEL
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>
          Manage users, roles and team access
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: '14px', maxWidth: '820px', marginBottom: '24px' }}>
        {[
          ['SYSTEM ADMIN', 'Full access — unrestricted control', '#f87171', 'rgba(127,29,29,0.28)'],
          ['ADMIN', 'Full data access — manage users and edit records', '#fbbf24', 'rgba(120,53,15,0.24)'],
          ['COACH', 'View athlete/team data, submit changes — no deletion', '#60a5fa', 'rgba(30,64,175,0.2)'],
          ['READ ONLY', 'View specific data only — no dashboards, no reports', '#34d399', 'rgba(6,78,59,0.24)'],
        ].map(([title, desc, color, bg]) => (
          <div key={title} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: '10px', padding: '16px 18px', minHeight: '92px' }}>
            <h2 style={{ margin: '0 0 8px', color, fontSize: '12px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontWeight: 700 }}>
              {title}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '12px', lineHeight: 1.55 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(520px, 1fr)', gap: '26px', alignItems: 'start' }}>
        <div style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.16)', borderRadius: '10px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            INVITE NEW USER
          </h2>

          <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748b', lineHeight: 1.65 }}>
            Send an invite email — they will receive a magic link to set up their account. No password needed on their end.
          </p>

          <form onSubmit={handleInvite}>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="coach@kmha.ca"
              style={{ width: '100%', background: 'rgba(5,15,35,0.88)', border: '1px solid rgba(59,130,246,0.24)', color: '#e2e8f0', borderRadius: '7px', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', marginBottom: '12px' }}
            />

            <button
              type="submit"
              disabled={inviting}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: 'white', opacity: inviting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>

            {message && <div style={{ marginTop: '12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: '6px', padding: '10px 12px', fontSize: '12px' }}>✓ {message}</div>}
            {error && <div style={{ marginTop: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '10px 12px', fontSize: '12px' }}>{error}</div>}
          </form>
        </div>

        <div style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(59,130,246,0.08)', background: 'rgba(5,15,35,0.42)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              All Users
            </p>
            <button type="button" style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', color: '#60a5fa' }}>
              ↻ Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Email', 'Role', 'Teams', 'Last Login', 'Status', 'Actions'].map(header => (
                    <th key={header} style={{ padding: '10px 14px', textAlign: header === 'Actions' ? 'right' : 'left', fontSize: '10px', fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)', whiteSpace: 'nowrap' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['hky98h69@gmail.com', 'Admin', 'All teams', 'May 13, 2026', 'Active'],
                  ['kmhasigndateh@gmail.com', 'Editor', 'All teams', 'Mar 26, 2026', 'Active'],
                  ['anfo@uwaterloo.ca', 'Editor', 'All teams', 'Mar 19, 2026', 'Active'],
                  ['kimdaniel2008@gmail.com', 'Admin', 'All teams', 'Mar 15, 2026', 'Active'],
                ].map(row => (
                  <tr key={row[0]} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '12px 14px', color: '#e2e8f0', fontSize: '12px', whiteSpace: 'nowrap' }}>{row[0]}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: row[1] === 'Admin' ? 'rgba(245,158,11,0.13)' : 'rgba(52,211,153,0.13)', border: row[1] === 'Admin' ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(52,211,153,0.35)', color: row[1] === 'Admin' ? '#fbbf24' : '#34d399', borderRadius: '4px', padding: '3px 8px', fontSize: '9px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {row[1]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#34d399', fontSize: '11px', whiteSpace: 'nowrap' }}>{row[2]}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>{row[3]}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: 'rgba(52,211,153,0.11)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', borderRadius: '4px', padding: '3px 8px', fontSize: '9px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {row[4]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ padding: '5px 9px', borderRadius: '5px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 700, background: 'rgba(59,130,246,0.11)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', textDecoration: 'none' }}>Edit</a>
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ padding: '5px 9px', borderRadius: '5px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 700, background: 'rgba(239,68,68,0.11)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', textDecoration: 'none' }}>Remove</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: '13px 16px', color: '#334155', fontSize: '11px', textAlign: 'center' }}>
                    Finished
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
