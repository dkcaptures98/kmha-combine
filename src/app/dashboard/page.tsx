'use client'

import { useState, useEffect, useMemo } from 'react'
import { CombineEntry, Athlete, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS, TEAMS } from '@/types'
import { getTeamLeaders, getTopChanges, formatScore } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const ALL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ALL_YEARS = [2024, 2025, 2026, 2027, 2028]

const SEASONS = [
  { label: '2024-2025 In-Season', months: ['September','October','November','December','January','February','March'], years: [2024,2025], fallYear: 2024, springYear: 2025 },
  { label: '2025 Off-Season',     months: ['May','June','July','August'], years: [2025], fallYear: 2025, springYear: 2025 },
  { label: '2025-2026 In-Season', months: ['September','October','November','December','January','February','March'], years: [2025,2026], fallYear: 2025, springYear: 2026 },
  { label: '2026 Off-Season',     months: ['May','June','July','August'], years: [2026], fallYear: 2026, springYear: 2026 },
  { label: '2026-2027 In-Season', months: ['September','October','November','December','January','February','March'], years: [2026,2027], fallYear: 2026, springYear: 2027 },
  { label: '2027 Off-Season',     months: ['May','June','July','August'], years: [2027], fallYear: 2027, springYear: 2027 },
  { label: '2027-2028 In-Season', months: ['September','October','November','December','January','February','March'], years: [2027,2028], fallYear: 2027, springYear: 2028 },
]

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(37,99,235,0.12)' : 'rgba(10,20,40,0.8)', border: `1px solid ${accent ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.12)'}`, borderRadius: '10px', padding: '20px 24px' }}>
      <p style={{ color: '#475569', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>{label}</p>
      <p style={{ color: accent ? '#60a5fa' : '#f0f4f8', fontSize: '32px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  )
}

function Leaderboard({ testType, entries, athletes }: { testType: TestType; entries: CombineEntry[]; athletes: Athlete[] }) {
  const leaders = getTeamLeaders(entries, athletes, testType, 5)
  const medalColors = ['#FFB800', '#94a3b8', '#cd7f32']
  return (
    <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[testType]}</h3>
        <span style={{ fontSize: '11px', color: '#334155', fontFamily: 'var(--font-display)' }}>{TEST_UNITS[testType]}</span>
      </div>
      {leaders.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: '24px', fontSize: '13px', margin: 0 }}>No data for selected filters</p>}
      {leaders.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: i < leaders.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none', background: i === 0 ? 'rgba(255,184,0,0.04)' : 'transparent' }}>
          <span style={{ width: '20px', textAlign: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: i < 3 ? medalColors[i] : '#334155' }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.athlete.first_name} {l.athlete.last_name}</p>
            <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{l.athlete.team}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: i < 3 ? medalColors[i] : '#475569', flexShrink: 0 }}>{formatScore(l.score, testType)}</span>
        </div>
      ))}
    </div>
  )
}

function MultiSelect({ label, options, selected, onToggle, onAll, onNone }: {
  label: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; onAll?: () => void; onNone?: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{label}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {onAll && <button onClick={onAll} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', padding: 0 }}>All</button>}
          {onNone && <button onClick={onNone} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '11px', cursor: 'pointer', padding: 0 }}>None</button>}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {options.map(opt => {
          const sel = selected.includes(opt)
          return (
            <button key={opt} onClick={() => onToggle(opt)} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: sel ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sel ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`, color: sel ? '#60a5fa' : '#475569' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTest, setActiveTest] = useState<TestType>('Sprint')
  const [view, setView] = useState<'leaderboard' | 'changes'>('leaderboard')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([...TEAMS])
  const [filterMode, setFilterMode] = useState<'season' | 'custom'>('season')
  const [activeSeason, setActiveSeason] = useState('2025-2026 In-Season')
  const [customYears, setCustomYears] = useState<number[]>([2025, 2026])
  const [customMonths, setCustomMonths] = useState<string[]>([...ALL_MONTHS])

  useEffect(() => {
    Promise.all([fetch('/api/athletes').then(r => r.json()), fetch('/api/entries').then(r => r.json())])
      .then(([a, e]) => { setAthletes(a); setEntries(e); setLoading(false) })
  }, [])

  const currentSeason = useMemo(() => SEASONS.find(s => s.label === activeSeason) || SEASONS[2], [activeSeason])

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedTeams.length > 0 && !selectedTeams.includes(e.team)) return false
      if (filterMode === 'season') {
        if (!currentSeason.years.includes(e.year)) return false
        if (!currentSeason.months.includes(e.month)) return false
        if (currentSeason.years.length === 2) {
          const fallMonths = ['September','October','November','December']
          const springMonths = ['January','February','March']
          if (fallMonths.includes(e.month) && e.year !== currentSeason.fallYear) return false
          if (springMonths.includes(e.month) && e.year !== currentSeason.springYear) return false
        }
      } else {
        if (customYears.length > 0 && !customYears.includes(e.year)) return false
        if (customMonths.length > 0 && !customMonths.includes(e.month)) return false
      }
      return true
    })
  }, [entries, selectedTeams, filterMode, currentSeason, customYears, customMonths])

  const filteredAthletes = useMemo(() => selectedTeams.length === 0 ? athletes : athletes.filter(a => selectedTeams.includes(a.team)), [athletes, selectedTeams])
  const topChanges = useMemo(() => getTopChanges(filteredEntries, filteredAthletes, activeTest, 50), [filteredEntries, filteredAthletes, activeTest])

  const seasonsWithData = useMemo(() => SEASONS.filter(s =>
    entries.some(e => s.years.includes(e.year) && s.months.includes(e.month))
  ), [entries])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
        <p style={{ color: '#475569', fontSize: '13px' }}>Loading combine data...</p>
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>COMBINE DASHBOARD</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Kitchener Minor Hockey Association</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
          <span style={{ color: '#475569', fontSize: '12px' }}>Live Data</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Tests" value={filteredEntries.length.toLocaleString()} accent />
        <StatCard label="Athletes" value={new Set(filteredEntries.map(e => e.athlete_id)).size} />
        <StatCard label="Teams" value={new Set(filteredEntries.map(e => e.team)).size} />
      </div>

      <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button onClick={() => setFilterMode('season')} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: filterMode === 'season' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filterMode === 'season' ? '#2563eb' : 'rgba(59,130,246,0.15)'}`, color: filterMode === 'season' ? 'white' : '#475569', boxShadow: filterMode === 'season' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none' }}>Season Preset</button>
          <button onClick={() => setFilterMode('custom')} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', background: filterMode === 'custom' ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filterMode === 'custom' ? '#2563eb' : 'rgba(59,130,246,0.15)'}`, color: filterMode === 'custom' ? 'white' : '#475569', boxShadow: filterMode === 'custom' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none' }}>Custom Range</button>
        </div>

        {filterMode === 'season' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Select Season</label>
            <select value={activeSeason} onChange={e => setActiveSeason(e.target.value)} className="kmha-select" style={{ width: '100%', maxWidth: '320px' }}>
              {SEASONS.map(s => <option key={s.label} value={s.label}>{s.label}{seasonsWithData.some(sd => sd.label === s.label) ? '' : ' (no data yet)'}</option>)}
            </select>
            <div style={{ marginTop: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '6px', padding: '8px 12px', display: 'inline-block' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                <strong style={{ color: '#60a5fa' }}>{activeSeason}</strong>{' · '}{currentSeason.months.join(', ')}{currentSeason.years.length === 2 ? ` (${currentSeason.years[0]}–${currentSeason.years[1]})` : ` (${currentSeason.years[0]})`}
              </span>
            </div>
          </div>
        )}

        {filterMode === 'custom' && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MultiSelect
              label="Years (multi-select)"
              options={ALL_YEARS.map(String)}
              selected={customYears.map(String)}
              onToggle={v => setCustomYears(prev => prev.includes(+v) ? prev.filter(y => y !== +v) : [...prev, +v])}
              onAll={() => setCustomYears([...ALL_YEARS])}
              onNone={() => setCustomYears([])}
            />
            <MultiSelect
              label="Months (multi-select)"
              options={ALL_MONTHS}
              selected={customMonths}
              onToggle={v => setCustomMonths(prev => prev.includes(v) ? prev.filter(m => m !== v) : [...prev, v])}
              onAll={() => setCustomMonths([...ALL_MONTHS])}
              onNone={() => setCustomMonths([])}
            />
          </div>
        )}

        <MultiSelect
          label="Teams"
          options={[...TEAMS]}
          selected={selectedTeams}
          onToggle={t => setSelectedTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
          onAll={() => setSelectedTeams([...TEAMS])}
          onNone={() => setSelectedTeams([])}
        />
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TEST_TYPES.map(test => (
          <button key={test} onClick={() => setActiveTest(test)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', background: activeTest === test ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeTest === test ? '#2563eb' : 'rgba(59,130,246,0.1)'}`, color: activeTest === test ? 'white' : '#475569', boxShadow: activeTest === test ? '0 4px 12px rgba(37,99,235,0.25)' : 'none' }}>
            {TEST_LABELS[test]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['leaderboard', 'changes'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-display)', cursor: 'pointer', background: view === v ? 'rgba(59,130,246,0.15)' : 'transparent', border: `1px solid ${view === v ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`, color: view === v ? '#60a5fa' : '#475569' }}>
            {v === 'leaderboard' ? 'Leaderboards' : 'Most Improved'}
          </button>
        ))}
      </div>

      {view === 'leaderboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {TEST_TYPES.map(test => <Leaderboard key={test} testType={test} entries={filteredEntries} athletes={filteredAthletes} />)}
        </div>
      )}

      {view === 'changes' && (
        <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>{TEST_LABELS[activeTest]} — Most Improved</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Athlete','Team','Start','Latest','Improvement'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Athlete' ? 'left' : 'right', fontSize: '11px', fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {topChanges.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#334155', fontSize: '13px' }}>No improvement data for this selection</td></tr>}
                {[...topChanges].sort((a,b) => a.athlete.last_name.localeCompare(b.athlete.last_name)).map((c,i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '10px 16px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{c.athlete.last_name}, {c.athlete.first_name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}><span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{c.athlete.team}</span></td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>{formatScore(c.firstScore, activeTest)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontSize: '13px' }}>{formatScore(c.latestScore, activeTest)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#34d399', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>+{c.change.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
