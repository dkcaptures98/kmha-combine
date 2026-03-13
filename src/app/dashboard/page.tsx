'use client'

import { useState, useEffect, useMemo } from 'react'
import { CombineEntry, Athlete, TestType, TEST_TYPES, TEAMS } from '@/types'
import { getTeamLeaders, getTopChanges, formatScore } from '@/lib/analytics'
import DashboardFilters from '@/components/dashboard/DashboardFilters'
import Leaderboard from '@/components/dashboard/Leaderboard'
import ChangeStatsTable from '@/components/dashboard/ChangeStatsTable'
import LeaderboardChart from '@/components/charts/LeaderboardChart'
import StatCard from '@/components/ui/StatCard'

const SEASON_MONTHS = ['September', 'October', 'November', 'December', 'January', 'February', 'March']

export default function DashboardPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTest, setActiveTest] = useState<TestType>('Sprint')
  const [view, setView] = useState<'leaderboard' | 'changes' | 'charts'>('leaderboard')

  // Filters
  const [selectedTeams, setSelectedTeams] = useState<string[]>([...TEAMS])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([...SEASON_MONTHS])

  useEffect(() => {
    async function load() {
      const [aRes, eRes] = await Promise.all([
        fetch('/api/athletes'),
        fetch('/api/entries'),
      ])
      const [athleteData, entryData] = await Promise.all([aRes.json(), eRes.json()])
      setAthletes(athleteData)
      setEntries(entryData)
      setLoading(false)
    }
    load()
  }, [])

  const availableYears = useMemo(() => {
    const years = [...new Set(entries.map(e => e.year))].sort().reverse()
    return years
  }, [entries])

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedTeams.length > 0 && !selectedTeams.includes(e.team)) return false
      if (selectedYear && e.year !== selectedYear) return false
      if (selectedMonths.length > 0 && !selectedMonths.includes(e.month)) return false
      return true
    })
  }, [entries, selectedTeams, selectedYear, selectedMonths])

  const filteredAthletes = useMemo(() => {
    if (selectedTeams.length === 0) return athletes
    return athletes.filter(a => selectedTeams.includes(a.team))
  }, [athletes, selectedTeams])

  const leaders = useMemo(() =>
    getTeamLeaders(filteredEntries, filteredAthletes, activeTest, 10),
    [filteredEntries, filteredAthletes, activeTest]
  )

  const changes = useMemo(() =>
    getTopChanges(filteredEntries, filteredAthletes, activeTest, 50),
    [filteredEntries, filteredAthletes, activeTest]
  )

  // Stats summary
  const totalTests = filteredEntries.length
  const teamsActive = new Set(filteredEntries.map(e => e.team)).size
  const athletesActive = new Set(filteredEntries.map(e => e.athlete_id)).size

  const testLabels: Record<TestType, string> = {
    Sprint: '10m Sprint', Vertical: 'Vertical', Chinups: 'Chin-ups', ChinHold: 'Chin Hold', BroadJump: 'Broad Jump'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ice-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: '#475569' }}>Loading combine data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">COMBINE DASHBOARD</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Kitchener Minor Hockey Association
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color: '#475569' }}>Live Data</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Tests" value={totalTests.toLocaleString()} accent />
        <StatCard label="Athletes" value={athletesActive} />
        <StatCard label="Teams Active" value={teamsActive} />
      </div>

      {/* Filters */}
      <DashboardFilters
        selectedTeams={selectedTeams}
        selectedYear={selectedYear}
        selectedMonths={selectedMonths}
        availableYears={availableYears}
        onTeamsChange={setSelectedTeams}
        onYearChange={setSelectedYear}
        onMonthsChange={setSelectedMonths}
      />

      {/* Test type tabs */}
      <div className="flex gap-1 flex-wrap">
        {TEST_TYPES.map(test => (
          <button
            key={test}
            onClick={() => setActiveTest(test)}
            className="px-4 py-2 rounded text-sm transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '12px',
              background: activeTest === test ? '#0284c7' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeTest === test ? '#0284c7' : '#1e3a5f'}`,
              color: activeTest === test ? '#fff' : '#475569',
            }}
          >
            {testLabels[test]}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1">
        {(['leaderboard', 'changes', 'charts'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-3 py-1.5 rounded text-xs transition-all capitalize"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.04em',
              background: view === v ? 'rgba(14,165,233,0.15)' : 'transparent',
              border: `1px solid ${view === v ? 'rgba(14,165,233,0.4)' : '#1e3a5f'}`,
              color: view === v ? '#38bdf8' : '#475569',
            }}
          >
            {v === 'leaderboard' ? 'Leaderboards' : v === 'changes' ? 'Most Improved' : 'Charts'}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'leaderboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEST_TYPES.map(test => {
            const testLeaders = getTeamLeaders(filteredEntries, filteredAthletes, test, 5)
            return <Leaderboard key={test} testType={test} entries={testLeaders} />
          })}
        </div>
      )}

      {view === 'changes' && (
        <div className="space-y-4">
          {TEST_TYPES.map(test => {
            const testChanges = getTopChanges(filteredEntries, filteredAthletes, test, 50)
            return <ChangeStatsTable key={test} testType={test} data={testChanges} />
          })}
        </div>
      )}

      {view === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEST_TYPES.map(test => {
            const testLeaders = getTeamLeaders(filteredEntries, filteredAthletes, test, 5)
            const chartData = testLeaders.map(l => ({
              name: `${l.athlete.last_name}`,
              score: l.score,
              team: l.athlete.team,
            }))
            return <LeaderboardChart key={test} testType={test} data={chartData} />
          })}
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
