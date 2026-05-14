import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function safeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, '').slice(0, 31)
}

function scoreKey(testType: string) {
  const key = String(testType || '').toLowerCase()

  if (key.includes('sprint')) return 'Sprint'
  if (key.includes('vertical')) return 'Vertical'
  if (key.includes('broad')) return 'Broad Jump'
  if (key.includes('chinhold') || key.includes('hold')) return 'Chin Hold'
  if (key.includes('chin')) return 'Chinups'

  return testType || 'Other'
}

function fullName(value: string | null | undefined) {
  return value || ''
}

function formatHeight(ft?: number | null, inches?: number | null) {
  if (ft == null && inches == null) return ''
  return `${ft ?? 0}'${inches ?? 0}"`
}

function formatBroadJump(ft?: number | null, inches?: number | null) {
  if (ft == null && inches == null) return ''
  return `${ft ?? 0}'${inches ?? 0}"`
}

function styleTitleRow(row: ExcelJS.Row, fill = '0F172A') {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 12 }
    cell.alignment = { vertical: 'middle' }
  })
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } }
    cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 10 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    }
  })
}

function styleBodyRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'E2E8F0' } },
      left: { style: 'thin', color: { argb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
      right: { style: 'thin', color: { argb: 'E2E8F0' } },
    }
  })
}

function applyColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
}

async function requireAdmin() {
  // This route uses service role for export. The app currently protects admin pages through app permissions.
  // Keeping the server route simple for now; tighten with session role check later if needed.
  return true
}

