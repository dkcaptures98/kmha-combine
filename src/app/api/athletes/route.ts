import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function makeInseasonId(season: string, team: string, firstName: string, lastName: string) {
  return `${season}-inseason-${team}-${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function athleteKey(row: any) {
  return `${String(row.first_name || '').trim().toLowerCase()}|${String(row.last_name || '').trim().toLowerCase()}`
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const admin = getAdminClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const rosterPhase = searchParams.get('roster_phase')
  const activeOnly = searchParams.get('activeOnly') === 'true'

  // In-season must always contain at least the same athletes as the offseason
  // roster for the same team/season. Use the service-role client here so RLS
  // cannot hide the source offseason roster from the sync.
  if (rosterPhase === 'inseason' && team && season) {
    let offseasonQuery = admin
      .from('athletes')
      .select('*')
      .eq('team', team)
      .eq('season', season)
      .eq('roster_phase', 'offseason')
      .order('last_name')

    if (activeOnly) offseasonQuery = offseasonQuery.eq('active', true)

    let inseasonQuery = admin
      .from('athletes')
      .select('*')
      .eq('team', team)
      .eq('season', season)
      .eq('roster_phase', 'inseason')
      .order('last_name')

    if (activeOnly) inseasonQuery = inseasonQuery.eq('active', true)

    const [offseasonResult, inseasonResult] = await Promise.all([offseasonQuery, inseasonQuery])

    if (offseasonResult.error) {
      return NextResponse.json({ error: offseasonResult.error.message }, { status: 500 })
    }
    if (inseasonResult.error) {
      return NextResponse.json({ error: inseasonResult.error.message }, { status: 500 })
    }

    const offseasonRows = offseasonResult.data || []
    let inseasonRows = inseasonResult.data || []

    // Backfill every offseason athlete that is missing from in-season. Match by
    // name rather than ID because imported in-season rosters may use different IDs.
    if (offseasonRows.length > 0) {
      const existingNames = new Set(inseasonRows.map(athleteKey))
      const missingRows = offseasonRows
        .filter(row => !existingNames.has(athleteKey(row)))
        .map((row: any) => ({
          id: makeInseasonId(season, team, row.first_name || '', row.last_name || ''),
          first_name: row.first_name,
          last_name: row.last_name,
          team,
          active: row.active !== false,
          season,
          roster_phase: 'inseason',
        }))

      if (missingRows.length > 0) {
        const { error: insertError } = await admin
          .from('athletes')
          .upsert(missingRows, { onConflict: 'id' })

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        const refreshed = await admin
          .from('athletes')
          .select('*')
          .eq('team', team)
          .eq('season', season)
          .eq('roster_phase', 'inseason')
          .order('last_name')

        if (refreshed.error) {
          return NextResponse.json({ error: refreshed.error.message }, { status: 500 })
        }
        inseasonRows = refreshed.data || []
      }
    }

    // Legacy compatibility only when there is still no real in-season roster.
    if (inseasonRows.length === 0) {
      let legacyNull = admin
        .from('athletes')
        .select('*')
        .eq('team', team)
        .eq('season', season)
        .is('roster_phase', null)
        .order('last_name')
      if (activeOnly) legacyNull = legacyNull.eq('active', true)
      const legacyNullResult = await legacyNull
      if (legacyNullResult.error) return NextResponse.json({ error: legacyNullResult.error.message }, { status: 500 })
      if ((legacyNullResult.data?.length || 0) > 0) return NextResponse.json(legacyNullResult.data || [])

      let legacyEmpty = admin
        .from('athletes')
        .select('*')
        .eq('team', team)
        .eq('season', season)
        .eq('roster_phase', '')
        .order('last_name')
      if (activeOnly) legacyEmpty = legacyEmpty.eq('active', true)
      const legacyEmptyResult = await legacyEmpty
      if (legacyEmptyResult.error) return NextResponse.json({ error: legacyEmptyResult.error.message }, { status: 500 })
      if ((legacyEmptyResult.data?.length || 0) > 0) return NextResponse.json(legacyEmptyResult.data || [])
    }

    const visibleRows = activeOnly
      ? inseasonRows.filter((row: any) => row.active !== false)
      : inseasonRows

    visibleRows.sort((a: any, b: any) =>
      String(a.last_name || '').localeCompare(String(b.last_name || '')) ||
      String(a.first_name || '').localeCompare(String(b.first_name || ''))
    )

    return NextResponse.json(visibleRows)
  }

  // Normal roster requests keep the existing authenticated/RLS behaviour.
  let query = supabase.from('athletes').select('*').order('last_name')
  if (team) query = query.eq('team', team)
  if (season) query = query.eq('season', season)
  if (rosterPhase) query = query.eq('roster_phase', rosterPhase)
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('athletes').upsert(body).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
