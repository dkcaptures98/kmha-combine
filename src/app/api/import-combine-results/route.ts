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
    const hasLong = keys.some(k => k === 'test') && keys.some(k => k === 'score')
    const hasWide = keys.some(k => k.includes('10m') || k.includes('sprint'))
    if (hasFirst && hasLast && (hasLong || hasWide)) return r
  }
  return -1
}
function findCol(keys: string[], patterns: (string | RegExp)[]) {
  return keys.findIndex(k => patterns.some(p => typeof p === 'string' ? k.includes(p) : p.test(k)))
}
function emptyCombineRow(athlete: any, selectedTeam: string, season: string) {
  return {
    id: `${athlete.id}-${season}-combine`, athlete_id: athlete.id, athlete_name: `${athlete.first_name} ${athlete.last_name}`,
    team: selectedTeam, season, sprint: null, height_ft: null, height_in: null, wingspan_ft: null, wingspan_in: null,
    vertical: null, broad_jump_ft: null, broad_jump_in: null, chinup_hold: null, chinups: null, mile02_time: null, mile02_watts: null,
  }
}
function applyTest(out: any, testRaw: any, scoreRaw: any, isOlder: boolean) {
  const test = headerKey(testRaw)
  const score = clean(scoreRaw)
  if (!score) return false
  if (test.includes('10m') || test.includes('sprint')) { out.sprint = num(score); return true }
  if (test.includes('broad')) { const b = parseFtIn(score); out.broad_jump_ft = b.ft; out.broad_jump_in = b.inch; return true }
  if (test.includes('vertical')) { out.vertical = num(score); return true }
  if (test.includes('height')) { const h = parseFtIn(score); out.height_ft = h.ft; out.height_in = h.inch; return true }
  if (test.includes('wingspan')) { const w = parseFtIn(score); out.wingspan_ft = w.ft; out.wingspan_in = w.inch; return true }
  if (test.includes('chin')) { if (isOlder || !test.includes('hold')) out.chinups = num(score); else out.chinup_hold = num(score); return true }
  if ((test.includes('05km') || test.includes('5km') || test.includes('asslt') || test.includes('assault')) && test.includes('time')) { out.mile02_time = score; return true }
  if ((test.includes('05km') || test.includes('5km') || test.includes('asslt') || test.includes('assault')) && test.includes('watt')) { out.mile02_watts = intNum(score); return true }
  return false
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
    if (headerRowIndex < 0) return NextResponse.json({ error: 'Could not find header row.' }, { status: 400 })
    const headers = grid[headerRowIndex].map(headerKey)
    const firstCol = findCol(headers, ['firstname', 'first'])
    const lastCol = findCol(headers, ['lastname', 'last'])
    const teamCol = findCol(headers, ['team'])
    const testCol = findCol(headers, ['test'])
    const scoreCol = findCol(headers, ['score'])
    const isLongFormat = testCol >= 0 && scoreCol >= 0
    if (firstCol < 0 || lastCol < 0) return NextResponse.json({ error: 'First and Last columns are required.' }, { status: 400 })

    const db = admin()
    const { data: athletes, error: athleteError } = await db.from('athletes').select('id, first_name, last_name, team, season, roster_phase').eq('season', season).eq('roster_phase', rosterPhase).eq('team', selectedTeam)
    if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })
    const athleteMap = new Map<string, any>()
    for (const a of athletes || []) athleteMap.set(personKey(a.first_name, a.last_name), a)

    const isOlder = !['U10AA','U10AAA','U11AA','U11AAA','U12AA','U12AAA'].includes(selectedTeam)
    const resultMap = new Map<string, any>()
    const missing: any[] = []
    let rowsWithNames = 0
    let rowsWithResults = 0

    if (isLongFormat) {
      for (let r = headerRowIndex + 1; r < grid.length; r++) {
        const row = grid[r] || []
        const first = displayName(row[firstCol] || '')
        const last = displayName(row[lastCol] || '')
        if (!first || !last || first === 'FIRST' || last === 'LAST') continue
        const rowTeam = teamCol >= 0 ? clean(row[teamCol]) : selectedTeam
        if (rowTeam && rowTeam !== selectedTeam) continue
        rowsWithNames++
        const athlete = athleteMap.get(personKey(first, last))
        if (!athlete) { missing.push({ first_name: first, last_name: last, team: selectedTeam, test: row[testCol], score: row[scoreCol] }); continue }
        const existing = resultMap.get(athlete.id) || emptyCombineRow(athlete, selectedTeam, season)
        if (applyTest(existing, row[testCol], row[scoreCol], isOlder)) rowsWithResults++
        resultMap.set(athlete.id, existing)
      }
    } else {
      const sprintCol = findCol(headers, ['sprint', '10m'])
      const broadFtCol = findCol(headers, ['broadjumpft', 'broadft'])
      const broadInCol = findCol(headers, ['broadjumpin', 'broadin'])
      const broadCol = broadFtCol >= 0 ? -1 : findCol(headers, ['broadjump'])
      const chinHoldCol = findCol(headers, ['chinuphold', 'chinhold'])
      const chinupsCol = findCol(headers, ['chinups', 'chinup'])
      const verticalCol = findCol(headers, ['verticaljump', 'vertical'])
      const assaultTimeCol = findCol(headers, ['km05time', '05kmasslttime', '05kmassaulttime', 'asslttime', 'assaulttime'])
      const assaultWattCol = findCol(headers, ['km05watts', 'km05watt', '05kmassltwatt', '05kmassaultwatt', 'assltwatt', 'assaultwatt', 'watt'])
      const heightFtCol = findCol(headers, ['heightft'])
      const heightInCol = findCol(headers, ['heightin'])
      const wingspanFtCol = findCol(headers, ['wingspanft'])
      const wingspanInCol = findCol(headers, ['wingspanin'])
      const heightCol = heightFtCol >= 0 ? -1 : findCol(headers, ['height'])
      const wingspanCol = wingspanFtCol >= 0 ? -1 : findCol(headers, ['wingspan'])
      for (let r = headerRowIndex + 1; r < grid.length; r++) {
        const row = grid[r] || []
        const first = displayName(row[firstCol] || '')
        const last = displayName(row[lastCol] || '')
        if (!first || !last || first === 'FIRST' || last === 'LAST') continue
        const rowTeam = teamCol >= 0 ? clean(row[teamCol]) : selectedTeam
        if (rowTeam && rowTeam !== selectedTeam) continue
        rowsWithNames++
        const athlete = athleteMap.get(personKey(first, last))
        if (!athlete) { missing.push({ first_name: first, last_name: last, team: selectedTeam }); continue }
        const out = emptyCombineRow(athlete, selectedTeam, season)
        const broad = broadCol >= 0 ? parseFtIn(row[broadCol]) : { ft: broadFtCol >= 0 ? intNum(row[broadFtCol]) : null, inch: broadInCol >= 0 ? num(row[broadInCol]) : null }
        const height = heightCol >= 0 ? parseFtIn(row[heightCol]) : { ft: heightFtCol >= 0 ? intNum(row[heightFtCol]) : null, inch: heightInCol >= 0 ? num(row[heightInCol]) : null }
        const wingspan = wingspanCol >= 0 ? parseFtIn(row[wingspanCol]) : { ft: wingspanFtCol >= 0 ? intNum(row[wingspanFtCol]) : null, inch: wingspanInCol >= 0 ? num(row[wingspanInCol]) : null }
        out.sprint = sprintCol >= 0 ? num(row[sprintCol]) : null
        out.broad_jump_ft = broad.ft; out.broad_jump_in = broad.inch
        out.vertical = verticalCol >= 0 ? num(row[verticalCol]) : null
        out.height_ft = height.ft; out.height_in = height.inch
        out.wingspan_ft = wingspan.ft; out.wingspan_in = wingspan.inch
        const chin = chinHoldCol >= 0 ? num(row[chinHoldCol]) : (chinupsCol >= 0 ? num(row[chinupsCol]) : null)
        if (isOlder) out.chinups = chin; else out.chinup_hold = chin
        out.mile02_time = assaultTimeCol >= 0 ? clean(row[assaultTimeCol] || '') || null : null
        out.mile02_watts = assaultWattCol >= 0 ? intNum(row[assaultWattCol]) : null
        rowsWithResults += ['sprint','height_ft','height_in','wingspan_ft','wingspan_in','vertical','broad_jump_ft','broad_jump_in','chinup_hold','chinups','mile02_time','mile02_watts'].some(k => out[k] !== null && out[k] !== undefined && out[k] !== '') ? 1 : 0
        resultMap.set(athlete.id, out)
      }
    }

    const matched = Array.from(resultMap.values())
    const teamCounts = matched.reduce<Record<string, number>>((acc, row) => { acc[row.team] = (acc[row.team] || 0) + 1; return acc }, {})
    if (dryRun) return NextResponse.json({ dryRun: true, season, roster_phase: rosterPhase, teamsDetected: [selectedTeam], rowsWithNames, rowsWithResults, matched: matched.length, missing: missing.length, missingExamples: missing.slice(0, 30), readyToImport: matched.length, teamCounts, format: isLongFormat ? 'long' : 'wide' })
    if (matched.length > 0) {
      const { error } = await db.from('combine_results').upsert(matched, { onConflict: 'athlete_id,season' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ dryRun: false, season, roster_phase: rosterPhase, imported: matched.length, skippedMissing: missing.length, teamCounts, format: isLongFormat ? 'long' : 'wide' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Combine import failed.' }, { status: 500 })
  }
}
