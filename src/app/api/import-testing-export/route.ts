import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

function cleanCell(value: unknown) {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/�/g, '').trim().replace(/^"|"$/g, '').trim()
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && next === '"') { current += '"'; i++ }
    else if (char === '"') inQuotes = !inQuotes
    else if (char === ',' && !inQuotes) { cells.push(cleanCell(current)); current = '' }
    else current += char
  }
  cells.push(cleanCell(current))
  return cells
}

function normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, '') }
function displayName(value: string) {
  return cleanCell(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"').replace(/[^a-zA-Z '\-]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
}
function nameKey(value: string) { return displayName(value).replace(/[^A-Z]/g, '') }
function personKey(first: string, last: string) { return `${nameKey(first)}|${nameKey(last)}` }
function normalizeTeam(value: string) { return cleanCell(value).toUpperCase().replace(/\s+/g, '') }
function findColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader)
  return candidates.map(normalizeHeader).map(c => normalized.indexOf(c)).find(i => i >= 0) ?? -1
}
function seasonFor(year: number, month: string) {
  const startMonths = ['April','May','June','July','August','September','October','November','December']
  return startMonths.includes(month) ? `${year}-${year + 1}` : `${year - 1}-${year}`
}
function testType(value: string) {
  const v = cleanCell(value).toLowerCase()
  if (v.includes('sprint') || v === '10m') return 'Sprint'
  if (v.includes('vertical')) return 'Vertical'
  if (v.includes('chin') && v.includes('hold')) return 'ChinHold'
  if (v.includes('chin')) return 'Chinups'
  if (v.includes('broad')) return 'BroadJump'
  return cleanCell(value)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const csvText = String(body.csvText || '')
    const dryRun = body.dryRun !== false
    const wipeExisting = body.wipeExisting === true
    const season = cleanCell(body.season || '2025-2026')
    const admin = getAdminClient()

    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty.' }, { status: 400 })
    const headers = parseCsvLine(lines[0])
    const firstIdx = findColumn(headers, ['first name', 'firstname', 'first'])
    const lastIdx = findColumn(headers, ['last name', 'lastname', 'last'])
    const teamIdx = findColumn(headers, ['team'])
    const testIdx = findColumn(headers, ['test', 'test type', 'test_type'])
    const scoreIdx = findColumn(headers, ['score'])
    const monthIdx = findColumn(headers, ['month'])
    const yearIdx = findColumn(headers, ['year'])
    if ([firstIdx,lastIdx,teamIdx,testIdx,scoreIdx,monthIdx,yearIdx].some(i => i < 0)) return NextResponse.json({ error: `CSV must include first_name, last_name, team, test, score, month, year. Found: ${headers.join(', ')}` }, { status: 400 })

    const rawRows = lines.slice(1).map(parseCsvLine).map((cells, index) => ({
      source_index: index,
      first_name: displayName(cells[firstIdx]),
      last_name: displayName(cells[lastIdx]),
      team: normalizeTeam(cells[teamIdx]),
      test_type: testType(cells[testIdx]),
      score: parseFloat(cleanCell(cells[scoreIdx])),
      month: cleanCell(cells[monthIdx]),
      year: parseInt(cleanCell(cells[yearIdx])),
    })).filter(r => r.first_name && r.last_name && r.team && r.test_type && Number.isFinite(r.score) && r.month && r.year && seasonFor(r.year, r.month) === season)

    const athleteKeys = new Set(rawRows.map(r => `${r.team}|${personKey(r.first_name, r.last_name)}`))
    const { data: athleteRows, error: athleteError } = await admin.from('athletes').select('id, first_name, last_name, team, season').eq('season', season)
    if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })
    const athletesByKey = new Map<string, any>()
    ;(athleteRows || []).forEach(a => athletesByKey.set(`${normalizeTeam(a.team)}|${personKey(a.first_name, a.last_name)}`, a))
    const missingAthletes = Array.from(athleteKeys).filter(k => !athletesByKey.has(k))

    const entries = rawRows.map(r => {
      const athlete = athletesByKey.get(`${r.team}|${personKey(r.first_name, r.last_name)}`)
      if (!athlete) return null
      return {
        id: `${season}-${r.team}-${r.first_name}-${r.last_name}-${r.test_type}-${r.score}-${r.month}-${r.year}-${r.source_index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        athlete_id: athlete.id,
        athlete_name: `${r.first_name} ${r.last_name}`,
        team: r.team,
        test_type: r.test_type,
        score: r.score,
        month: r.month,
        year: r.year,
      }
    }).filter(Boolean) as any[]

    if (dryRun) return NextResponse.json({ dryRun: true, season, csvRowsRead: rawRows.length, uniqueAthletesInCsv: athleteKeys.size, missingAthletes: missingAthletes.length, entriesPrepared: entries.length, duplicatesCollapsed: 0, missingExamples: missingAthletes.slice(0, 30) })

    if (wipeExisting) {
      const years = season.split('-').map(Number)
      const months = ['April','May','June','July','August','September','October','November','December','January','February','March']
      const seasonPairs = months.map(m => ({ month: m, year: ['January','February','March'].includes(m) ? years[1] : years[0] }))
      for (const p of seasonPairs) {
        const { error } = await admin.from('combine_entries').delete().eq('month', p.month).eq('year', p.year)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const chunkSize = 500
    for (let i = 0; i < entries.length; i += chunkSize) {
      const { error } = await admin.from('combine_entries').upsert(entries.slice(i, i + chunkSize), { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ dryRun: false, season, imported: entries.length, missingAthletes: missingAthletes.length, duplicatesCollapsed: 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Testing export import failed' }, { status: 500 })
  }
}
