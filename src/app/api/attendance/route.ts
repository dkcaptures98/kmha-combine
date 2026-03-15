import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('week_start')
  const team = searchParams.get('team')

  let query = supabase.from('attendance').select('*, athletes(first_name, last_name, team)')
  if (weekStart) query = query.eq('week_start', weekStart)
  if (team) query = query.eq('athletes.team', team)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('attendance')
    .upsert(body, { onConflict: 'athlete_id,week_start' })
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
