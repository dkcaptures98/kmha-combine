import { TestType, TEST_LABELS } from '@/types'
import { formatScore, formatChange } from '@/lib/analytics'

interface ChangeEntry {
  athlete: { first_name: string; last_name: string; team: string }
  change: number
  firstScore: number
  latestScore: number
}

interface ChangeStatsTableProps {
  testType: TestType
  data: ChangeEntry[]
}

export default function ChangeStatsTable({ testType, data }: ChangeStatsTableProps) {
  // Sort alphabetically by last name
  const sorted = [...data].sort((a, b) =>
    a.athlete.last_name.localeCompare(b.athlete.last_name)
  )

  return (
    <div className="kmha-card overflow-hidden">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e3a5f' }}>
        <h3 className="font-display font-semibold text-sm tracking-wider" style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
          {TEST_LABELS[testType]} — Most Improved
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th className="text-left">Athlete</th>
              <th className="text-left">Team</th>
              <th className="text-right">Start</th>
              <th className="text-right">Latest</th>
              <th className="text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6" style={{ color: '#475569' }}>No improvement data available</td></tr>
            )}
            {sorted.map((entry, i) => (
              <tr key={i}>
                <td className="font-medium" style={{ color: '#e2e8f0' }}>
                  {entry.athlete.last_name}, {entry.athlete.first_name}
                </td>
                <td><span className="team-badge">{entry.athlete.team}</span></td>
                <td className="text-right" style={{ color: '#64748b' }}>
                  {formatScore(entry.firstScore, testType)}
                </td>
                <td className="text-right" style={{ color: '#94a3b8' }}>
                  {formatScore(entry.latestScore, testType)}
                </td>
                <td className="text-right font-display font-semibold stat-up">
                  {formatChange(entry.change, testType)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
