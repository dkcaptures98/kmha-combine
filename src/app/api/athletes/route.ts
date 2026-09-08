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

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const rosterPhase = searchParams.get('roster_phase')
  const activeOnly = searchParams.get('activeOnly') === 'true'

  function buildQuery(phaseMode: 'exact' | 'legacy-null' | 'legacy-empty' = 'exact') {
    let query = supabase.from('athletes').select('*').order('last_name')

    if (team) query = query.eq('team', team)
    if (season) query = query.eq('season', season)

    if (rosterPhase) {
      if (phaseMode === 'exact') query = query.eq('roster_phase', rosterPhase)
      if (phaseMode === 'legacy-null') query = query.is('roster_phase', null)
      if (phaseMode === 'legacy-empty') query = query.eq('roster_phase', '')
    }

    if (activeOnly) query = query.eq('active', true)
    return query
  }

  // Always prefer the real roster for the exact phase.
  const exact = await buildQuery('exact')
  if (exact.error) return NextResponse.json({ error: exact.error.message }, { status: 500 })
  if ((exact.data?.length || 0) > 0 || !rosterPhase || rosterPhase !== 'inseason') {
    return NextResponse.json(exact.data || [])
  }

  // Compatibility with rosters created before roster_phase existed.
  const legacyNull = await buildQuery('legacy-null')
  if (legacyNull.error) return NextResponse.json({ error: legacyNull.error.message }, { status: 500 })
  if ((legacyNull.data?.length || 0) > 0) return NextResponse.json(legacyNull.data || [])

  const legacyEmpty = await buildQuery('legacy-empty')
  if (legacyEmpty.error) return NextResponse.json({ error: legacyEmpty.error.message }, { status: 500 })
  if ((legacyEmpty.data?.length || 0) > 0) return NextResponse.json(legacyEmpty.data || [])

  // If a 2026-27+ in-season roster has not been created yet, seed it from that
  // team's offseason roster. This applies to every team automatically and uses
  // NEW in-season athlete IDs, so offseason and in-season data remain separate.
  if (team && season) {
    let sourceQuery = supabase
      .from('athletes')
      .select('*')
      .eq('team', team)
      .eq('season', season)
      .eq('roster_phase', 'offseason')
      .order('last_name')

    if (activeOnly) sourceQuery = sourceQuery.eq('active', true)

    const { data: offseasonRows, error: offseasonError } = await sourceQuery
    if (offseasonError) return NextResponse.json({ error: offseasonError.message }, { status: 500 })

    if ((offseasonRows?.length || 0) > 0) {
      const seededRows = (offseasonRows || []).map((row: any) => ({
        id: makeInseasonId(season, team, row.first_name || '', row.last_name || ''),
        first_name: row.first_name,
        last_name: row.last_name,
        team,
        active: row.active !== false,
        season,
        roster_phase: 'inseason',
      }))

      const admin = getAdminClient()
      const { data: inserted, error: insertError } = await admin
        .from('athletes')
        .upsert(seededRows, { onConflict: 'id' })
        .select('*')

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

      const visibleRows = activeOnly
        ? (inserted || []).filter((row: any) => row.active !== false)
        : (inserted || [])

      visibleRows.sort((a: any, b: any) =>
        String(a.last_name || '').localeCompare(String(b.last_name || '')) ||
        String(a.first_name || '').localeCompare(String(b.first_name || ''))
      )

      return NextResponse.json(visibleRows)
    }
  }

  return NextResponse.json([])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('athletes').upsert(body).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
