import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function clean(v: unknown) {
  return String(v ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/�/g, '')
    .trim()
    .replace(/^"|"$/g, '')
    .trim()
}

function parseLine(line: string) {
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
      cells.push(clean(current))
      current = ''
    } else {
      current += char
    }
  }

  cells.push(clean(current))
  return cells
}

function displayName(v: string) {
  return clean(v)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z '\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function nameKey(v: string) {
  return displayName(v).replace(/[^A-Z]/g, '')
}

function personKey(first: string, last: string) {
  return `${nameKey(first)}|${nameKey(last)}`
}

function num(v: string) {
  const n = parseFloat(clean(v))
  return Number.isFinite(n) ? n : null
}

function intNum(v: string) {
  const n = parseInt(clean(v), 10)
  return Number.isFinite(n) ? n : null
}

function normalizeTeamFromHeader(raw: string) {
  const v = clean(raw).toUpperCase().replace(/KJR/g, '').replace(/\s+/g, ' ').trim()
  if (!v) return ''
  if (v.includes('U15AA LR')) return 'U15AALR'
  if (v.includes('U15A LR')) return 'U15ALR'
  if (v.includes('U13 AA KLR') || v.includes('U13AA KLR') || v.includes('U13AA LR')) return 'U13AALR'
  if (v.includes('U18 A KLR') || v.includes('U18A KLR') || v.includes('U18A LR')) return 'U18ALR'

  const compact = v.replace(/\s+/g, '')
  const direct = compact.match(/U(\d{2})(AAA|AA|AALR|ALR|A)/)
  if (direct) return `U${direct[1]}${direct[2]}`

  const spaced = v.match(/U\s*(\d{2})\s*(AAA|AA|A)?\s*(KLR|LR)?/)
  if (!spaced) return ''
  const age = `U${spaced[1]}`
  const level = spaced[2] || ''
  const lr = !!spaced[3]
  if (lr && level === 'AA') return `${age}AALR`
  if (lr) return `${age}ALR`
  return `${age}${level}`
}

