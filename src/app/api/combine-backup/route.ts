import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  try {
    const admin = adminClient()
    const { data, error } = await admin
      .from('combine_results')
      .select('*')
      .order('season')
      .order('team')
      .order('athlete_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data || []
    if (!rows.length) {
      return new NextResponse('No Annual Combine data found.', { status: 404 })
    }

    // Use the union of every returned column so the backup remains lossless even
    // when the database schema gains fields that the UI does not yet know about.
    const preferred = [
      'id','athlete_id','athlete_name','team','season','roster_phase',
      'sprint','height_ft','height_in','wingspan_ft','wingspan_in','vertical',
      'broad_jump_ft','broad_jump_in','chinup_hold','chinups','mile02_time',
      'mile02_watts','notes','created_at','updated_at'
    ]
    const allKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
    const headers = [
      ...preferred.filter(key => allKeys.includes(key)),
      ...allKeys.filter(key => !preferred.includes(key)),
    ]

    const csv = [
      headers.map(csvCell).join(','),
      ...rows.map(row => headers.map(header => csvCell((row as Record<string, unknown>)[header])).join(',')),
    ].join('\r\n')

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="KMHA-Annual-Combine-FULL-BACKUP-${stamp}.csv"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Annual Combine backup failed.' },
      { status: 500 }
    )
  }
}
