import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

function parseDateHeader(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v)
    return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null
  }
  const s = String(v ?? '').trim()
  if (!s || /^(first|last|total|perc\.?|percentage)$/i.test(s)) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
function seasonFromDates(dates: Date[]) {
  const d = dates[dates.length - 1]
  const y = d.getUTCFullYear()
  return d.getUTCMonth() + 1 >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get('athlete_id')
  const season = searchParams.get('season')
  const team = searchParams.get('team')

  let q = supabase.from('attendance_imports').select('*').order('updated_at', { ascending: false })
  if (athleteId) q = q.eq('athlete_id', athleteId)
  if (season) q = q.eq('season', season)
  if (team) q = q.eq('team', team)
  let { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Annual report-card URLs use a generated/seasonal athlete id, while TeamBuildr
  // attendance is stored against the canonical athletes-table id. If the direct
  // lookup misses, resolve the report id by athlete name + team and return that
  // athlete's attendance record.
  if (athleteId && (!data || !data.length)) {
    let aq = supabase.from('attendance_imports').select('*').order('updated_at', { ascending: false })
    if (season) aq = aq.eq('season', season)
    if (team) aq = aq.eq('team', team)
    const allAttendance = await aq
    if (allAttendance.error) return NextResponse.json({ error: allAttendance.error.message }, { status: 500 })

    const rows = allAttendance.data ?? []
    if (rows.length) {
      const ids = [...new Set(rows.map(r => String(r.athlete_id)).filter(Boolean))]
      const athletesResult = await supabase.from('athletes').select('id,first_name,last_name,team').in('id', ids)
      if (athletesResult.error) return NextResponse.json({ error: athletesResult.error.message }, { status: 500 })
      const reportKey = norm(athleteId)
      const athlete = (athletesResult.data ?? []).find(a => {
        const nameKey = norm(`${a.first_name}${a.last_name}`)
        const teamKey = norm(a.team)
        return !!nameKey && reportKey.endsWith(nameKey) && (!teamKey || reportKey.includes(teamKey))
      })
      if (athlete) data = rows.filter(r => String(r.athlete_id) === String(athlete.id))
    }
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const form = await request.formData()
  const file = form.get('file') as File | null
  const team = String(form.get('team') ?? '').trim()
  const preview = String(form.get('preview') ?? '') === '1'
  if (!file || !team) return NextResponse.json({ error: 'Team and Excel file are required.' }, { status: 400 })

  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })
  if (rows.length < 2) return NextResponse.json({ error: 'The workbook has no attendance rows.' }, { status: 400 })

  const headers = rows[0]
  const firstIdx = headers.findIndex(h => /^first$/i.test(String(h ?? '').trim()))
  const lastIdx = headers.findIndex(h => /^last$/i.test(String(h ?? '').trim()))
  if (firstIdx < 0 || lastIdx < 0) return NextResponse.json({ error: 'Could not find First and Last columns.' }, { status: 400 })

  const dateCols = headers.map((h, i) => ({ i, d: parseDateHeader(h) })).filter((x): x is {i:number;d:Date} => !!x.d).sort((a,b)=>a.d.getTime()-b.d.getTime())
  if (!dateCols.length) return NextResponse.json({ error: 'No session-date columns were detected.' }, { status: 400 })
  const season = seasonFromDates(dateCols.map(x=>x.d))

  const { data: athletes, error: athleteError } = await supabase.from('athletes').select('id,first_name,last_name,team').eq('team', team)
  if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })
  const roster = new Map((athletes ?? []).map(a => [`${norm(a.first_name)}|${norm(a.last_name)}`, a]))

  const matched: any[] = [], unmatched: string[] = []
  for (const row of rows.slice(1)) {
    const first = String(row[firstIdx] ?? '').trim(), last = String(row[lastIdx] ?? '').trim()
    if (!first && !last) continue
    const athlete = roster.get(`${norm(first)}|${norm(last)}`)
    if (!athlete) { unmatched.push(`${first} ${last}`.trim()); continue }
    const sessionData: Record<string, number> = {}
    let rawAttended = 0
    for (const c of dateCols) {
      const val = row[c.i]
      const attended = val === 1 || val === '1' || String(val ?? '').trim().toLowerCase() === 'yes' ? 1 : 0
      sessionData[iso(c.d)] = attended
      rawAttended += attended
    }
    const total = dateCols.length
    const bonus = Math.ceil(total * 0.07)
    const adjusted = Math.min(total, rawAttended + bonus)
    matched.push({ athlete_id: athlete.id, athlete_name: `${athlete.first_name} ${athlete.last_name}`, team, season, first_session: iso(dateCols[0].d), last_session: iso(dateCols[dateCols.length-1].d), raw_attended: rawAttended, total_sessions: total, bonus_sessions: bonus, adjusted_attended: adjusted, adjusted_percentage: total ? Number((adjusted / total * 100).toFixed(1)) : 0, session_data: sessionData, source_filename: file.name, updated_at: new Date().toISOString() })
  }

  if (!preview && matched.length) {
    const payload = matched.map(({ athlete_name, ...r }) => r)
    const { error } = await supabase.from('attendance_imports').upsert(payload, { onConflict: 'athlete_id,season' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ team, season, first_session: iso(dateCols[0].d), last_session: iso(dateCols[dateCols.length-1].d), total_sessions: dateCols.length, bonus_sessions: Math.ceil(dateCols.length * 0.07), matched, unmatched, saved: !preview })
}
