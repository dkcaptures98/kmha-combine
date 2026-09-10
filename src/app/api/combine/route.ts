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
const GET_CACHE_TTL_MS = 10000
const getCache = new Map<string, { expires: number; data: any[] }>()

async function auditIdentity() {
  // Do not call Supabase Auth on every save during a live event. The validated
  // audit cookie is enough for attribution and avoids extra pressure on Auth.
  const cookieStore = await cookies()
  return cookieStore.get('kmha_audit_identity')?.value || null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const cacheKey = `${team || '*'}|${season || '*'}`
  const cached = getCache.get(cacheKey)

  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'private, max-age=0, s-maxage=10, stale-while-revalidate=20' },
    })
  }

  const admin = adminClient()
  let query = admin.from('combine_results').select('*').order('athlete_name')
  if (team) query = query.eq('team', team)
  if (season) query = query.eq('season', season)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  getCache.set(cacheKey, { expires: Date.now() + GET_CACHE_TTL_MS, data: rows })
  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'private, max-age=0, s-maxage=10, stale-while-revalidate=20' },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.athlete_id) return NextResponse.json({ error: 'athlete_id is required.' }, { status: 400 })
    if (!body.season) return NextResponse.json({ error: 'season is required.' }, { status: 400 })

    const userIdentity = await auditIdentity()
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

    // Any successful write invalidates the small server cache so the next read
    // refreshes from Supabase without every device hammering the database.
    getCache.clear()

    const changedFields = Object.keys(body).filter(key => !META_FIELDS.has(key))
    const changedValues: Record<string, any> = {}
    for (const field of changedFields) changedValues[field] = body[field]

    const { error: auditError } = await admin.from('audit_log').insert({
      action: 'COMBINE_ENTRY',
      table_name: 'combine_results',
      user_email: userIdentity || 'unverified-session',
      record_id: body.athlete_id,
      details: {
        athlete: payload.athlete_name,
        team: payload.team,
        season: payload.season,
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
