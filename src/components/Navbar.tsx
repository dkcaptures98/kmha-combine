'use client'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

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

  const linkStyle = (href: string) => ({
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
    color: pathname === href || pathname?.startsWith(href + '/') ? '#60a5fa' : '#64748b',
    background: pathname === href || pathname?.startsWith(href + '/') ? 'rgba(59,130,246,0.1)' : 'transparent',
    border: `1px solid ${pathname === href ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
    display: 'block',
  })

  return (
    <nav style={{ background:'rgba(2,11,24,0.95)', borderBottom:'1px solid rgba(59,130,246,0.15)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:40 }}>
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px' }}>
        <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 12px rgba(37,99,235,0.4)', flexShrink:0 }}>
            <img src="/logo.jpg" alt="KMHA" style={{ width:'28px', height:'28px', borderRadius:'6px', objectFit:'cover' }} />
          </div>
          <span style={{ color:'white', fontWeight:700, fontSize:'15px', letterSpacing:'0.1em', fontFamily:'var(--font-display)' }}>KMHA</span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }} className="hidden-mobile">
          {links.map(link => <Link key={link.href} href={link.href} style={linkStyle(link.href)}>{link.label}</Link>)}
          <button onClick={handleLogout} style={{ marginLeft:'8px', padding:'6px 14px', borderRadius:'6px', fontSize:'13px', background:'transparent', border:'1px solid rgba(59,130,246,0.2)', color:'#475569', cursor:'pointer', fontFamily:'var(--font-display)' }}>Sign Out</button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display:'none', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:'20px', padding:'4px' }} className="show-mobile">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background:'rgba(2,11,24,0.98)', borderTop:'1px solid rgba(59,130,246,0.1)', padding:'12px 16px' }} className="show-mobile">
          {links.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ ...linkStyle(link.href), padding:'10px 14px', marginBottom:'4px' }}>{link.label}</Link>
          ))}
          <button onClick={handleLogout} style={{ width:'100%', marginTop:'8px', padding:'10px', borderRadius:'6px', fontSize:'13px', background:'transparent', border:'1px solid rgba(59,130,246,0.2)', color:'#475569', cursor:'pointer', textAlign:'left', fontFamily:'var(--font-display)' }}>Sign Out</button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .show-mobile { display: none !important; }
          .hidden-mobile { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
