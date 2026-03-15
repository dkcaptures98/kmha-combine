import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.users)
}

export async function POST(request: Request) {
  const { email } = await request.json()
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://kmha-combine.vercel.app/auth/reset-password'
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
