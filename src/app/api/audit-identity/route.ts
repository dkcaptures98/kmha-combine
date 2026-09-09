import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing authentication token.' }, { status: 401 })
  }

  const token = authHeader.slice(7).trim()
  const admin = adminClient()
  const { data, error } = await admin.auth.getUser(token)

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 })
  }

  const identity = data.user.email || data.user.id
  const cookieStore = await cookies()
  cookieStore.set('kmha_audit_identity', identity, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  return NextResponse.json({ success: true, user: identity })
}
