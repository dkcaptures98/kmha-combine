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

function normalizeRole(role?: string | null) {
  if (!role) return 'data_entry'

  const normalized = role.toLowerCase()

  if (normalized === 'coach') return 'data_entry'
  if (normalized === 'editor') return 'data_entry'
  if (normalized === 'entry_only') return 'data_entry'
  if (normalized === 'superadmin') return 'super_admin'

  return normalized
}

function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'super_admin'
}

function normalizeTest(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function getTorontoNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const day = Number(parts.find(p => p.type === 'day')?.value)

  return new Date(Date.UTC(year, month - 1, day))
}

function getCurrentWeekStartToronto() {
  const today = getTorontoNow()
  const day = today.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  today.setUTCDate(today.getUTCDate() + diffToMonday)

  return today.toISOString().slice(0, 10)
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
  } catch {}
}

async function getUserRole(userId: string) {
  const admin = getAdminClient()

  const { data } = await admin
    .from('user_permissions')
    .select('role')
    .eq('user_id', userId)
    .single()

  return normalizeRole(data?.role)
}

async function assertEntryAllowedForUser(userId: string, entries: any[]) {
  const role = await getUserRole(userId)

  if (isAdminRole(role)) {
    return { allowed: true, role }
  }

  const currentWeekStart = getCurrentWeekStartToronto()
  const admin = getAdminClient()

  const { data: scheduledRows, error } = await admin
    .from('combine_schedule')
    .select('week_start,test_type')
    .eq('week_start', currentWeekStart)

  if (error) {
    return {
      allowed: false,
      role,
      error: error.message,
      status: 500,
    }
  }

  if (!scheduledRows || scheduledRows.length === 0) {
    return {
      allowed: false,
      role,
      error: `Data entry is locked. No testing is scheduled for this week (${currentWeekStart}).`,
      status: 403,
    }
  }

  const allowedTests = new Set(
    scheduledRows
      .map(row => normalizeTest(row.test_type))
      .filter(Boolean)
  )

  for (const entry of entries) {
    const entryTest = normalizeTest(entry.test_type)

    if (!allowedTests.has(entryTest)) {
      return {
        allowed: false,
        role,
        error: `${entry.test_type || 'This test'} is locked. Only scheduled tests can be entered this week.`,
        status: 403,
      }
    }
  }

  return { allowed: true, role }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const athleteId = searchParams.get('athlete_id')

  let query = supabase
    .from('combine_entries')
    .select('*')
    .order('year')
    .order('month')
    .limit(10000)

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const body = await request.json()
  const entries = Array.isArray(body) ? body : [body]

  const permission = await assertEntryAllowedForUser(user.id, entries)

  if (!permission.allowed) {
    return NextResponse.json(
      { error: permission.error || 'Data entry is locked.' },
      { status: permission.status || 403 }
    )
  }

  const { data, error } = await supabase
    .from('combine_entries')
    .upsert(entries)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const entry of entries) {
    await logAudit(
      'INSERT',
      {
        athlete: entry.athlete_name,
        team: entry.team,
        test: entry.test_type,
        score: entry.score,
        month: entry.month,
        year: entry.year,
        role: permission.role,
      },
      user.email || undefined
    )
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const role = await getUserRole(user.id)

  if (!isAdminRole(role)) {
    return NextResponse.json(
      { error: 'Only Admin or Super Admin can delete entries.' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: entry } = await supabase
    .from('combine_entries')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('combine_entries')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(
    'DELETE',
    {
      athlete: entry?.athlete_name,
      team: entry?.team,
      test: entry?.test_type,
      score: entry?.score,
      month: entry?.month,
      year: entry?.year,
      role,
    },
    user.email || undefined
  )

  return NextResponse.json({ success: true })
}
