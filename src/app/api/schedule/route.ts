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

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('combine_schedule')
    .select('*')
    .order('week_start')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()
  const { data, error } = await supabase
    .from('combine_schedule')
    .insert({
      week_start: body.week_start,
      test_type: body.test_type,
      notes: body.notes || null,
    })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = getAdminClient()
  const { error: auditError } = await admin.from('audit_log').insert({
    action: 'SCHEDULE_ADD',
    table_name: 'combine_schedule',
    user_email: user?.email || 'unknown',
    record_id: data?.[0]?.id || null,
    details: {
      week_start: body.week_start,
      test_type: body.test_type,
      notes: body.notes || null,
    },
  })
  if (auditError) console.error('Schedule audit failed:', auditError.message)

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('combine_schedule')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('combine_schedule').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = getAdminClient()
  const { error: auditError } = await admin.from('audit_log').insert({
    action: 'SCHEDULE_DELETE',
    table_name: 'combine_schedule',
    user_email: user?.email || 'unknown',
    record_id: id,
    details: {
      week_start: existing?.week_start,
      test_type: existing?.test_type,
      notes: existing?.notes || null,
    },
  })
  if (auditError) console.error('Schedule audit failed:', auditError.message)

  return NextResponse.json({ success: true })
}
