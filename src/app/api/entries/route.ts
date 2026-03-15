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

async function logAudit(action: string, details: any, userEmail?: string) {
  try {
    const admin = getAdminClient()
    await admin.from('audit_log').insert({
      action,
      table_name: 'combine_entries',
      user_email: userEmail || 'unknown',
      details,
    })
  } catch (e) {
    // Don't fail the request if audit logging fails
  }
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const athleteId = searchParams.get('athlete_id')

  let query = supabase.from('combine_entries').select('*').order('year').order('month').limit(10000)

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
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()
  const entries = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase.from('combine_entries').upsert(entries).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log each entry
  for (const entry of entries) {
    await logAudit('INSERT', {
      athlete: entry.athlete_name,
      team: entry.team,
      test: entry.test_type,
      score: entry.score,
      month: entry.month,
      year: entry.year,
    }, user?.email)
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Get the entry before deleting so we can log it
  const { data: entry } = await supabase.from('combine_entries').select('*').eq('id', id).single()

  const { error } = await supabase.from('combine_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('DELETE', {
    athlete: entry?.athlete_name,
    team: entry?.team,
    test: entry?.test_type,
    score: entry?.score,
    month: entry?.month,
    year: entry?.year,
  }, user?.email)

  return NextResponse.json({ success: true })
}
