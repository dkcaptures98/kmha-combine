import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const META_FIELDS = new Set(['id','athlete_id','athlete_name','team','season','created_at','updated_at'])

async function authenticatedIdentity(request: Request) {
  const supabase = await createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) return cookieUser.email || cookieUser.id

  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const admin = adminClient()
      const { data, error } = await admin.auth.getUser(token)
      if (!error && data.user) return data.user.email || data.user.id
    }
  }

  const cookieStore = await cookies()
  return cookieStore.get('kmha_audit_identity')?.value || null
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const rosterPhase = searchParams.get('roster_phase')

  let query = supabase.from('combine_results').select('*').order('athlete_name')
  if (team) query = query.eq('team', team)
  if (season) query = query.eq('season', season)
  if (rosterPhase) query = query.eq('roster_phase', rosterPhase)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.athlete_id) return NextResponse.json({ error: 'athlete_id is required.' }, { status: 400 })
    if (!body.season) return NextResponse.json({ error: 'season is required.' }, { status: 400 })

    const userIdentity = await authenticatedIdentity(request)
    const admin = adminClient()

    // The Sept 14 Annual Combine client does not send roster_phase in each
    // field save. Resolve it from the athlete row so inseason/offseason data
    // remains separated without relying on the old 2-column ON CONFLICT rule.
    let rosterPhase = body.roster_phase as string | undefined
    if (!rosterPhase) {
      const { data: athlete, error: athleteError } = await admin
        .from('athletes')
        .select('roster_phase')
        .eq('id', body.athlete_id)
        .maybeSingle()

      if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })
      rosterPhase = athlete?.roster_phase || undefined
    }

    if (!rosterPhase || !['offseason', 'inseason'].includes(rosterPhase)) {
      return NextResponse.json({ error: 'Could not determine offseason/inseason roster phase for this athlete.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await admin
      .from('combine_results')
      .select('*')
      .eq('athlete_id', body.athlete_id)
      .eq('season', body.season)
      .eq('roster_phase', rosterPhase)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const changedPayload = {
      ...body,
      athlete_name: body.athlete_name || existing?.athlete_name || '',
      team: body.team || existing?.team || '',
      season: body.season,
      roster_phase: rosterPhase,
      updated_at: new Date().toISOString(),
    }

    let data: any[] | null = null
    let error: any = null

    if (existing?.id) {
      const result = await admin
        .from('combine_results')
        .update(changedPayload)
        .eq('id', existing.id)
        .select()
      data = result.data
      error = result.error
    } else {
      const result = await admin
        .from('combine_results')
        .insert(changedPayload)
        .select()
      data = result.data
      error = result.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const changedFields = Object.keys(body).filter(key => !META_FIELDS.has(key))
    const changedValues: Record<string, any> = {}
    for (const field of changedFields) changedValues[field] = body[field]

    const { error: auditError } = await admin.from('audit_log').insert({
      action: 'COMBINE_ENTRY',
      table_name: 'combine_results',
      user_email: userIdentity || 'unverified-session',
      record_id: body.athlete_id,
      details: {
        athlete: changedPayload.athlete_name,
        team: changedPayload.team,
        season: changedPayload.season,
        roster_phase: rosterPhase,
        changed_fields: changedFields,
        values: changedValues,
        identity_verified: Boolean(userIdentity),
      },
    })

    if (auditError) console.error('Audit insert failed:', auditError.message)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Combine save failed.' },
      { status: 500 }
    )
  }
}
