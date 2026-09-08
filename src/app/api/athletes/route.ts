import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Historical seasons must keep their full roster visible, including athletes
    // marked inactive after a later roster sync. Only pages that explicitly ask
    // for activeOnly=true should hide inactive rows.
    if (activeOnly) query = query.eq('active', true)

    return query
  }

  // First use the strict offseason/inseason split.
  const exact = await buildQuery('exact')
  if (exact.error) return NextResponse.json({ error: exact.error.message }, { status: 500 })
  if ((exact.data?.length || 0) > 0 || !rosterPhase || rosterPhase !== 'inseason') {
    return NextResponse.json(exact.data || [])
  }

  // Compatibility for rosters that were loaded before roster_phase was added.
  // Only the in-season branch gets this fallback, so offseason and in-season
  // remain separate. Once rosters are re-imported with roster_phase=inseason,
  // the strict query above wins automatically.
  const legacyNull = await buildQuery('legacy-null')
  if (legacyNull.error) return NextResponse.json({ error: legacyNull.error.message }, { status: 500 })
  if ((legacyNull.data?.length || 0) > 0) return NextResponse.json(legacyNull.data || [])

  const legacyEmpty = await buildQuery('legacy-empty')
  if (legacyEmpty.error) return NextResponse.json({ error: legacyEmpty.error.message }, { status: 500 })
  return NextResponse.json(legacyEmpty.data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('athletes').upsert(body).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
