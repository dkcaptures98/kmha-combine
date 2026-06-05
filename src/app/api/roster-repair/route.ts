import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type CsvAthlete = {
  first_name: string
  last_name: string
  team: string
  season: string
  active: boolean
}

function cleanCell(value: unknown) {
  return String(value ?? '').trim().replace(/^"|"$/g, '').trim()
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(cleanCell(current))
      current = ''
    } else {
      current += char
    }
  }

  cells.push(cleanCell(current))
  return cells
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeName(value: string) {
  return cleanCell(value).replace(/\s+/g, ' ').toUpperCase()
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

  if (firstIdx < 0 || lastIdx < 0 || teamIdx < 0) {
    throw new Error(`CSV must include first name, last name, and team columns. Found: ${headers.join(', ')}`)
  }

  const seen = new Set<string>()
  const duplicates: CsvAthlete[] = []
  const athletes: CsvAthlete[] = []

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const first_name = normalizeName(cells[firstIdx])
    const last_name = normalizeName(cells[lastIdx])
    const team = normalizeTeam(cells[teamIdx])

    if (!first_name || !last_name || !team) continue

    const row = { first_name, last_name, team, season, active: true }
    const key = `${season}|${team}|${first_name}|${last_name}`

    if (seen.has(key)) {
      duplicates.push(row)
      continue
    }

    seen.add(key)
    athletes.push(row)
  }

  return { athletes, duplicates }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const season = cleanCell(body.season || '2026-2027')
    const csvText = String(body.csvText || '')
    const dryRun = body.dryRun !== false

    if (!season.match(/^\d{4}-\d{4}$/)) {
      return NextResponse.json({ error: 'Invalid season format. Use YYYY-YYYY.' }, { status: 400 })
    }

    const { athletes: csvAthletes, duplicates } = parseRosterCsv(csvText, season)

    const { data: existingRows, error: existingError } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, team, season, active')
      .eq('season', season)

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existing = existingRows || []
    const byExactKey = new Map<string, any>()
    existing.forEach(row => {
      byExactKey.set(`${row.team}|${normalizeName(row.first_name)}|${normalizeName(row.last_name)}`, row)
    })

    const toInsert: CsvAthlete[] = []
    const toReactivate: any[] = []
    const unchanged: any[] = []

    for (const athlete of csvAthletes) {
      const key = `${athlete.team}|${athlete.first_name}|${athlete.last_name}`
      const current = byExactKey.get(key)

      if (!current) {
        toInsert.push(athlete)
      } else if (current.active !== true) {
        toReactivate.push({ ...current, active: true })
      } else {
        unchanged.push(current)
      }
    }

    const teamCounts = csvAthletes.reduce<Record<string, number>>((acc, row) => {
      acc[row.team] = (acc[row.team] || 0) + 1
      return acc
    }, {})

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        season,
        csvRowsUnique: csvAthletes.length,
        duplicatesRemoved: duplicates.length,
        existingSeasonRows: existing.length,
        alreadyPresent: unchanged.length,
        toReactivate: toReactivate.length,
        toInsert: toInsert.length,
        finalExpectedSeasonRowsAtLeast: existing.length + toInsert.length,
        teamCounts,
        duplicateExamples: duplicates.slice(0, 20),
      })
    }

    let inserted = 0
    let reactivated = 0

    if (toInsert.length > 0) {
      const rows = toInsert.map(row => ({
        id: `${season}-${row.team}-${row.first_name}-${row.last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        first_name: row.first_name,
        last_name: row.last_name,
        team: row.team,
        season: row.season,
        active: true,
      }))

      const { error } = await supabase.from('athletes').upsert(rows, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted = rows.length
    }

    for (const row of toReactivate) {
      const { error } = await supabase.from('athletes').update({ active: true }).eq('id', row.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      reactivated++
    }

    return NextResponse.json({
      dryRun: false,
      season,
      csvRowsUnique: csvAthletes.length,
      duplicatesRemoved: duplicates.length,
      existingSeasonRows: existing.length,
      inserted,
      reactivated,
      unchanged: unchanged.length,
      finalExpectedSeasonRowsAtLeast: existing.length + inserted,
      teamCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Roster repair failed' }, { status: 500 })
  }
}
