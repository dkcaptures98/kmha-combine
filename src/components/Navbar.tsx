'use client'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const ADMIN_EMAILS = ['d423kim@uwaterloo.ca']

export default function Navbar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kmha-theme')
    if (saved === 'light') {
      setDarkMode(false)
      document.body.classList.add('light')
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && ADMIN_EMAILS.includes(data.user.email || '')) setIsAdmin(true)
    })
  }, [])

  function toggleTheme() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('kmha-theme', next ? 'dark' : 'light')
    document.body.classList.toggle('light', !next)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const publicLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/entry', label: 'Data Entry' },
    { href: '/search', label: 'Search' },
    { href: '/compare', label: 'Compare' },
  ]

  const adminLinks = [
    { href: '/athletes', label: 'Athletes' },
    { href: '/import', label: 'Import CSV' },
    { href: '/admin', label: 'Admin' },
  ]

  const allLinks = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks
  const isActive = (href: string) => pathname === href || (pathname?.startsWith(href) && href !== '/')

  const linkStyle = (href: string) => ({
    padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
    textDecoration: 'none', fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
    color: isActive(href) ? '#60a5fa' : '#64748b',
    background: isActive(href) ? 'rgba(59,130,246,0.1)' : 'transparent',
    border: `1px solid ${isActive(href) ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
    display: 'block', whiteSpace: 'nowrap' as const,
  })

  return (
    <nav style={{ background: 'rgba(2,11,24,0.95)', borderBottom: '1px solid rgba(59,130,246,0.15)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', gap: '8px' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '7px', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.jpg" alt="KMHA" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>KMHA</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, justifyContent: 'center' }} className="hidden-mobile">
          {allLinks.map(link => <Link key={link.href} href={link.href} style={linkStyle(link.href)}>{link.label}</Link>)}
          {isAdmin && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontFamily: 'var(--font-display)', fontWeight: 600 }}>ADMIN</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} className="hidden-mobile">
          <button onClick={toggleTheme} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#475569', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Sign Out</button>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', padding: '4px', display: 'none' }} className="show-mobile">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      {menuOpen && (
        <div style={{ background: 'rgba(2,11,24,0.98)', borderTop: '1px solid rgba(59,130,246,0.1)', padding: '12px 16px' }} className="show-mobile">
          {allLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ ...linkStyle(link.href), padding: '10px 14px', marginBottom: '4px' }}>{link.label}</Link>)}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={toggleTheme} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b', cursor: 'pointer' }}>{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
            <button onClick={handleLogout} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(59,130,246,0.2)', color: '#475569', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } .show-mobile { display: block !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } .hidden-mobile { display: flex !important; } }
      `}</style>
    </nav>
  )
}
