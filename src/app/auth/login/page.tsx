'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
type View = 'login' | 'forgot' | 'forgot-sent'
export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Invalid email or password.'); setLoading(false) }
    else { window.location.href = '/dashboard' }
  }
    })
    if (error) { setError(error.message); setMsLoading(false) }
  }
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` })
    setLoading(false); setView('forgot-sent')
  }
  if (!mounted) return null
  return (

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom:'16px' }}>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'12px', fontWeight:500, marginBottom:'8px', letterSpacing:'0.06em', textTransform:'uppercase' }}>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="coach@kmha.ca" style={{ width:'100%', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(59,130,246,0.25)', color:'white', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
                </div>
                <div style={{ marginBottom:'8px' }}>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'12px', fontWeight:500, marginBottom:'8px', letterSpacing:'0.06em', textTransform:'uppercase' }}>Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" style={{ width:'100%', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(59,130,246,0.25)', color:'white', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
                </div>
                <div style={{ textAlign:'right', marginBottom:'20px' }}>
                  <button type="button" onClick={()=>{ setView('forgot'); setError('') }} style={{ background:'none', border:'none', color:'#3b82f6', fontSize:'13px', cursor:'pointer', padding:0 }}>Forgot password?</button>
                </div>
                {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width:'100%', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'white', border:'none', borderRadius:'8px', padding:'12px', fontSize:'14px', fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, boxShadow:'0 4px 15px rgba(37,99,235,0.3)' }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
          {view === 'forgot' && (
            <>
              <button onClick={()=>setView('login')} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:'13px', marginBottom:'16px', padding:0 }}>← Back to login</button>
              <h2 style={{ color:'#e2e8f0', fontSize:'18px', fontWeight:600, margin:'0 0 8px' }}>Reset password</h2>
              <p style={{ color:'#64748b', fontSize:'13px', margin:'0 0 24px' }}>Enter your registered email and we'll send a reset link.</p>
              <form onSubmit={handleForgot}>
                <div style={{ marginBottom:'20px' }}>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'12px', fontWeight:500, marginBottom:'8px', letterSpacing:'0.06em', textTransform:'uppercase' }}>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="coach@kmha.ca" style={{ width:'100%', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(59,130,246,0.25)', color:'white', borderRadius:'8px', padding:'11px 14px', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
                </div>
                <button type="submit" disabled={loading} style={{ width:'100%', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'white', border:'none', borderRadius:'8px', padding:'12px', fontSize:'14px', fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
          {view === 'forgot-sent' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:'48px', marginBottom:'16px' }}>📧</div>
              <h2 style={{ color:'#e2e8f0', fontSize:'18px', fontWeight:600, margin:'0 0 8px' }}>Check your email</h2>
              <p style={{ color:'#64748b', fontSize:'14px', margin:'0 0 24px', lineHeight:1.6 }}>We sent a reset link to <strong style={{ color:'#94a3b8' }}>{email}</strong></p>
              <button onClick={()=>setView('login')} style={{ background:'linear-gradient(135deg,#1d4ed8,#2563eb)', color:'white', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>Back to Login</button>
            </div>
          )}
        </div>
        <p style={{ textAlign:'center', color:'#334155', fontSize:'12px', marginTop:'24px' }}>Kitchener Minor Hockey Association © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
