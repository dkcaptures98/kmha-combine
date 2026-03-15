import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function logAudit(action: string, details: any, userEmail?: string) {
  try {
    const admin = getAdminClient()
    await admin.from('audit_log').insert({ action, table_name: 'users', user_email: userEmail, details })
  } catch (e) {}
}

export async function GET() {
  const admin = getAdminClient()
  const { data: usersData, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: perms } = await admin.from('user_permissions').select('*')
  const users = usersData.users.map(u => ({
    id: u.id, email: u.email, created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at, email_confirmed_at: u.email_confirmed_at,
    teams: perms?.find((p: any) => p.user_id === u.id)?.teams || null,
    role: perms?.find((p: any) => p.user_id === u.id)?.role || 'coach',
  }))
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { email } = await request.json()
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://kmha-combine.vercel.app/auth/reset-password'
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit('INVITE', { invited_email: email }, user?.email)
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { user_id, teams, role } = await request.json()
  const admin = getAdminClient()
  const { error } = await admin.from('user_permissions').upsert(
    { user_id, teams: teams?.length ? teams : null, role: role || 'coach' },
    { onConflict: 'user_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit('UPDATE_PERMISSIONS', { target_user_id: user_id, role, teams }, user?.email)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  const admin = getAdminClient()
  // Get email before deleting
  const { data: targetUser } = await admin.auth.admin.getUserById(userId)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit('DELETE_USER', { deleted_email: targetUser.user?.email }, user?.email)
  return NextResponse.json({ success: true })
}
