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

function todayTorontoDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function normalizeRole(role?: string | null) {
  if (!role) return 'data_entry'

  const normalized = role.toLowerCase()

  if (normalized === 'coach') return 'data_entry'
  if (normalized === 'editor') return 'data_entry'
  if (normalized === 'entry_only') return 'data_entry'
  if (normalized === 'superadmin') return 'super_admin'

  return normalized
}

function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'super_admin'
}

export async function GET(request: Request) {
  const supabase = await createClient()
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.season) {
    return NextResponse.json({ error: 'Season is required.' }, { status: 400 })
  }

  const admin = adminClient()

  const { data: perms } = await admin
    .from('user_permissions')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = normalizeRole(perms?.role)
  const isAdmin = isAdminRole(role)

  const { data: lock, error: lockError } = await admin
    .from('combine_schedule_lock')
    .select('locked, combine_date')
    .eq('season', body.season)
    .single()

  if (lockError && lockError.code !== 'PGRST116') {
    return NextResponse.json({ error: lockError.message }, { status: 500 })
  }

  if (!isAdmin) {
    if (lock?.locked) {
      return NextResponse.json(
        { error: 'Annual combine entry is locked. Contact your admin.' },
        { status: 403 }
      )
    }

    if (!lock?.combine_date) {
      return NextResponse.json(
        { error: 'Annual combine entry is locked. No annual combine date is scheduled.' },
        { status: 403 }
      )
    }

    const today = todayTorontoDateString()

    if (lock.combine_date !== today) {
      return NextResponse.json(
        {
          error: `Annual combine entry is locked. Entry is only allowed on the scheduled combine date (${lock.combine_date}). Today is ${today}.`,
        },
        { status: 403 }
      )
    }
  }

  const { data, error } = await supabase
    .from('combine_results')
    .upsert(body, { onConflict: 'athlete_id,season' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await admin.from('audit_log').insert({
      action: 'COMBINE_ENTRY',
      table_name: 'combine_results',
      user_email: user.email || 'unknown',
      details: {
        athlete: body.athlete_name,
        team: body.team,
        season: body.season,
        role,
        combine_date: lock?.combine_date || null,
      },
    })
  } catch {}

  return NextResponse.json(data)
}
