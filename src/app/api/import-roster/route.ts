import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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

function findColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader)
  return candidates.map(normalizeHeader).map(c => normalized.indexOf(c)).find(i => i >= 0) ?? -1
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

function makeId(season: string, rosterPhase: string, team: string, firstName: string, lastName: string) {
  return `${season}-${rosterPhase}-${team}-${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const csvText = String(body.csvText || '')
    const season = cleanCell(body.season || '2026-2027')
    const rosterPhase = cleanCell(body.roster_phase || body.rosterPhase || 'offseason').toLowerCase()
    const dryRun = body.dryRun !== false
    const admin = getAdminClient()

    if (!season.match(/^\d{4}-\d{4}$/)) {
      return NextResponse.json({ error: 'Invalid season. Use YYYY-YYYY.' }, { status: 400 })
    }

    if (!['offseason', 'inseason'].includes(rosterPhase)) {
      return NextResponse.json({ error: 'Invalid roster_phase. Use offseason or inseason.' }, { status: 400 })
    }

    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty.' }, { status: 400 })

    const headers = parseCsvLine(lines[0])
    const firstIdx = findColumn(headers, ['first name', 'firstname', 'first'])
    const lastIdx = findColumn(headers, ['last name', 'lastname', 'last'])
    const teamIdx = findColumn(headers, ['team', 'division', 'roster team'])

    if (firstIdx < 0 || lastIdx < 0 || teamIdx < 0) {
      return NextResponse.json({ error: `CSV must include first_name, last_name, and team columns. Found: ${headers.join(', ')}` }, { status: 400 })
    }

    const seen = new Set<string>()
    const duplicates: any[] = []
    const rows: any[] = []

    for (const line of lines.slice(1)) {
      const cells = parseCsvLine(line)
      const first_name = displayName(cells[firstIdx])
      const last_name = displayName(cells[lastIdx])
      const team = normalizeTeam(cells[teamIdx])
      if (!first_name || !last_name || !team) continue

      const key = `${season}|${rosterPhase}|${team}|${nameKey(first_name)}|${nameKey(last_name)}`
      const row = {
        id: makeId(season, rosterPhase, team, first_name, last_name),
        first_name,
        last_name,
        team,
        active: true,
        season,
        roster_phase: rosterPhase,
      }

      if (seen.has(key)) {
        duplicates.push(row)
        continue
      }

      seen.add(key)
      rows.push(row)
    }

    const teamCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.team] = (acc[row.team] || 0) + 1
      return acc
    }, {})

    const { data: existingRows, error: existingError } = await admin
      .from('athletes')
      .select('id, first_name, last_name, team, season, roster_phase')
      .eq('season', season)
      .eq('roster_phase', rosterPhase)

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existingIds = new Set((existingRows || []).map((r: any) => r.id))
    const toInsert = rows.filter(row => !existingIds.has(row.id))
    const toUpdate = rows.filter(row => existingIds.has(row.id))

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        season,
        roster_phase: rosterPhase,
        csvRowsUnique: rows.length,
        duplicatesRemoved: duplicates.length,
        existingRows: existingRows?.length || 0,
        toInsert: toInsert.length,
        toUpdate: toUpdate.length,
        finalExpectedRowsAtLeast: (existingRows?.length || 0) + toInsert.length,
        teamCounts,
        duplicateExamples: duplicates.slice(0, 30),
      })
    }

    if (rows.length > 0) {
      const { error } = await admin.from('athletes').upsert(rows, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      dryRun: false,
      season,
      roster_phase: rosterPhase,
      imported: rows.length,
      duplicatesRemoved: duplicates.length,
      teamCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Roster import failed' }, { status: 500 })
  }
}
