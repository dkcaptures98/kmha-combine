'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const supabase = createClient()
  const [message, setMessage] = useState('Processing link...')

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const { data } = await supabase.auth.getSession()

      if (data?.session) {
        window.location.href = '/set-password'
        return
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return

        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          window.location.href = '/set-password'
          return
        }
      })

      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession()

        if (retry?.session) {
          window.location.href = '/set-password'
        } else if (mounted) {
          setMessage('This link is invalid or expired.')
        }
      }, 1500)

      return () => sub.subscription.unsubscribe()
    }

    run()

    return () => {
      mounted = false
    }
  }, [supabase])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08111f', color: 'white' }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
        {message}
      </div>
    </div>
  )
}
