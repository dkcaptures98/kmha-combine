'use client'

import { useEffect, useMemo, useState } from 'react'
import { TEAMS, ALL_MONTHS, TEST_LABELS, TEST_TYPES, TestType } from '@/types'

export const dynamic = 'force-dynamic'

const SEASONS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028']

type RegularEntry = {
  id?: string
  athlete_id?: string
  athlete_name: string
  team: string
  year: number
  month: string
  test_type: string
  score: number
}

type CombineResult = {
  id?: string
  athlete_id?: string
  athlete_name: string
  team: string
  season: string
  height_ft?: number | null
  height_in?: number | null
  wingspan_ft?: number | null
  wingspan_in?: number | null
  vertical?: number | null
  broad_jump_ft?: number | null
  broad_jump_in?: number | null
  chinup_hold?: number | null
  chinups?: number | null
  mile02_time?: string | null
  mile02_watts?: number | null
  notes?: string | null
}

type RegularWideRow = {
  key: string
  team: string
  athlete_name: string
  year: number
  month: string
  Sprint?: number | string
  Vertical?: number | string
  BroadJump?: number | string
  Chinups?: number | string
  ChinHold?: number | string
}

function formatJump(ft?: number | null, inches?: number | null) {
  if (ft == null && inches == null) return '—'
  return `${ft ?? 0}'${inches ?? 0}"`
}

function monthIndex(month: string) {
  return ALL_MONTHS.indexOf(month as any)
}

function scoreFor(row: RegularWideRow, test: TestType) {
  const value = row[test as keyof RegularWideRow]
  return value === undefined || value === null || value === '' ? '—' : value
}

function isNumeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
}