function parseFtIn(raw: string) {
  const s = clean(raw)
  if (!s) return { ft: null as number | null, inch: null as number | null }

  const quoteMatch = s.match(/^(\d+)\s*['’]\s*(\d+(?:\.\d+)?)?/) || s.match(/^(\d+)\s*ft\s*(\d+(?:\.\d+)?)?/i)
  if (quoteMatch) return { ft: intNum(quoteMatch[1]), inch: quoteMatch[2] ? num(quoteMatch[2]) : null }

  if (s.includes('.')) {
    const [ft, inch] = s.split('.')
    return { ft: intNum(ft), inch: num(inch) }
  }

  return { ft: intNum(s), inch: null }
}

function hasAnyResult(payload: any) {
  return [
    'sprint','height_ft','height_in','wingspan_ft','wingspan_in','vertical',
    'broad_jump_ft','broad_jump_in','chinup_hold','chinups','mile02_time','mile02_watts'
  ].some(k => payload[k] !== null && payload[k] !== undefined && payload[k] !== '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const csvText = String(body.csvText || '')
    const season = clean(body.season || '2026-2027')
    const rosterPhase = clean(body.roster_phase || body.rosterPhase || 'offseason').toLowerCase()
    const dryRun = body.dryRun !== false

    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 5) return NextResponse.json({ error: 'CSV is empty or invalid.' }, { status: 400 })

    const grid = lines.map(parseLine)
    const db = admin()

    const teamBlocks: { team: string; start: number; end: number }[] = []
    for (let r = 0; r < Math.min(grid.length, 10); r++) {
      for (let c = 0; c < (grid[r]?.length || 0); c++) {
        const team = normalizeTeamFromHeader(grid[r][c])
        if (team) teamBlocks.push({ team, start: c, end: c })
      }
    }

    const dedupBlocks: { team: string; start: number; end: number }[] = []
    for (const block of teamBlocks.sort((a, b) => a.start - b.start)) {
      if (!dedupBlocks.some(b => b.team === block.team && Math.abs(b.start - block.start) < 3)) {
        dedupBlocks.push(block)
      }
    }

    for (let i = 0; i < dedupBlocks.length; i++) {
      dedupBlocks[i].end = i < dedupBlocks.length - 1 ? dedupBlocks[i + 1].start - 1 : 999
    }

    const prepared: any[] = []
    const detectedRows: any[] = []

    for (const block of dedupBlocks) {
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r] || []
        const first = displayName(row[block.start] || '')
        const last = displayName(row[block.start + 1] || '')
        if (!first || !last) continue
        if (['FIRST','ATHLETE','NAME'].includes(first) || ['LAST','NAME'].includes(last)) continue
        if (first.length < 2 || last.length < 2) continue

        const broad = parseFtIn(row[block.start + 4] || '')
        const height = parseFtIn(row[block.start + 9] || '')
        const wingspan = parseFtIn(row[block.start + 10] || '')
        const payload = {
          first_name: first,
          last_name: last,
          athlete_name: `${first} ${last}`,
          team: block.team,
          season,
          roster_phase: rosterPhase,
          sprint: num(row[block.start + 3] || ''),
          broad_jump_ft: broad.ft,
          broad_jump_in: broad.inch,
          chinup_hold: num(row[block.start + 5] || ''),
          vertical: num(row[block.start + 6] || ''),
          mile02_time: clean(row[block.start + 7] || '') || null,
          mile02_watts: intNum(row[block.start + 8] || ''),
          height_ft: height.ft,
          height_in: height.inch,
          wingspan_ft: wingspan.ft,
          wingspan_in: wingspan.inch,
        }

        detectedRows.push(payload)
        if (hasAnyResult(payload)) prepared.push(payload)
      }
    }

    const { data: athletes, error: athleteError } = await db
      .from('athletes')
      .select('id, first_name, last_name, team, season, roster_phase')
      .eq('season', season)
      .eq('roster_phase', rosterPhase)

    if (athleteError) return NextResponse.json({ error: athleteError.message }, { status: 500 })

    const athleteMap = new Map<string, any>()
    for (const a of athletes || []) athleteMap.set(`${a.team}|${personKey(a.first_name, a.last_name)}`, a)

    const matched: any[] = []
    const missing: any[] = []
    for (const row of prepared) {
      const athlete = athleteMap.get(`${row.team}|${personKey(row.first_name, row.last_name)}`)
      if (!athlete) {
        missing.push(row)
        continue
      }
      matched.push({
        id: `${athlete.id}-${season}-combine`,
        athlete_id: athlete.id,
        athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        team: row.team,
        season,
        sprint: row.sprint,
        height_ft: row.height_ft,
        height_in: row.height_in,
        wingspan_ft: row.wingspan_ft,
        wingspan_in: row.wingspan_in,
        vertical: row.vertical,
        broad_jump_ft: row.broad_jump_ft,
        broad_jump_in: row.broad_jump_in,
        chinup_hold: row.chinup_hold,
        chinups: null,
        mile02_time: row.mile02_time,
        mile02_watts: row.mile02_watts,
      })
    }

    const teamCounts = matched.reduce<Record<string, number>>((acc, row) => {
      acc[row.team] = (acc[row.team] || 0) + 1
      return acc
    }, {})

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        season,
        roster_phase: rosterPhase,
        teamsDetected: dedupBlocks.map(b => b.team),
        rowsWithNames: detectedRows.length,
        rowsWithResults: prepared.length,
        matched: matched.length,
        missing: missing.length,
        missingExamples: missing.slice(0, 30),
        readyToImport: matched.length,
        teamCounts,
      })
    }

    if (matched.length > 0) {
      const { error } = await db.from('combine_results').upsert(matched, { onConflict: 'athlete_id,season' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      dryRun: false,
      season,
      roster_phase: rosterPhase,
      imported: matched.length,
      skippedMissing: missing.length,
      teamCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Combine import failed.' }, { status: 500 })
  }
}
