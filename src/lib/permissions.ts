import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'coach' | 'entry_only'

export interface UserPermissions {
  role: UserRole
  teams: string[] | null // null = all teams
}

let cachedPerms: UserPermissions | null = null
let cacheEmail: string | null = null

export const ADMIN_EMAILS = ['d423kim@uwaterloo.ca']

export async function getUserPermissions(): Promise<UserPermissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: 'coach', teams: null }

  // Admins always have full access
  if (ADMIN_EMAILS.includes(user.email || '')) {
    return { role: 'admin', teams: null }
  }

  // Use cache
  if (cacheEmail === user.email && cachedPerms) return cachedPerms

  const { data } = await supabase
    .from('user_permissions')
    .select('role, teams')
    .eq('user_id', user.id)
    .single()

  const perms: UserPermissions = {
    role: (data?.role as UserRole) || 'coach',
    teams: data?.teams || null,
  }

  cachedPerms = perms
  cacheEmail = user.email || null
  return perms
}

export function clearPermissionsCache() {
  cachedPerms = null
  cacheEmail = null
}
