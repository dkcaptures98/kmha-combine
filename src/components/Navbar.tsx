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
    router.push('/auth/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/entry', label: 'Data Entry' },
    { href: '/athletes', label: 'Athletes' },
    { href: '/import', label: 'Import CSV' },
  ]

  return (
    <nav className="rink-line sticky top-0 z-40" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.8 5H13L9.5 7.5L10.8 12L7 9.5L3.2 12L4.5 7.5L1 5H5.2L7 1Z"
                fill="#0ea5e9" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg tracking-widest text-white">KMHA</span>
          <span className="hidden sm:block text-xs" style={{ color: '#64748b', letterSpacing: '0.08em' }}>COMBINE</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                color: pathname === link.href ? '#0ea5e9' : '#94a3b8',
                background: pathname === link.href ? 'rgba(14,165,233,0.1)' : 'transparent',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="kmha-btn-ghost text-xs py-1.5 px-3">
          Sign Out
        </button>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap px-3 py-1 rounded text-xs font-medium"
            style={{
              color: pathname === link.href ? '#0ea5e9' : '#64748b',
              background: pathname === link.href ? 'rgba(14,165,233,0.1)' : 'transparent',
              fontFamily: 'var(--font-display)',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
