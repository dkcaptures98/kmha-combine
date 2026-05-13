import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')

  let query = supabase.from('combine_results').select('*').order('athlete_name')
  if (team) query = query.eq('team', team)
  if (season) query = query.eq('season', season)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()

  // Check if locked
  if (body.season) {
    const { data: lock } = await supabase
      .from('combine_schedule_lock')
      .select('locked')
      .eq('season', body.season)
      .single()
    if (lock?.locked) {
      // Only admins can override lock
      const admin = adminClient()
      const { data: perms } = await admin
        .from('user_permissions')
        .select('role')
        .eq('user_id', user?.id)
        .single()
      if (perms?.role !== 'admin' && perms?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Combine is locked. Contact your admin.' }, { status: 403 })
      }
    }
  }

  const { data, error } = await supabase
    .from('combine_results')
    .upsert(body, { onConflict: 'athlete_id,season' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  try {
    const admin = adminClient()
    await admin.from('audit_log').insert({
      action: 'COMBINE_ENTRY',
      table_name: 'combine_results',
      user_email: user?.email || 'unknown',
      details: { athlete: body.athlete_name, team: body.team, season: body.season }
    })
  } catch {}

  return NextResponse.json(data)
}
