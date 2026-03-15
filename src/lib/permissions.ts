import { createClient } from '@/lib/supabase/client'

export type UserRole = 'superadmin' | 'admin' | 'coach' | 'entry_only'

export interface UserPermissions {
  role: UserRole
  teams: string[] | null
}

// Only these emails can ever be superadmin - hardcoded, cannot be changed from UI
export const SUPERADMIN_EMAILS = ['d423kim@uwaterloo.ca']

let cachedPerms: UserPermissions | null = null
let cacheUserId: string | null = null

export async function getUserPermissions(): Promise<UserPermissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: 'coach', teams: null }

  // Superadmin is always hardcoded - cannot be assigned or removed
  if (SUPERADMIN_EMAILS.includes(user.email || '')) {
    return { role: 'superadmin', teams: null }
  }

  if (cacheUserId === user.id && cachedPerms) return cachedPerms

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
  cacheUserId = user.id
  return perms
}

export function clearPermissionsCache() {
  cachedPerms = null
  cacheUserId = null
}

export function canAccessDashboard(role: UserRole) {
  return role !== 'entry_only'
}

export function canAccessAdmin(role: UserRole) {
  return role === 'superadmin' || role === 'admin'
}

export function canManageUsers(role: UserRole) {
  return role === 'superadmin' || role === 'admin'
}

export function canEditUser(myRole: UserRole, targetRole: UserRole, targetEmail: string) {
  // Nobody can edit a superadmin
  if (SUPERADMIN_EMAILS.includes(targetEmail)) return false
  // Only superadmin can edit admins
  if (targetRole === 'admin' && myRole !== 'superadmin') return false
  return myRole === 'superadmin' || myRole === 'admin'
}
