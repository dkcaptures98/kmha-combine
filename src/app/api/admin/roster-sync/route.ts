import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function normalize(value: unknown) {
  return String(value || '').trim()
}

function keyFor(first: string, last: string) {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`
}

function parseCsv(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    return {
      first_name: normalize(row.first_name || row.firstname || row.first || row['first name']),
      last_name: normalize(row.last_name || row.lastname || row.last || row['last name']),
      team: normalize(row.team),
    }
  }).filter(row => row.first_name && row.last_name && row.team)
}

export async function POST(request: Request) {
  const body = await request.json()
  const csvText = String(body.csv || '')
  const confirm = Boolean(body.confirm)

  const incoming = parseCsv(csvText)
  const admin = adminClient()

  const { data: existing, error } = await admin
    .from('athletes')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existingAthletes = existing || []
  const existingByName = new Map<string, any>()

  existingAthletes.forEach(athlete => {
    existingByName.set(keyFor(athlete.first_name, athlete.last_name), athlete)
  })

  const incomingKeys = new Set(incoming.map(row => keyFor(row.first_name, row.last_name)))

  const returning: any[] = []
  const newAthletes: any[] = []
  const teamChanges: any[] = []
  const toArchive: any[] = []

  for (const row of incoming) {
    const existingAthlete = existingByName.get(keyFor(row.first_name, row.last_name))

    if (!existingAthlete) {
      newAthletes.push(row)
      continue
    }

    if (existingAthlete.team !== row.team) {
      teamChanges.push({
        id: existingAthlete.id,
        first_name: row.first_name,
        last_name: row.last_name,
        old_team: existingAthlete.team,
        new_team: row.team,
      })
    } else {
      returning.push({
        id: existingAthlete.id,
        first_name: row.first_name,
        last_name: row.last_name,
        team: row.team,
      })
    }
  }

  for (const athlete of existingAthletes) {
    const athleteKey = keyFor(athlete.first_name, athlete.last_name)
    if (athlete.active !== false && !incomingKeys.has(athleteKey)) {
      toArchive.push({
        id: athlete.id,
        first_name: athlete.first_name,
        last_name: athlete.last_name,
        team: athlete.team,
      })
    }
  }

  if (!confirm) {
    return NextResponse.json({
      preview: true,
      counts: {
        incoming: incoming.length,
        returning: returning.length,
        newAthletes: newAthletes.length,
        teamChanges: teamChanges.length,
        toArchive: toArchive.length,
      },
      returning,
      newAthletes,
      teamChanges,
      toArchive,
    })
  }

  for (const row of incoming) {
    const existingAthlete = existingByName.get(keyFor(row.first_name, row.last_name))

    if (existingAthlete) {
      await admin
        .from('athletes')
        .update({
          first_name: row.first_name,
          last_name: row.last_name,
          team: row.team,
          active: true,
        })
        .eq('id', existingAthlete.id)
    } else {
      await admin
        .from('athletes')
        .insert({
          first_name: row.first_name,
          last_name: row.last_name,
          team: row.team,
          active: true,
        })
    }
  }

  if (toArchive.length) {
    await admin
      .from('athletes')
      .update({ active: false })
      .in('id', toArchive.map(a => a.id))
  }

  try {
    await admin.from('audit_log').insert({
      action: 'ROSTER_SYNC',
      table_name: 'athletes',
      user_email: body.userEmail || 'unknown',
      details: {
        counts: {
          incoming: incoming.length,
          returning: returning.length,
          newAthletes: newAthletes.length,
          teamChanges: teamChanges.length,
          toArchive: toArchive.length,
        },
      },
    })
  } catch {}

  return NextResponse.json({
    success: true,
    counts: {
      incoming: incoming.length,
      returning: returning.length,
      newAthletes: newAthletes.length,
      teamChanges: teamChanges.length,
      toArchive: toArchive.length,
    },
  })
}
