import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const season = searchParams.get('season')
  const rosterPhase = searchParams.get('roster_phase')
  const activeOnly = searchParams.get('activeOnly') === 'true'

  let query = supabase.from('athletes').select('*').order('last_name')

  if (team) query = query.eq('team', team)
  if (season) query = query.eq('season', season)
  if (rosterPhase) query = query.eq('roster_phase', rosterPhase)

  // Historical seasons must keep their full roster visible, including athletes
  // marked inactive after a later roster sync. Only pages that explicitly ask
  // for activeOnly=true should hide inactive rows.
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('athletes').upsert(body).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
