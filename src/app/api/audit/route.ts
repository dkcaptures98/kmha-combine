import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SUPERADMIN_EMAILS } from '@/lib/permissions'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function normalizeRole(role?: string | null) {
  if (!role) return ''
  const normalized = role.toLowerCase()
  if (normalized === 'superadmin') return 'super_admin'
  return normalized
}

async function canViewAudit(user: { id: string; email?: string | null }) {
  const email = (user.email || '').toLowerCase()
  if (SUPERADMIN_EMAILS.some(e => e.toLowerCase() === email)) return true

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('user_permissions')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return false
  const role = normalizeRole(data?.role)
  return role === 'admin' || role === 'super_admin'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!(await canViewAudit(user))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const requestedLimit = parseInt(searchParams.get('limit') || '100', 10)
  const requestedOffset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0

  const admin = getAdminClient()
  const { data, error, count } = await admin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data || [], total: count || 0 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const admin = getAdminClient()
  const { error } = await admin.from('audit_log').insert({
    ...body,
    user_email: body.user_email || user.email || 'unknown',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
