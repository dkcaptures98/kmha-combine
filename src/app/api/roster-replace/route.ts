import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RosterRow = {
  id: string
  first_name: string
  last_name: string
  team: string
  season: string
  active: boolean
}

function cleanCell(value: unknown) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/�/g, '')
    .trim()
    .replace(/^"|"$/g, '')
    .trim()
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

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function displayName(value: string) {
  return cleanCell(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z '\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function nameKey(value: string) {
  return displayName(value).replace(/[^A-Z]/g, '')
}

function normalizeTeam(rawTeam: string) {
  const team = cleanCell(rawTeam)
    .toUpperCase()
    .replace(/KITCHENER JR RANGERS|KITCHENER JUNIOR RANGERS|JR RANGERS|JUNIOR RANGERS|KJR|KMHA/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const ageMatch = team.match(/U\s*(\d{2})/)
  if (!ageMatch) return team.replace(/\s/g, '')
  const age = `U${ageMatch[1]}`
  const hasKlr = /\bKLR\b|\bLR\b/.test(team)
  const hasAaa = /\bAAA\b/.test(team)
  const hasAa = /\bAA\b/.test(team)
  const hasSingleA = /\bA\b/.test(team)
  if (hasKlr) {
    if (hasAa) return `${age}AALR`
    if (hasSingleA || age === 'U18') return `${age}ALR`
    return `${age}ALR`
  }
  if (hasAaa) return `${age}AAA`
  if (hasAa) return `${age}AA`
  if (hasSingleA) return `${age}A`
  return team.replace(/\s/g, '')
}

function findColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader)
  return candidates.map(normalizeHeader).map(c => normalized.indexOf(c)).find(i => i >= 0) ?? -1
}

function parseRosterCsv(csvText: string, season: string) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) throw new Error('CSV is empty or missing rows')
  const headers = parseCsvLine(lines[0])
  const firstIdx = findColumn(headers, ['first name', 'firstname', 'first'])
  const lastIdx = findColumn(headers, ['last name', 'lastname', 'last'])
  const teamIdx = findColumn(headers, ['team', 'division', 'roster team'])
  const activeIdx = findColumn(headers, ['active', 'status'])
  const idIdx = findColumn(headers, ['id', 'athlete id', 'athlete_id'])
  if (firstIdx < 0 || lastIdx < 0 || teamIdx < 0) throw new Error(`CSV must include first name, last name, and team columns. Found: ${headers.join(', ')}`)

  const seen = new Set<string>()
  const duplicates: RosterRow[] = []
  const rows: RosterRow[] = []

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const first_name = displayName(cells[firstIdx])
    const last_name = displayName(cells[lastIdx])
    const team = normalizeTeam(cells[teamIdx])
    if (!first_name || !last_name || !team) continue
    const activeRaw = activeIdx >= 0 ? cleanCell(cells[activeIdx]).toLowerCase() : 'true'
    const active = !['false', '0', 'no', 'inactive'].includes(activeRaw)
    const suppliedId = idIdx >= 0 ? cleanCell(cells[idIdx]) : ''
    const generatedId = `${season}-${team}-${first_name}-${last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const row = { id: suppliedId || generatedId, first_name, last_name, team, season, active }
    const key = `${season}|${team}|${nameKey(first_name)}|${nameKey(last_name)}`
    if (seen.has(key)) { duplicates.push(row); continue }
    seen.add(key)
    rows.push(row)
  }
  return { rows, duplicates }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const season = cleanCell(body.season)
    const csvText = String(body.csvText || '')
    const dryRun = body.dryRun !== false
    if (!season.match(/^\d{4}-\d{4}$/)) return NextResponse.json({ error: 'Invalid season format. Use YYYY-YYYY.' }, { status: 400 })

    const { rows: masterRows, duplicates } = parseRosterCsv(csvText, season)

    const { data: existingRows, error: existingError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, team, season, active')
      .eq('season', season)
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const { data: entryRows, error: entriesError } = await supabase
      .from('combine_entries')
      .select('athlete_id')
    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })

    const { data: resultRows, error: resultsError } = await supabase
      .from('combine_results')
      .select('athlete_id')
    if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 })

    const protectedIds = new Set<string>([...(entryRows || []).map((r: any) => r.athlete_id), ...(resultRows || []).map((r: any) => r.athlete_id)])
    const existing = existingRows || []
    const existingByNameTeam = new Map<string, any>()
    existing.forEach(row => existingByNameTeam.set(`${row.team}|${nameKey(row.first_name)}|${nameKey(row.last_name)}`, row))

    const upserts: RosterRow[] = []
    const masterKeys = new Set<string>()
    for (const row of masterRows) {
      const key = `${row.team}|${nameKey(row.first_name)}|${nameKey(row.last_name)}`
      masterKeys.add(key)
      const existingMatch = existingByNameTeam.get(key)
      upserts.push({ ...row, id: existingMatch?.id || row.id })
    }

    const safeToDeactivate = existing.filter(row => {
      const key = `${row.team}|${nameKey(row.first_name)}|${nameKey(row.last_name)}`
      return !masterKeys.has(key) && !protectedIds.has(row.id)
    })
    const protectedNotInMaster = existing.filter(row => {
      const key = `${row.team}|${nameKey(row.first_name)}|${nameKey(row.last_name)}`
      return !masterKeys.has(key) && protectedIds.has(row.id)
    })

    const teamCounts = masterRows.reduce<Record<string, number>>((acc, row) => { acc[row.team] = (acc[row.team] || 0) + 1; return acc }, {})

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        season,
        masterRows: masterRows.length,
        duplicatesRemoved: duplicates.length,
        existingSeasonRows: existing.length,
        upserts: upserts.length,
        safeToDeactivate: safeToDeactivate.length,
        protectedNotInMaster: protectedNotInMaster.length,
        teamCounts,
        duplicateExamples: duplicates.slice(0, 30),
        protectedExamples: protectedNotInMaster.slice(0, 30),
      })
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from('athletes').upsert(upserts, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const row of safeToDeactivate) {
      const { error } = await supabase.from('athletes').update({ active: false }).eq('id', row.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      dryRun: false,
      season,
      masterRows: masterRows.length,
      duplicatesRemoved: duplicates.length,
      upserts: upserts.length,
      deactivated: safeToDeactivate.length,
      protectedNotInMaster: protectedNotInMaster.length,
      teamCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Roster replace failed' }, { status: 500 })
  }
}
