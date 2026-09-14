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

function cleanBody(body: any) {
  return {
    first_name: String(body.first_name || '').trim(),
    last_name: String(body.last_name || '').trim(),
    team: String(body.team || '').trim(),
    season: String(body.season || '').trim(),
    roster_phase: String(body.roster_phase || '').trim().toLowerCase(),
    active: body.active !== false,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const admin = getAdminClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const rosterPhase = searchParams.get('roster_phase')
  const activeOnly = searchParams.get('activeOnly') === 'true'

  if (rosterPhase === 'inseason' && team && season) {
    let offseasonQuery = admin.from('athletes').select('*').eq('team', team).eq('season', season).eq('roster_phase', 'offseason').order('last_name')
    if (activeOnly) offseasonQuery = offseasonQuery.eq('active', true)

    let inseasonQuery = admin.from('athletes').select('*').eq('team', team).eq('season', season).eq('roster_phase', 'inseason').order('last_name')
    if (activeOnly) inseasonQuery = inseasonQuery.eq('active', true)

    const [offseasonResult, inseasonResult] = await Promise.all([offseasonQuery, inseasonQuery])
    if (offseasonResult.error) return NextResponse.json({ error: offseasonResult.error.message }, { status: 500 })
    if (inseasonResult.error) return NextResponse.json({ error: inseasonResult.error.message }, { status: 500 })

    const offseasonRows = offseasonResult.data || []
    let inseasonRows = inseasonResult.data || []

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
        const { error: insertError } = await admin.from('athletes').upsert(missingRows, { onConflict: 'id' })
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

        const refreshed = await admin.from('athletes').select('*').eq('team', team).eq('season', season).eq('roster_phase', 'inseason').order('last_name')
        if (refreshed.error) return NextResponse.json({ error: refreshed.error.message }, { status: 500 })
        inseasonRows = refreshed.data || []
      }
    }

    if (inseasonRows.length === 0) {
      let legacyNull = admin.from('athletes').select('*').eq('team', team).eq('season', season).is('roster_phase', null).order('last_name')
      if (activeOnly) legacyNull = legacyNull.eq('active', true)
      const legacyNullResult = await legacyNull
      if (legacyNullResult.error) return NextResponse.json({ error: legacyNullResult.error.message }, { status: 500 })
      if ((legacyNullResult.data?.length || 0) > 0) return NextResponse.json(legacyNullResult.data || [])

      let legacyEmpty = admin.from('athletes').select('*').eq('team', team).eq('season', season).eq('roster_phase', '').order('last_name')
      if (activeOnly) legacyEmpty = legacyEmpty.eq('active', true)
      const legacyEmptyResult = await legacyEmpty
      if (legacyEmptyResult.error) return NextResponse.json({ error: legacyEmptyResult.error.message }, { status: 500 })
      if ((legacyEmptyResult.data?.length || 0) > 0) return NextResponse.json(legacyEmptyResult.data || [])
    }

    const visibleRows = activeOnly ? inseasonRows.filter((row: any) => row.active !== false) : inseasonRows
    visibleRows.sort((a: any, b: any) => String(a.last_name || '').localeCompare(String(b.last_name || '')) || String(a.first_name || '').localeCompare(String(b.first_name || '')))
    return NextResponse.json(visibleRows)
  }

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
  const admin = getAdminClient()
  const body = await request.json()
  const row = cleanBody(body)

  if (!body.id || !row.first_name || !row.last_name || !row.team || !row.season || !['offseason','inseason'].includes(row.roster_phase)) {
    return NextResponse.json({ error: 'First name, last name, team, season, and roster phase are required.' }, { status: 400 })
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from('athletes')
    .select('id')
    .eq('first_name', row.first_name)
    .eq('last_name', row.last_name)
    .eq('team', row.team)
    .eq('season', row.season)
    .eq('roster_phase', row.roster_phase)
    .limit(1)

  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 })
  if ((duplicate || []).length > 0) return NextResponse.json({ error: 'That athlete already exists on this team and roster phase.' }, { status: 409 })

  const { data, error } = await admin.from('athletes').insert({ id: body.id, ...row }).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const admin = getAdminClient()
  const body = await request.json()
  const id = String(body.id || '').trim()
  const row = cleanBody(body)

  if (!id || !row.first_name || !row.last_name || !row.team || !row.season || !['offseason','inseason'].includes(row.roster_phase)) {
    return NextResponse.json({ error: 'Athlete id, first name, last name, team, season, and roster phase are required.' }, { status: 400 })
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from('athletes')
    .select('id')
    .eq('first_name', row.first_name)
    .eq('last_name', row.last_name)
    .eq('team', row.team)
    .eq('season', row.season)
    .eq('roster_phase', row.roster_phase)
    .neq('id', id)
    .limit(1)

  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 })
  if ((duplicate || []).length > 0) return NextResponse.json({ error: 'Another athlete record already has this same name, team, season, and roster phase.' }, { status: 409 })

  const { data, error } = await admin.from('athletes').update(row).eq('id', id).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Athlete not found.' }, { status: 404 })

  const athleteName = `${row.first_name} ${row.last_name}`
  await Promise.all([
    admin.from('combine_results').update({ athlete_name: athleteName, team: row.team }).eq('athlete_id', id),
    admin.from('combine_entries').update({ athlete_name: athleteName, team: row.team }).eq('athlete_id', id),
  ])

  return NextResponse.json(data[0])
}

export async function DELETE(request: Request) {
  const admin = getAdminClient()
  const { searchParams } = new URL(request.url)
  const id = String(searchParams.get('id') || '').trim()
  if (!id) return NextResponse.json({ error: 'Athlete id is required.' }, { status: 400 })

  const [combineResults, combineEntries, attendance] = await Promise.all([
    admin.from('combine_results').select('athlete_id', { count: 'exact', head: true }).eq('athlete_id', id),
    admin.from('combine_entries').select('athlete_id', { count: 'exact', head: true }).eq('athlete_id', id),
    admin.from('attendance').select('athlete_id', { count: 'exact', head: true }).eq('athlete_id', id),
  ])

  const linked = (combineResults.count || 0) + (combineEntries.count || 0) + (attendance.count || 0)
  if (linked > 0) {
    return NextResponse.json({ error: `This athlete has ${linked} linked record(s). Set the athlete inactive instead of deleting so historical data is preserved.` }, { status: 409 })
  }

  const { error } = await admin.from('athletes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true, id })
}
