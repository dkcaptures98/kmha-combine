export type TestType = 'Sprint' | 'Vertical' | 'Chinups' | 'ChinHold' | 'BroadJump'

export type Month =
  | 'September' | 'October' | 'November' | 'December'
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August'

export const MONTH_ORDER: Month[] = [
  'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'
]

export const ALL_MONTHS: Month[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const CALENDAR_MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const IN_SEASON_MONTHS: Month[] = [
  'September', 'October', 'November', 'December', 'January', 'February', 'March'
]

export const OFF_SEASON_MONTHS: Month[] = [
  'May', 'June', 'July', 'August'
]

export const TEAMS = [
  'U10AA', 'U10AAA',
  'U11AA', 'U11AAA',
  'U12AA', 'U12AAA',
  'U13AA', 'U13AAA', 'U13AALR',
  'U14AA', 'U14AAA',
  'U15AA', 'U15AAA', 'U15AALR', 'U15ALR',
  'U16AA', 'U16AAA',
  'U18AA', 'U18AAA', 'U18ALR',
] as const

export type Team = typeof TEAMS[number]

export const TEST_TYPES: TestType[] = ['Sprint', 'Vertical', 'Chinups', 'ChinHold', 'BroadJump']

export const TEST_LABELS: Record<TestType, string> = {
  Sprint: '10m Sprint',
  Vertical: 'Vertical Jump',
  Chinups: 'Chin-ups (reps)',
  ChinHold: 'Chin Hold (sec)',
  BroadJump: 'Broad Jump',
}

export const TEST_UNITS: Record<TestType, string> = {
  Sprint: 'sec',
  Vertical: 'cm',
  Chinups: 'reps',
  ChinHold: 'sec',
  BroadJump: 'ft',
}

// Lower is better for Sprint, higher is better for everything else
export const TEST_LOWER_IS_BETTER: Record<TestType, boolean> = {
  Sprint: true,
  Vertical: false,
  Chinups: false,
  ChinHold: false,
  BroadJump: false,
}

export interface Athlete {
  id: string
  first_name: string
  last_name: string
  team: string
  active?: boolean
}

export interface CombineEntry {
  id: string
  athlete_id: string
  athlete_name: string
  team: string
  score: number
  month: string
  year: number
  test_type: TestType
  notes?: string
  created_at?: string
}

export interface AthleteStats {
  athlete: Athlete
  entries: CombineEntry[]
  latestScores: Partial<Record<TestType, number>>
  bestScores: Partial<Record<TestType, number>>
  changes: Partial<Record<TestType, number>>
}

// Season helpers
export function getSeasonLabel(year: number, month: Month): string {
  if (IN_SEASON_MONTHS.includes(month)) {
    if (['September', 'October', 'November', 'December'].includes(month)) {
      return `${year}-${year + 1} In-Season`
    } else {
      return `${year - 1}-${year} In-Season`
    }
  }
  return `${year} Off-Season`
}

export function getSeasonStartYear(seasonLabel: string): number {
  const match = seasonLabel.match(/(\d{4})/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}

export function getAvailableSeasons(entries: CombineEntry[]): string[] {
  const seasons = new Set<string>()
  entries.forEach(e => {
    seasons.add(getSeasonLabel(e.year, e.month as Month))
  })
  return Array.from(seasons).sort().reverse()
}

// For change calculation:
// In-season: compare September (start) vs latest month in season
// Off-season: compare May vs latest month
export function getSeasonFirstMonth(month: Month, year: number): { month: Month, year: number } {
  if (IN_SEASON_MONTHS.includes(month)) {
    if (['January', 'February', 'March'].includes(month)) {
      return { month: 'September', year: year - 1 }
    }
    return { month: 'September', year }
  }
  return { month: 'May', year }
}
