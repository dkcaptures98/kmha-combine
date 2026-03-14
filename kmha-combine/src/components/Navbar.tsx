'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/entry', label: 'Data Entry' },
    { href: '/athletes', label: 'Athletes' },
    { href: '/import', label: 'Import CSV' },
  ]

  return (
    <nav style={{
      background: 'rgba(2,11,24,0.95)',
      borderBottom: '1px solid rgba(59,130,246,0.15)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(37,99,235,0.4)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L9.8 5H14L10.5 7.5L11.8 12L8 9.5L4.2 12L5.5 7.5L2 5H6.2L8 1Z" fill="white" />
            </svg>
          </div>
          <div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>KMHA</span>
            <span style={{ color: '#3b82f6', fontSize: '11px', letterSpacing: '0.08em', marginLeft: '6px', display: 'none' }} className="sm:inline">COMBINE</span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
                color: pathname === link.href ? '#60a5fa' : '#64748b',
                background: pathname === link.href ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: `1px solid ${pathname === link.href ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            style={{
              marginLeft: '8px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              background: 'transparent',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-display)',
            }}
            onMouseOver={e => { (e.target as HTMLElement).style.borderColor = 'rgba(59,130,246,0.5)'; (e.target as HTMLElement).style.color = '#60a5fa' }}
            onMouseOut={e => { (e.target as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)'; (e.target as HTMLElement).style.color = '#475569' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
