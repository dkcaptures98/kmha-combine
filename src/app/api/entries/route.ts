import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const athleteId = searchParams.get('athlete_id')

  let query = supabase.from('combine_entries').select('*').order('year').order('month')

  if (team) {
    const teams = team.split(',')
    if (teams.length === 1) query = query.eq('team', team)
    else query = query.in('team', teams)
  }
  if (year) query = query.eq('year', parseInt(year))
  if (month) {
    const months = month.split(',')
    if (months.length === 1) query = query.eq('month', month)
    else query = query.in('month', months)
  }
  if (athleteId) query = query.eq('athlete_id', athleteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()

  // Support bulk insert
  const entries = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase.from('combine_entries').upsert(entries).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('combine_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
