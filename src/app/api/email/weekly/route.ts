import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = getAdminClient()
  const lastMonday = new Date()
  lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6)
  lastMonday.setHours(0,0,0,0)
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastSunday.getDate() + 6)
  const { data: entries } = await admin.from('combine_entries').select('*').gte('created_at', lastMonday.toISOString()).lte('created_at', lastSunday.toISOString())
  const entryCount = entries?.length || 0
  const teamsCovered = new Set(entries?.map((e: any) => e.team) || []).size
  await admin.from('audit_log').insert({ action: 'EMAIL_SENT', table_name: 'system', details: { type: 'weekly_summary', entries: entryCount, teams: teamsCovered } })
  return NextResponse.json({ success: true, entryCount, teamsCovered })
}
