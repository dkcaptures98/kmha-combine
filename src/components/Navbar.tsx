'use client'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getUserPermissions, UserRole } from '@/lib/permissions'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    getUserPermissions().then(p => {
      const normalizedRole =
        p.role === 'coach' || p.role === 'editor' || p.role === 'entry_only'
          ? 'data_entry'
          : p.role === 'super_admin'
            ? 'superadmin'
            : p.role
      setRole(normalizedRole)
      if (normalizedRole === 'data_entry' && !['/entry', '/results', '/schedule', '/combine'].includes(pathname)) router.replace('/entry')
    })
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const linksByRole: Record<string, { href: string; label: string }[]> = {
    superadmin: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/results', label: 'Results' },
      { href: '/entry', label: 'Data Entry' },
      { href: '/combine', label: 'Annual Combine' },
      { href: '/search', label: 'Search' },
      { href: '/compare', label: 'Compare' },
      { href: '/schedule', label: 'Schedule' },
      { href: '/athlete-reports', label: 'Report Cards' },
      { href: '/athletes', label: 'Athletes' },
      { href: '/import', label: 'Import' },
      { href: '/roster-import', label: 'Roster Import' },
      { href: '/admin', label: 'Admin' },
      { href: '/roster-sync', label: 'Roster Sync' },
      { href: '/audit', label: 'Audit Log' },
    ],
    admin: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/results', label: 'Results' },
      { href: '/entry', label: 'Data Entry' },
      { href: '/combine', label: 'Annual Combine' },
      { href: '/search', label: 'Search' },
      { href: '/compare', label: 'Compare' },
      { href: '/schedule', label: 'Schedule' },
      { href: '/athlete-reports', label: 'Report Cards' },
      { href: '/athletes', label: 'Athletes' },
      { href: '/import', label: 'Import' },
      { href: '/roster-import', label: 'Roster Import' },
      { href: '/admin', label: 'Admin' },
      { href: '/roster-sync', label: 'Roster Sync' },
    ],
    data_entry: [
      { href: '/entry', label: 'Data Entry' },
      { href: '/results', label: 'Results' },
      { href: '/combine', label: 'Annual Combine' },
      { href: '/schedule', label: 'Schedule' },
    ],
    coach: [
      { href: '/entry', label: 'Data Entry' },
      { href: '/combine', label: 'Annual Combine' },
      { href: '/schedule', label: 'Schedule' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/results', label: 'Results' },
      { href: '/search', label: 'Search' },
    ],
    entry_only: [
      { href: '/entry', label: 'Data Entry' },
      { href: '/results', label: 'Results' },
      { href: '/schedule', label: 'Schedule' },
    ],
  }

  const badgeMap: Record<string, { bg: string; border: string; color: string; label: string }> = {
    superadmin: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#f87171', label: 'SUPER ADMIN' },
    admin:      { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', label: 'ADMIN' },
    data_entry:{ bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', color: '#60a5fa', label: 'DATA ENTRY' },
    coach:      { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', color: '#60a5fa', label: 'DATA ENTRY' },
    entry_only: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', color: '#34d399', label: 'ENTRY' },
  }

  const links = role ? (linksByRole[role] || linksByRole.data_entry || linksByRole.coach) : []
  const badge = role ? badgeMap[role] : null
  const isActive = (href: string) => pathname === href || (pathname?.startsWith(href) && href !== '/')

  const linkStyle = (href: string) => ({
    padding: '4px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
    textDecoration: 'none', fontFamily: 'var(--font-display)', letterSpacing: '0.03em',
    color: isActive(href) ? '#60a5fa' : '#64748b',
    background: isActive(href) ? 'rgba(59,130,246,0.1)' : 'transparent',
    border: `1px solid ${isActive(href) ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
    display: 'block', whiteSpace: 'nowrap' as const,
  })

  return (
    <nav style={{ background: 'rgba(2,11,24,0.95)', borderBottom: '1px solid rgba(59,130,246,0.15)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', gap: '8px' }}>
        <Link href={role === 'data_entry' || role === 'entry_only' ? '/entry' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.jpg" alt="KMHA" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>KMHA</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flex: 1, justifyContent: 'center', overflow: 'hidden' }} className="hidden-mobile">
          {links.map(link => <Link key={link.href} href={link.href} style={linkStyle(link.href)}>{link.label}</Link>)}
          {badge && <span style={{ marginLeft: '4px', padding: '2px 5px', borderRadius: '4px', fontSize: '8px', background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontFamily: 'var(--font-display)', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' as const }}>{badge.label}</span>}
        </div>
        <button onClick={handleLogout} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#475569', cursor: 'pointer', fontFamily: 'var(--font-display)', flexShrink: 0 }} className="hidden-mobile">Sign Out</button>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', padding: '4px', display: 'none' }} className="show-mobile">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      {menuOpen && (
        <div style={{ background: 'rgba(2,11,24,0.98)', borderTop: '1px solid rgba(59,130,246,0.1)', padding: '12px 16px' }} className="show-mobile">
          {links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ ...linkStyle(link.href), padding: '10px 14px', marginBottom: '4px' }}>{link.label}</Link>)}
          <button onClick={handleLogout} style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#475569', cursor: 'pointer', textAlign: 'left' as const }}>Sign Out</button>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } .show-mobile { display: block !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } .hidden-mobile { display: flex !important; } }
      `}</style>
    </nav>
  )
}