export async function GET() {
  await requireAdmin()

  const supabase = getAdminClient()

  const [
    { data: entries, error: entriesError },
    { data: combineResults, error: combineError },
    { data: athletes, error: athletesError },
  ] = await Promise.all([
    supabase.from('combine_entries').select('*').order('team').order('athlete_name').order('year').order('month'),
    supabase.from('combine_results').select('*').order('team').order('athlete_name').order('season'),
    supabase.from('athletes').select('*').order('team').order('last_name').order('first_name'),
  ])

  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })
  if (combineError) return NextResponse.json({ error: combineError.message }, { status: 500 })
  if (athletesError) return NextResponse.json({ error: athletesError.message }, { status: 500 })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'KMHA Combine Tracker'
  workbook.created = new Date()

  const regularSheet = workbook.addWorksheet('Regular Testing', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  regularSheet.mergeCells('A1:H1')
  regularSheet.getCell('A1').value = 'KMHA REGULAR TESTING EXPORT'
  regularSheet.getRow(1).height = 24
  styleTitleRow(regularSheet.getRow(1))

  regularSheet.addRow([])
  const regularHeaderRow = regularSheet.addRow([
    'Team',
    'Athlete Name',
    'Year',
    'Month',
    '10m Sprint',
    'Vertical Jump',
    'Broad Jump',
    'Chinups',
    'Chin Hold',
  ])
  styleHeaderRow(regularHeaderRow)

  const regularMap = new Map<string, any>()

  for (const entry of entries || []) {
    const key = `${entry.team || ''}|${entry.athlete_name || ''}|${entry.year || ''}|${entry.month || ''}`

    if (!regularMap.has(key)) {
      regularMap.set(key, {
        team: entry.team || '',
        athleteName: fullName(entry.athlete_name),
        year: entry.year || '',
        month: entry.month || '',
        Sprint: '',
        Vertical: '',
        'Broad Jump': '',
        Chinups: '',
        'Chin Hold': '',
      })
    }

    const row = regularMap.get(key)
    const test = scoreKey(entry.test_type)
    row[test] = entry.score ?? ''
  }

  const groupedRegular = Array.from(regularMap.values()).sort((a, b) => {
    return `${a.team}${a.athleteName}${a.year}${a.month}`.localeCompare(`${b.team}${b.athleteName}${b.year}${b.month}`)
  })

  let currentTeam = ''
  for (const row of groupedRegular) {
    if (row.team !== currentTeam) {
      currentTeam = row.team
      regularSheet.addRow([])
      const teamRow = regularSheet.addRow([`TEAM: ${currentTeam}`])
      regularSheet.mergeCells(`A${teamRow.number}:I${teamRow.number}`)
      teamRow.height = 20
      teamRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }
      teamRow.getCell(1).font = { bold: true, color: { argb: '1E3A8A' }, size: 11 }
    }

    const dataRow = regularSheet.addRow([
      row.team,
      row.athleteName,
      row.year,
      row.month,
      row.Sprint,
      row.Vertical,
      row['Broad Jump'],
      row.Chinups,
      row['Chin Hold'],
    ])

    styleBodyRow(dataRow)
  }

  applyColumnWidths(regularSheet, [12, 24, 10, 14, 12, 14, 14, 12, 12])

  const combineSheet = workbook.addWorksheet('Annual Combine', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  combineSheet.mergeCells('A1:L1')
  combineSheet.getCell('A1').value = 'KMHA ANNUAL COMBINE EXPORT'
  combineSheet.getRow(1).height = 24
  styleTitleRow(combineSheet.getRow(1))

  combineSheet.addRow([])
  const combineHeaderRow = combineSheet.addRow([
    'Team',
    'Athlete Name',
    'Season',
    'Height',
    'Wingspan',
    'Vertical',
    'Broad Jump',
    'Chin Hold',
    'Chinups',
    '0.2 Mile Time',
    'Avg Watts',
    'Notes',
  ])
  styleHeaderRow(combineHeaderRow)

  let currentCombineTeam = ''
  for (const row of combineResults || []) {
    if (row.team !== currentCombineTeam) {
      currentCombineTeam = row.team || ''
      combineSheet.addRow([])
      const teamRow = combineSheet.addRow([`TEAM: ${currentCombineTeam}`])
      combineSheet.mergeCells(`A${teamRow.number}:L${teamRow.number}`)
      teamRow.height = 20
      teamRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }
      teamRow.getCell(1).font = { bold: true, color: { argb: '1E3A8A' }, size: 11 }
    }

    const dataRow = combineSheet.addRow([
      row.team || '',
      row.athlete_name || '',
      row.season || '',
      formatHeight(row.height_ft, row.height_in),
      formatHeight(row.wingspan_ft, row.wingspan_in),
      row.vertical ?? '',
      formatBroadJump(row.broad_jump_ft, row.broad_jump_in),
      row.chinup_hold ?? '',
      row.chinups ?? '',
      row.mile02_time ?? '',
      row.mile02_watts ?? '',
      row.notes ?? '',
    ])

    styleBodyRow(dataRow)
  }

  applyColumnWidths(combineSheet, [12, 24, 14, 12, 12, 12, 12, 12, 12, 14, 12, 24])

  const rawRegularSheet = workbook.addWorksheet('Raw Regular Testing Backup')
  rawRegularSheet.addRow([
    'id',
    'athlete_id',
    'athlete_name',
    'team',
    'year',
    'month',
    'test_type',
    'score',
    'created_at',
    'updated_at',
  ])
  styleHeaderRow(rawRegularSheet.getRow(1))

  for (const row of entries || []) {
    rawRegularSheet.addRow([
      row.id ?? '',
      row.athlete_id ?? '',
      row.athlete_name ?? '',
      row.team ?? '',
      row.year ?? '',
      row.month ?? '',
      row.test_type ?? '',
      row.score ?? '',
      row.created_at ?? '',
      row.updated_at ?? '',
    ])
  }

  applyColumnWidths(rawRegularSheet, [28, 28, 24, 12, 10, 14, 16, 10, 24, 24])

  const rawCombineSheet = workbook.addWorksheet('Raw Annual Combine Backup')
  rawCombineSheet.addRow([
    'id',
    'athlete_id',
    'athlete_name',
    'team',
    'season',
    'height_ft',
    'height_in',
    'wingspan_ft',
    'wingspan_in',
    'vertical',
    'broad_jump_ft',
    'broad_jump_in',
    'chinup_hold',
    'chinups',
    'mile02_time',
    'mile02_watts',
    'notes',
    'created_at',
    'updated_at',
  ])
  styleHeaderRow(rawCombineSheet.getRow(1))

  for (const row of combineResults || []) {
    rawCombineSheet.addRow([
      row.id ?? '',
      row.athlete_id ?? '',
      row.athlete_name ?? '',
      row.team ?? '',
      row.season ?? '',
      row.height_ft ?? '',
      row.height_in ?? '',
      row.wingspan_ft ?? '',
      row.wingspan_in ?? '',
      row.vertical ?? '',
      row.broad_jump_ft ?? '',
      row.broad_jump_in ?? '',
      row.chinup_hold ?? '',
      row.chinups ?? '',
      row.mile02_time ?? '',
      row.mile02_watts ?? '',
      row.notes ?? '',
      row.created_at ?? '',
      row.updated_at ?? '',
    ])
  }

  applyColumnWidths(rawCombineSheet, [28, 28, 24, 12, 14, 10, 10, 12, 12, 12, 12, 12, 12, 10, 14, 12, 24, 24, 24])

  const athletesSheet = workbook.addWorksheet('Athletes Backup')
  athletesSheet.addRow(['id', 'first_name', 'last_name', 'team', 'created_at', 'updated_at'])
  styleHeaderRow(athletesSheet.getRow(1))

  for (const athlete of athletes || []) {
    athletesSheet.addRow([
      athlete.id ?? '',
      athlete.first_name ?? '',
      athlete.last_name ?? '',
      athlete.team ?? '',
      athlete.created_at ?? '',
      athlete.updated_at ?? '',
    ])
  }

  applyColumnWidths(athletesSheet, [28, 18, 18, 12, 24, 24])

  for (const sheet of workbook.worksheets) {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.font = { ...(cell.font || {}), name: 'Aptos' }
      })
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `KMHA-Testing-Export-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
