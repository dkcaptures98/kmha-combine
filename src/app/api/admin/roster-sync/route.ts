import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function cleanName(value: unknown) {
  return clean(value).replace(/\s+/g, ' ')
}

function cleanTeam(value: unknown) {
  return clean(value)
    .toUpperCase()
    .replace(/^KJR\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/KLR$/g, 'LR')
    .trim()
}

function keyFor(first: string, last: string) {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`
}

function splitCsvLine(line: string) {
  const values: string[] = []
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
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function parseCsv(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase())

  const rows = lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    const first = cleanName(row.first_name || row.firstname || row.first || row['first name'])
    const last = cleanName(row.last_name || row.lastname || row.last || row['last name'])
    const team = cleanTeam(row.team)

    return {
      id: clean(row.id),
      first_name: first,
      last_name: last,
      team,
      active: String(row.active || 'true').toLowerCase() !== 'false',
    }
  })

  const seen = new Set<string>()

  return rows.filter(row => {
    if (!row.first_name || !row.last_name || !row.team) return false
    if (row.first_name.toLowerCase() === 'first' && row.last_name.toLowerCase() === 'last') return false

    const key = row.id ? `id:${row.id}` : keyFor(row.first_name, row.last_name)
    if (seen.has(key)) return false
    seen.add(key)

    return true
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const csvText = String(body.csv || '')
    const confirm = Boolean(body.confirm)
    const archiveMissing = Boolean(body.archiveMissing)
    const fullReplacement = Boolean(body.fullReplacement)

    const incoming = parseCsv(csvText)
    const admin = adminClient()

    const { data: existing, error } = await admin
      .from('athletes')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const existingAthletes = existing || []
    const existingById = new Map<string, any>()
    const existingByName = new Map<string, any>()

    for (const athlete of existingAthletes) {
      existingById.set(String(athlete.id), athlete)
      existingByName.set(keyFor(athlete.first_name, athlete.last_name), athlete)
    }

    const incomingMatchedIds = new Set<string>()

    const returning: any[] = []
    const newAthletes: any[] = []
    const teamChanges: any[] = []

    for (const row of incoming) {
      const matched = row.id
        ? existingById.get(String(row.id))
        : existingByName.get(keyFor(row.first_name, row.last_name))

      if (!matched) {
        newAthletes.push(row)
        continue
      }

      incomingMatchedIds.add(String(matched.id))

      if (cleanTeam(matched.team) !== row.team) {
        teamChanges.push({
          id: matched.id,
          first_name: row.first_name,
          last_name: row.last_name,
          old_team: matched.team,
          new_team: row.team,
        })
      } else {
        returning.push({
          id: matched.id,
          first_name: row.first_name,
          last_name: row.last_name,
          team: row.team,
        })
      }
    }

    const toArchive = existingAthletes
      .filter(a => a.active !== false && !incomingMatchedIds.has(String(a.id)))
      .map(a => ({
        id: a.id,
        first_name: a.first_name,
        last_name: a.last_name,
        team: a.team,
      }))

    const counts = {
      incoming: incoming.length,
      returning: returning.length,
      newAthletes: newAthletes.length,
      teamChanges: teamChanges.length,
      toArchive: toArchive.length,
    }

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        counts,
        returning,
        newAthletes,
        teamChanges,
        toArchive,
      })
    }

    if (!incoming.length) {
      return NextResponse.json({ error: 'No valid athletes found in CSV.' }, { status: 400 })
    }

    if (fullReplacement) {
      const { error: archiveAllError } = await admin
        .from('athletes')
        .update({ active: false })
        .neq('id', '__never_match__')

      if (archiveAllError) {
        return NextResponse.json({ error: `Archive all failed: ${archiveAllError.message}` }, { status: 500 })
      }
    } else if (archiveMissing && toArchive.length) {
      const { error: archiveSomeError } = await admin
        .from('athletes')
        .update({ active: false })
        .in('id', toArchive.map(a => a.id))

      if (archiveSomeError) {
        return NextResponse.json({ error: `Archive missing failed: ${archiveSomeError.message}` }, { status: 500 })
      }
    }

    let updated = 0
    let inserted = 0

    for (const row of incoming) {
      const matched = row.id
        ? existingById.get(String(row.id))
        : existingByName.get(keyFor(row.first_name, row.last_name))

      if (matched) {
        const { error: updateError } = await admin
          .from('athletes')
          .update({
            first_name: row.first_name,
            last_name: row.last_name,
            team: row.team,
            active: true,
          })
          .eq('id', matched.id)

        if (updateError) {
          return NextResponse.json(
            { error: `Update failed for ${row.first_name} ${row.last_name}: ${updateError.message}` },
            { status: 500 }
          )
        }

        updated++
      } else {
        const { error: insertError } = await admin
          .from('athletes')
          .insert({
            id: row.id || randomUUID(),
            first_name: row.first_name,
            last_name: row.last_name,
            team: row.team,
            active: true,
          })

        if (insertError) {
          return NextResponse.json(
            { error: `Insert failed for ${row.first_name} ${row.last_name}: ${insertError.message}` },
            { status: 500 }
          )
        }

        inserted++
      }
    }

    try {
      await admin.from('audit_log').insert({
        action: 'ROSTER_SYNC',
        table_name: 'athletes',
        user_email: body.userEmail || 'unknown',
        details: {
          archiveMissing,
          fullReplacement,
          counts,
          updated,
          inserted,
        },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      counts,
      updated,
      inserted,
      fullReplacement,
      archiveMissing,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Roster sync failed.' },
      { status: 500 }
    )
  }
}
