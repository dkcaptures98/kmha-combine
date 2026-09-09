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

const META_FIELDS = new Set(['id','athlete_id','athlete_name','team','season','created_at','updated_at'])

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
    if (!body.athlete_id) return NextResponse.json({ error: 'athlete_id is required.' }, { status: 400 })
    if (!body.season) return NextResponse.json({ error: 'season is required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const changedFields = Object.keys(body).filter(key => !META_FIELDS.has(key))
    const changedValues: Record<string, any> = {}
    for (const field of changedFields) changedValues[field] = body[field]

    const { error: auditError } = await admin.from('audit_log').insert({
      action: 'COMBINE_ENTRY',
      table_name: 'combine_results',
      user_email: user?.email || 'unknown',
      record_id: body.athlete_id,
      details: {
        athlete: payload.athlete_name,
        team: payload.team,
        season: payload.season,
        changed_fields: changedFields,
        values: changedValues,
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
