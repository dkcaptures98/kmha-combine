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
  try {
    const body = await request.json()

    if (!body.athlete_id) {
      return NextResponse.json({ error: 'athlete_id is required.' }, { status: 400 })
    }

    if (!body.season) {
      return NextResponse.json({ error: 'season is required.' }, { status: 400 })
    }

    const admin = adminClient()

    const payload = {
      ...body,
      athlete_name: body.athlete_name || '',
      team: body.team || '',
      season: body.season,
    }

    const { data, error } = await admin
      .from('combine_results')
      .upsert(payload, { onConflict: 'athlete_id,season' })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await admin.from('audit_log').insert({
        action: 'COMBINE_ENTRY',
        table_name: 'combine_results',
        user_email: 'combine-event-entry',
        details: {
          athlete: payload.athlete_name,
          team: payload.team,
          season: payload.season,
          emergency_save: true,
        },
      })
    } catch {}

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Combine save failed.' },
      { status: 500 }
    )
  }
}
