'use client'
import { useState, useEffect, useRef } from 'react'
import { Athlete, TestType, TEST_TYPES, TEST_LABELS } from '@/types'
import { formatScore } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/athletes').then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([a, e]) => { setAthletes(a); setEntries(e); setLoading(false) })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const filtered = query.length < 2 ? [] : athletes.filter(a =>
    `${a.first_name} ${a.last_name} ${a.team}`.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  function getBestScore(athleteId: string, test: TestType) {
    const e = entries.filter(e => e.athlete_id === athleteId && e.test_type === test)
    if (!e.length) return null
    return test === 'Sprint' ? Math.min(...e.map((x: any) => x.score)) : Math.max(...e.map((x: any) => x.score))
  }

  return (
    <div style={{ paddingBottom: '48px' }}>
      <div style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', padding: '24px 0 20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>ATHLETE SEARCH</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>Find any athlete instantly</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or team..."
          style={{ width: '100%', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.3)', color: 'white', borderRadius: '12px', padding: '16px 20px', fontSize: '18px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.7)'}
          onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.3)'}
        />
        {loading && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '13px' }}>Loading...</span>}
        {!loading && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: '13px' }}>{athletes.length} athletes</span>}
      </div>

      {query.length >= 2 && filtered.length === 0 && (
        <p style={{ color: '#475569', textAlign: 'center', padding: '32px', fontSize: '14px' }}>No athletes found for "{query}"</p>
      )}

      {query.length < 2 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#334155' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏒</p>
          <p style={{ fontSize: '14px', margin: 0 }}>Type at least 2 characters to search</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(athlete => {
          const athleteEntries = entries.filter(e => e.athlete_id === athlete.id)
          const testCount = new Set(athleteEntries.map((e: any) => e.test_type)).size
          return (
            <a key={athlete.id} href={`/athlete?id=${athlete.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '10px', padding: '16px', transition: 'border-color 0.15s', cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.12)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                    {athlete.first_name[0]}{athlete.last_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{athlete.first_name} {athlete.last_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{athlete.team}</span>
                      <span style={{ color: '#334155', fontSize: '11px' }}>{testCount} test types · {athleteEntries.length} entries</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {TEST_TYPES.map(test => {
                      const best = getBestScore(athlete.id, test)
                      if (!best) return null
                      return (
                        <div key={test} style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: '10px', color: '#334155', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{TEST_LABELS[test].split(' ')[0]}</p>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-display)' }}>{formatScore(best, test)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <span style={{ color: '#3b82f6', fontSize: '18px', flexShrink: 0 }}>→</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