function average(values: unknown[]) {
  const nums = values.filter(isNumeric) as number[]
  if (!nums.length) return '—'
  return (nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(2)
}

export default function ResultsPage() {
  const [mode, setMode] = useState<'regular' | 'combine'>('regular')
  const [regularEntries, setRegularEntries] = useState<RegularEntry[]>([])
  const [combineResults, setCombineResults] = useState<CombineResult[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    Promise.all([
      fetch('/api/entries').then(r => r.json()),
      fetch('/api/combine').then(r => r.json()),
    ])
      .then(([entries, combine]) => {
        setRegularEntries(Array.isArray(entries) ? entries : [])
        setCombineResults(Array.isArray(combine) ? combine : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const years = useMemo(() => {
    return Array.from(new Set(regularEntries.map(entry => entry.year))).sort((a, b) => b - a)
  }, [regularEntries])

  const regularRows = useMemo(() => {
    const map = new Map<string, RegularWideRow>()

    for (const entry of regularEntries) {
      if (selectedTeams.length && !selectedTeams.includes(entry.team)) continue
      if (selectedMonth !== 'All' && entry.month !== selectedMonth) continue
      if (selectedYear !== 'All' && String(entry.year) !== selectedYear) continue

      const key = `${entry.team}|${entry.athlete_name}|${entry.year}|${entry.month}`

      if (!map.has(key)) {
        map.set(key, {
          key,
          team: entry.team,
          athlete_name: entry.athlete_name,
          year: entry.year,
          month: entry.month,
        })
      }

      const row = map.get(key)!
      row[entry.test_type as keyof RegularWideRow] = entry.score as never
    }

    return Array.from(map.values()).sort((a, b) => {
      const teamCompare = a.team.localeCompare(b.team)
      if (teamCompare !== 0) return teamCompare

      const nameCompare = a.athlete_name.localeCompare(b.athlete_name)
      if (nameCompare !== 0) return nameCompare

      if (a.year !== b.year) return a.year - b.year

      return monthIndex(a.month) - monthIndex(b.month)
    })
  }, [regularEntries, selectedTeams, selectedMonth, selectedYear])

  const filteredCombine = useMemo(() => {
    return combineResults
      .filter(row => {
        if (selectedTeams.length && !selectedTeams.includes(row.team)) return false
        if (selectedSeason !== 'All' && row.season !== selectedSeason) return false
        return true
      })
      .sort((a, b) => {
        const teamCompare = a.team.localeCompare(b.team)
        if (teamCompare !== 0) return teamCompare
        return a.athlete_name.localeCompare(b.athlete_name)
      })
  }, [combineResults, selectedTeams, selectedSeason])

  function toggleTeam(team: string) {
    setSelectedTeams(prev => {
      if (prev.includes(team)) return prev.filter(value => value !== team)
      return [...prev, team]
    })
  }

  function selectAllTeams() {
    setSelectedTeams([])
  }

  const groupedRegular = useMemo(() => {
    return regularRows.reduce<Record<string, RegularWideRow[]>>((acc, row) => {
      acc[row.team] ||= []
      acc[row.team].push(row)
      return acc
    }, {})
  }, [regularRows])

  const groupedCombine = useMemo(() => {
    return filteredCombine.reduce<Record<string, CombineResult[]>>((acc, row) => {
      acc[row.team] ||= []
      acc[row.team].push(row)
      return acc
    }, {})
  }, [filteredCombine])

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>
          RESULTS
        </h1>

        <a
          href="/api/admin/export"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 18px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
            border: 'none',
            color: 'white',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
          }}
        >
          Export Excel
        </a>
      </div>

      <div style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMode('regular')}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: mode === 'regular' ? '1px solid rgba(96,165,250,0.6)' : '1px solid rgba(59,130,246,0.2)',
              background: mode === 'regular' ? 'rgba(59,130,246,0.18)' : 'rgba(5,15,35,0.8)',
              color: mode === 'regular' ? '#60a5fa' : '#64748b',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Regular Testing
          </button>

          <button
            type="button"
            onClick={() => setMode('combine')}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: mode === 'combine' ? '1px solid rgba(96,165,250,0.6)' : '1px solid rgba(59,130,246,0.2)',
              background: mode === 'combine' ? 'rgba(59,130,246,0.18)' : 'rgba(5,15,35,0.8)',
              color: mode === 'combine' ? '#60a5fa' : '#64748b',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Annual Combine
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {mode === 'regular' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Month
                </label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="kmha-select w-full">
                  <option value="All">All Months</option>
                  {ALL_MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Year
                </label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="kmha-select w-full">
                  <option value="All">All Years</option>
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Season
              </label>
              <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="kmha-select w-full">
                <option value="All">All Seasons</option>
                {SEASONS.map(season => <option key={season} value={season}>{season}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Teams
            </label>
            <button
              type="button"
              onClick={selectAllTeams}
              style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}
            >
              Show all
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEAMS.map(team => {
              const active = selectedTeams.includes(team)
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => toggleTeam(team)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: active ? '1px solid rgba(96,165,250,0.6)' : '1px solid rgba(59,130,246,0.16)',
                    background: active ? 'rgba(59,130,246,0.18)' : 'rgba(5,15,35,0.6)',
                    color: active ? '#60a5fa' : '#64748b',
                    fontSize: '11px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {team}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          Loading results...
        </div>
      ) : mode === 'regular' ? (
        <div style={{ display: 'grid', gap: '18px' }}>
          {Object.entries(groupedRegular).map(([team, rows]) => (
            <div key={team} style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(5,15,35,0.45)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{team}</h2>
                <span style={{ color: '#64748b', fontSize: '12px' }}>{rows.length} rows</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      {['Athlete', 'Year', 'Month', '10m Sprint', 'Vertical Jump', 'Broad Jump', 'Chinups', 'Chin Hold'].map(header => (
                        <th key={header} style={{ padding: '10px 12px', color: '#60a5fa', fontSize: '10px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(59,130,246,0.12)', textAlign: header === 'Athlete' ? 'left' : 'center' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{row.athlete_name}</td>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>{row.year}</td>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>{row.month}</td>
                        {TEST_TYPES.map(test => (
                          <td key={test} style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>
                            {scoreFor(row, test)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr style={{ background: 'rgba(59,130,246,0.06)' }}>
                      <td style={{ padding: '9px 12px', color: '#60a5fa', fontSize: '11px', fontWeight: 700 }}>Team Average</td>
                      <td />
                      <td />
                      {TEST_TYPES.map(test => (
                        <td key={test} style={{ padding: '9px 12px', color: '#60a5fa', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}>
                          {average(rows.map(row => row[test as keyof RegularWideRow]))}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {regularRows.length === 0 && (
            <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
              No regular testing results match the selected filters.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {Object.entries(groupedCombine).map(([team, rows]) => (
            <div key={team} style={{ background: 'rgba(10,20,40,0.86)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(5,15,35,0.45)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{team}</h2>
                <span style={{ color: '#64748b', fontSize: '12px' }}>{rows.length} athletes</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                  <thead>
                    <tr>
                      {['Athlete', 'Season', 'Height', 'Wingspan', 'Vertical', 'Broad Jump', 'Chin Hold', 'Chinups', '0.2 Mile', 'Avg Watts', 'Notes'].map(header => (
                        <th key={header} style={{ padding: '10px 12px', color: '#60a5fa', fontSize: '10px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(59,130,246,0.12)', textAlign: header === 'Athlete' || header === 'Notes' ? 'left' : 'center' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id || `${row.team}-${row.athlete_name}-${row.season}`} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{row.athlete_name}</td>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>{row.season}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{formatJump(row.height_ft, row.height_in)}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{formatJump(row.wingspan_ft, row.wingspan_in)}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{row.vertical ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{formatJump(row.broad_jump_ft, row.broad_jump_in)}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{row.chinup_hold ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{row.chinups ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{row.mile02_time ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }}>{row.mile02_watts ?? '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: '12px' }}>{row.notes ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {filteredCombine.length === 0 && (
            <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
              No annual combine results match the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
