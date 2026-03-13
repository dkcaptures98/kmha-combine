import {
  CombineEntry, TestType, Athlete, AthleteStats,
  TEST_LOWER_IS_BETTER, Month, MONTH_ORDER, IN_SEASON_MONTHS,
  CALENDAR_MONTH_ORDER
} from '@/types'

export function getMonthIndex(month: string): number {
  return CALENDAR_MONTH_ORDER.indexOf(month)
}

export function sortEntriesByDate(entries: CombineEntry[]): CombineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return getMonthIndex(a.month) - getMonthIndex(b.month)
  })
}

export function getLatestScore(entries: CombineEntry[], testType: TestType): number | null {
  const filtered = entries.filter(e => e.test_type === testType)
  if (!filtered.length) return null
  const sorted = sortEntriesByDate(filtered)
  return sorted[sorted.length - 1].score
}

export function getBestScore(entries: CombineEntry[], testType: TestType): number | null {
  const filtered = entries.filter(e => e.test_type === testType)
  if (!filtered.length) return null
  const lowerIsBetter = TEST_LOWER_IS_BETTER[testType]
  return filtered.reduce((best, e) => {
    if (best === null) return e.score
    return lowerIsBetter ? Math.min(best, e.score) : Math.max(best, e.score)
  }, null as number | null)
}

// Season-aware change calculation
// In-season: Sep vs latest; Off-season: May vs latest
export function getSeasonChange(
  entries: CombineEntry[],
  testType: TestType,
  filterYear?: number,
  filterMonths?: string[]
): number | null {
  let relevant = entries.filter(e => e.test_type === testType)
  if (filterYear) relevant = relevant.filter(e => e.year === filterYear)
  if (filterMonths?.length) relevant = relevant.filter(e => filterMonths.includes(e.month))
  if (relevant.length < 2) return null

  const sorted = sortEntriesByDate(relevant)
  const first = sorted[0].score
  const last = sorted[sorted.length - 1].score

  const change = last - first
  // For sprint, negative change = improvement, so we flip sign for display
  return TEST_LOWER_IS_BETTER[testType] ? -change : change
}

export function getAthleteStats(
  athlete: Athlete,
  allEntries: CombineEntry[],
  filterYear?: number,
  filterMonths?: string[]
): AthleteStats {
  let entries = allEntries.filter(e => e.athlete_id === athlete.id)
  if (filterYear) entries = entries.filter(e => e.year === filterYear)
  if (filterMonths?.length) entries = entries.filter(e => filterMonths.includes(e.month))

  const testTypes: TestType[] = ['Sprint', 'Vertical', 'Chinups', 'ChinHold', 'BroadJump']
  const latestScores: Partial<Record<TestType, number>> = {}
  const bestScores: Partial<Record<TestType, number>> = {}
  const changes: Partial<Record<TestType, number>> = {}

  testTypes.forEach(t => {
    const latest = getLatestScore(entries, t)
    if (latest !== null) latestScores[t] = latest
    const best = getBestScore(entries, t)
    if (best !== null) bestScores[t] = best
    const change = getSeasonChange(entries, t)
    if (change !== null) changes[t] = change
  })

  return { athlete, entries, latestScores, bestScores, changes }
}

export function getTeamLeaders(
  entries: CombineEntry[],
  athletes: Athlete[],
  testType: TestType,
  limit = 5
): Array<{ athlete: Athlete; score: number; month: string; year: number }> {
  const lowerIsBetter = TEST_LOWER_IS_BETTER[testType]
  const byAthlete = new Map<string, CombineEntry>()

  entries.filter(e => e.test_type === testType).forEach(entry => {
    const existing = byAthlete.get(entry.athlete_id)
    if (!existing) {
      byAthlete.set(entry.athlete_id, entry)
    } else {
      const better = lowerIsBetter
        ? entry.score < existing.score
        : entry.score > existing.score
      if (better) byAthlete.set(entry.athlete_id, entry)
    }
  })

  return Array.from(byAthlete.values())
    .sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score)
    .slice(0, limit)
    .map(entry => ({
      athlete: athletes.find(a => a.id === entry.athlete_id) || {
        id: entry.athlete_id,
        first_name: entry.athlete_name.split(' ')[0],
        last_name: entry.athlete_name.split(' ').slice(1).join(' '),
        team: entry.team
      },
      score: entry.score,
      month: entry.month,
      year: entry.year,
    }))
}

export function getTopChanges(
  entries: CombineEntry[],
  athletes: Athlete[],
  testType: TestType,
  limit = 10
): Array<{ athlete: Athlete; change: number; firstScore: number; latestScore: number }> {
  const results: Array<{ athlete: Athlete; change: number; firstScore: number; latestScore: number }> = []

  athletes.forEach(athlete => {
    const athleteEntries = sortEntriesByDate(entries.filter(
      e => e.athlete_id === athlete.id && e.test_type === testType
    ))
    if (athleteEntries.length < 2) return

    const first = athleteEntries[0].score
    const last = athleteEntries[athleteEntries.length - 1].score
    const rawChange = last - first
    const change = TEST_LOWER_IS_BETTER[testType] ? -rawChange : rawChange

    if (change > 0) {
      results.push({ athlete, change, firstScore: first, latestScore: last })
    }
  })

  return results
    .sort((a, b) => b.change - a.change)
    .slice(0, limit)
}

export function formatScore(score: number, testType: TestType): string {
  if (testType === 'BroadJump') {
    // Score stored as feet.inches e.g. 5.11 means 5 ft 11 in
    const parts = score.toFixed(2).split('.')
    return `${parts[0]}' ${parts[1] || '0'}"`
  }
  if (testType === 'Sprint') return score.toFixed(2) + 's'
  if (testType === 'Vertical') return score.toFixed(1) + ' cm'
  if (testType === 'ChinHold') return score.toFixed(1) + 's'
  return score.toString()
}

export function formatChange(change: number, testType: TestType): string {
  const sign = change > 0 ? '+' : ''
  if (testType === 'Sprint') return `${sign}${change.toFixed(2)}s`
  if (testType === 'Vertical') return `${sign}${change.toFixed(1)} cm`
  if (testType === 'BroadJump') return `${sign}${change.toFixed(2)} ft`
  return `${sign}${change.toFixed(1)}`
}
