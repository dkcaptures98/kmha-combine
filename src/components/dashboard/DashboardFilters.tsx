'use client'

import { IN_SEASON_MONTHS, OFF_SEASON_MONTHS, ALL_MONTHS, TEAMS } from '@/types'

interface FiltersProps {
  selectedTeams: string[]
  selectedYear: number | null
  selectedMonths: string[]
  availableYears: number[]
  onTeamsChange: (teams: string[]) => void
  onYearChange: (year: number | null) => void
  onMonthsChange: (months: string[]) => void
}

export default function DashboardFilters({
  selectedTeams, selectedYear, selectedMonths, availableYears,
  onTeamsChange, onYearChange, onMonthsChange
}: FiltersProps) {

  function toggleTeam(team: string) {
    if (selectedTeams.includes(team)) {
      onTeamsChange(selectedTeams.filter(t => t !== team))
    } else {
      onTeamsChange([...selectedTeams, team])
    }
  }

  function toggleMonth(month: string) {
    if (selectedMonths.includes(month)) {
      onMonthsChange(selectedMonths.filter(m => m !== month))
    } else {
      onMonthsChange([...selectedMonths, month])
    }
  }

  function setSeasonPreset(preset: 'inseason' | 'offseason' | 'all') {
    if (preset === 'inseason') onMonthsChange([...IN_SEASON_MONTHS])
    else if (preset === 'offseason') onMonthsChange([...OFF_SEASON_MONTHS])
    else onMonthsChange([])
  }

  const inSeasonActive = IN_SEASON_MONTHS.every(m => selectedMonths.includes(m)) && selectedMonths.length === IN_SEASON_MONTHS.length
  const offSeasonActive = OFF_SEASON_MONTHS.every(m => selectedMonths.includes(m)) && selectedMonths.length === OFF_SEASON_MONTHS.length

  return (
    <div className="kmha-card p-4 space-y-4">
      {/* Team multi-select */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
            Teams
          </label>
          <div className="flex gap-2">
            <button onClick={() => onTeamsChange([...TEAMS])} className="text-xs" style={{ color: '#38bdf8' }}>All</button>
            <span style={{ color: '#334155' }}>·</span>
            <button onClick={() => onTeamsChange([])} className="text-xs" style={{ color: '#475569' }}>None</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEAMS.map(team => (
            <button
              key={team}
              onClick={() => toggleTeam(team)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                background: selectedTeams.includes(team) ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedTeams.includes(team) ? 'rgba(14,165,233,0.4)' : '#1e3a5f'}`,
                color: selectedTeams.includes(team) ? '#38bdf8' : '#475569',
              }}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Year */}
        <div>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
            Year
          </label>
          <select
            value={selectedYear ?? ''}
            onChange={e => onYearChange(e.target.value ? parseInt(e.target.value) : null)}
            className="kmha-select w-full"
          >
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Season preset */}
        <div>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
            Season
          </label>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSeasonPreset('inseason')}
              className="flex-1 text-xs py-1.5 rounded transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: inSeasonActive ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${inSeasonActive ? 'rgba(52,211,153,0.4)' : '#1e3a5f'}`,
                color: inSeasonActive ? '#34d399' : '#475569',
              }}
            >
              In-Season
            </button>
            <button
              onClick={() => setSeasonPreset('offseason')}
              className="flex-1 text-xs py-1.5 rounded transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: offSeasonActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${offSeasonActive ? 'rgba(251,191,36,0.4)' : '#1e3a5f'}`,
                color: offSeasonActive ? '#fbbf24' : '#475569',
              }}
            >
              Off-Season
            </button>
          </div>
        </div>
      </div>

      {/* Month multi-select */}
      <div>
        <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#64748b', fontFamily: 'var(--font-display)' }}>
          Months
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_MONTHS.map(month => (
            <button
              key={month}
              onClick={() => toggleMonth(month)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: selectedMonths.includes(month) ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedMonths.includes(month) ? 'rgba(14,165,233,0.4)' : '#1e3a5f'}`,
                color: selectedMonths.includes(month) ? '#38bdf8' : '#475569',
              }}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
