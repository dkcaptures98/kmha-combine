import { TEST_LABELS, TEST_UNITS, TestType } from '@/types'
import { formatScore } from '@/lib/analytics'

interface LeaderboardEntry {
  athlete: { first_name: string; last_name: string; team: string }
  score: number
  month: string
  year: number
}

interface LeaderboardProps {
  testType: TestType
  entries: LeaderboardEntry[]
}

export default function Leaderboard({ testType, entries }: LeaderboardProps) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="kmha-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1e3a5f' }}>
        <h3 className="font-display font-semibold text-sm tracking-wider" style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
          {TEST_LABELS[testType]}
        </h3>
        <span className="text-xs" style={{ color: '#475569' }}>{TEST_UNITS[testType]}</span>
      </div>
      <div>
        {entries.length === 0 && (
          <p className="text-center text-sm py-6" style={{ color: '#475569' }}>No data yet</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{
            borderBottom: i < entries.length - 1 ? '1px solid #0d1b2a' : 'none',
            background: i === 0 ? 'rgba(251,191,36,0.04)' : 'transparent'
          }}>
            <span className="text-base w-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
              {i < 3 ? medals[i] : <span className="rank-num" style={{ color: '#475569' }}>{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                {entry.athlete.first_name} {entry.athlete.last_name}
              </p>
              <p className="text-xs" style={{ color: '#475569' }}>
                <span className="team-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>{entry.athlete.team}</span>
                <span className="ml-1.5">{entry.month} {entry.year}</span>
              </p>
            </div>
            <span className="font-display font-bold text-base" style={{
              color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#64748b'
            }}>
              {formatScore(entry.score, testType)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
