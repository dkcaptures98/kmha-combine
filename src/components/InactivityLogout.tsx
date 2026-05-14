// src/components/InactivityLogout.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export const DEFAULT_TIMEOUT_MINUTES = 30
export const setInactivityTimeout = (minutes: number) => {
  localStorage.setItem('kmha_inactivity_timeout_minutes', minutes.toString())
  window.dispatchEvent(new Event('inactivityTimeoutChange'))
}

export const getInactivityTimeout = () => {
  const stored = localStorage.getItem('kmha_inactivity_timeout_minutes')
  return stored ? parseInt(stored) : DEFAULT_TIMEOUT_MINUTES
}

// NEW: Disable toggle + user management
export const useInactivityManagement = () => {
  const [isDisabled, setIsDisabled] = useState(getInactivityTimeout() === 0)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    // Fetch users from Supabase
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at, last_sign_in_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    }
    fetchUsers()
    
    // Listen for changes
    const channel = supabase.channel('user-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(payload.new)
      })
      .subscribe()
    
    fetchUsers()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return { isDisabled, setIsDisabled, users }
}

// Helper type
interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
}
