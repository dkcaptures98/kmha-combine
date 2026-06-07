import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

function clean(v: unknown) { return String(v ?? '').replace(/^\uFEFF/, '').replace(/�/g, '').trim().replace(/^"|"$/g, '').trim() }
function displayName(v: string) { return clean(v).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"').replace(/[^a-zA-Z '\-]/g, '').replace(/\s+/g, ' ').trim().toUpperCase() }
function nameKey(v: string) { return displayName(v).replace(/[^A-Z]/g, '') }
function personKey(first: string, last: string) { return `${nameKey(first)}|${nameKey(last)}` }
function num(v: any) { const n = parseFloat(clean(v)); return Number.isFinite(n) ? n : null }
function intNum(v: any) { const n = parseInt(clean(v), 10); return Number.isFinite(n) ? n : null }
function parseFtIn(raw: any) {
  const s = clean(raw)
  if (!s) return { ft: null as number | null, inch: null as number | null }
  const quoteMatch = s.match(/^(\d+)\s*['’]\s*(\d+(?:\.\d+)?)?/) || s.match(/^(\d+)\s*ft\s*(\d+(?:\.\d+)?)?/i)
  if (quoteMatch) return { ft: intNum(quoteMatch[1]), inch: quoteMatch[2] ? num(quoteMatch[2]) : null }
  if (s.includes('.')) { const [ft, inch] = s.split('.'); return { ft: intNum(ft), inch: num(inch) } }
  return { ft: intNum(s), inch: null }
}
function hasAnyResult(payload: any) { return ['sprint','height_ft','height_in','wingspan_ft','wingspan_in','vertical','broad_jump_ft','broad_jump_in','chinup_hold','chinups','mile02_time','mile02_watts'].some(k => payload[k] !== null && payload[k] !== undefined && payload[k] !== '') }
function headerKey(v: any) { return clean(v).toLowerCase().replace(/[^a-z0-9]/g, '') }
function findHeaderRow(grid: any[][]) {
  for (let r = 0; r < Math.min(grid.length, 40); r++) {
    const keys = (grid[r] || []).map(headerKey)
    const hasFirst = keys.some(k => k === 'first' || k === 'firstname')
    const hasLast = keys.some(k => k === 'last' || k === 'lastname')
    const hasSprint = keys.some(k => k.includes('10m') || k.includes('sprint'))
    if (hasFirst && hasLast && hasSprint) return r
  }
  return -1
}
function findCol(keys: string[], patterns: (string | RegExp)[]) {
  return keys.findIndex(k => patterns.some(p => typeof p === 'string' ? k.includes(p) : p.test(k)))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const season = clean(body.season || '2026-2027')
    const rosterPhase = clean(body.roster_phase || body.rosterPhase || 'offseason').toLowerCase()
    const selectedTeam = clean(body.team || '')
    const dryRun = body.dryRun !== false
    const grid: any[][] = Array.isArray(body.grid) ? body.grid : []
    if (!selectedTeam) return NextResponse.json({ error: 'Team is required.' }, { status: 400 })
    if (!grid.length) return NextResponse.json({ error: 'No spreadsheet data found.' }, { status: 400 })

    const headerRowIndex = findHeaderRow(grid)
    if (headerRowIndex < 0) return NextResponse.json({ error: 'Could not find header row with First, Last, and 10 m Sprint.' }, { status: 400 })
    const headers = grid[headerRowIndex].map(headerKey)
    const firstCol = findCol(headers, ['firstname', 'first'])
    const lastCol = findCol(headers, ['lastname', 'last'])
    const teamCol = findCol(headers, ['team'])
    const sprintCol = findCol(headers, ['sprint', '10m'])
    const broadFtCol = findCol(headers, ['broadjumpft', 'broadft'])
    const broadInCol = findCol(headers, ['broadjumpin', 'broadin'])
    const broadCol = broadFtCol >= 0 ? -1 : findCol(headers, ['broadjump'])
    const chinHoldCol = findCol(headers, ['chinuphold', 'chinhold'])
    const chinupsCol = findCol(headers, ['chinups', 'chinup'])
    const verticalCol = findCol(headers, ['verticaljump', 'vertical'])
    const assaultTimeCol = findCol(headers, ['mile02time', '05kmasslttime', '05kmassaulttime', 'asslttime', 'assaulttime'])
    const assaultWattCol = findCol(headers, ['mile02watts', 'mile02watt', '05kmassltwatt', '05kmassaultwatt', 'assltwatt', 'assaultwatt', 'watt'])
    const heightFtCol = findCol(headers, ['heightft'])
    const heightInCol = findCol(headers, ['heightin'])
    const wingspanFtCol = findCol(headers, ['wingspanft'])
    const wingspanInCol = findCol(headers, ['wingspanin'])
    const heightCol = heightFtCol >= 0 ? -1 : findCol(headers, ['height'])
    const wingspanCol = wingspanFtCol >= 0 ? -1 : findCol(headers, ['wingspan'])

    if (firstCol < 0 || lastCol < 0) return NextResponse.json({ error: 'First and Last columns are required.' }, { status: 400 })

    const detectedRows: any[] = []
    const prepared: any[] = []
    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r] || []
      const first = displayName(row[firstCol] || '')
      const last = displayName(row[lastCol] || '')
      if (!first || !last || first === 'FIRST' || last === 'LAST') continue
      const rowTeam = teamCol >= 0 ? clean(row[teamCol]) : selectedTeam
      if (rowTeam && rowTeam !== selectedTeam) continue
      const broad = broadCol >= 0 ? parseFtIn(row[broadCol]) : { ft: broadFtCol >= 0 ? intNum(row[broadFtCol]) : null, inch: broadInCol >= 0 ? num(row[broadInCol]) : null }
      const height = heightCol >= 0 ? parseFtIn(row[heightCol]) : { ft: heightFtCol >= 0 ? intNum(row[heightFtCol]) : null, inch: heightInCol >= 0 ? num(row[heightInCol]) : null }
      const wingspan = wingspanCol >= 0 ? parseFtIn(row[wingspanCol]) : { ft: wingspanFtCol >= 0 ? intNum(row[wingspanFtCol]) : null, inch: wingspanInCol >= 0 ? num(row[wingspanInCol]) : null }
      const payload = {
        first_name: first,
        last_name: last,
        athlete_name: `${first} ${last}`,
        team: selectedTeam,
        season,
        roster_phase: rosterPhase,
        sprint: sprintCol >= 0 ? num(row[sprintCol]) : null,
        broad_jump_ft: broad.ft,
        broad_jump_in: broad.inch,
        chinup_hold: chinHoldCol >= 0 ? num(row[chinHoldCol]) : (chinupsCol >= 0 ? num(row[chinupsCol]) : null),
        vertical: verticalCol >= 0 ? num(row[verticalCol]) : null,
        mile02_time: assaultTimeCol >= 0 ? clean(row[assaultTimeCol] || '') || null : null,
        mile02_watts: assaultWattCol >= 0 ? intNum(row[assaultWattCol]) : null,
        height_ft: height.ft,
        height_in: height.inch,
        wingspan_ft: wingspan.ft,
        wingspan_in: wingspan.inch,
      }
      detectedRows.push(payload)
      if (hasAnyResult(payload)) prepared.push(payload)
    }

    const db = admin()
    const { data: athletes, error: athleteError } = await db.from('athletes').select('id, first_name, last_name, team, season, roster_phase').eq('season', season).eq('roster_phase', rosterPhase).eq('team', selectedTeam)
    if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })
    const athleteMap = new Map<string, any>()
    for (const a of athletes || []) athleteMap.set(personKey(a.first_name, a.last_name), a)

    const matched: any[] = []
    const missing: any[] = []
    const isOlder = !['U10AA','U10AAA','U11AA','U11AAA','U12AA','U12AAA'].includes(selectedTeam)
    for (const row of prepared) {
      const athlete = athleteMap.get(personKey(row.first_name, row.last_name))
      if (!athlete) { missing.push(row); continue }
      matched.push({
        id: `${athlete.id}-${season}-combine`,
        athlete_id: athlete.id,
        athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        team: selectedTeam,
        season,
        sprint: row.sprint,
        height_ft: row.height_ft,
        height_in: row.height_in,
        wingspan_ft: row.wingspan_ft,
        wingspan_in: row.wingspan_in,
        vertical: row.vertical,
        broad_jump_ft: row.broad_jump_ft,
        broad_jump_in: row.broad_jump_in,
        chinup_hold: isOlder ? null : row.chinup_hold,
        chinups: isOlder ? row.chinup_hold : null,
        mile02_time: row.mile02_time,
        mile02_watts: row.mile02_watts,
      })
    }
    const teamCounts = matched.reduce<Record<string, number>>((acc, row) => { acc[row.team] = (acc[row.team] || 0) + 1; return acc }, {})
    if (dryRun) return NextResponse.json({ dryRun: true, season, roster_phase: rosterPhase, teamsDetected: [selectedTeam], rowsWithNames: detectedRows.length, rowsWithResults: prepared.length, matched: matched.length, missing: missing.length, missingExamples: missing.slice(0, 30), readyToImport: matched.length, teamCounts })
    if (matched.length > 0) {
      const { error } = await db.from('combine_results').upsert(matched, { onConflict: 'athlete_id,season' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ dryRun: false, season, roster_phase: rosterPhase, imported: matched.length, skippedMissing: missing.length, teamCounts })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Combine import failed.' }, { status: 500 })
  }
}
