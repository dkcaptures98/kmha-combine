'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Athlete, CombineEntry, TestType, TEST_TYPES, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore } from '@/lib/analytics'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

const MONTH_ORDER = ['September','October','November','December','January','February','March','April','May','June','July','August']

function getMonthYear(entry: CombineEntry) {
  return `${entry.month.slice(0,3)} ${entry.year}`
}

function AthleteProfile() {
  const params = useSearchParams()
  const athleteId = params.get('id')
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [entries, setEntries] = useState<CombineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!athleteId) return
    Promise.all([
      fetch(`/api/athletes`).then(r => r.json()),
      fetch(`/api/entries?athlete_id=${athleteId}`).then(r => r.json())
    ]).then(([athletes, entries]) => {
      setAthlete(athletes.find((a: Athlete) => a.id === athleteId) || null)
      setEntries(entries)
      setLoading(false)
    })
  }, [athleteId])

  if (!athleteId) return <div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>No athlete selected</div>
  if (loading) return <div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>Loading...</div>
  if (!athlete) return <div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>Athlete not found</div>

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })

  const byTest: Record<TestType, CombineEntry[]> = {} as any
  TEST_TYPES.forEach(t => { byTest[t] = sortedEntries.filter(e => e.test_type === t) })

  return (
    <div style={{ paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ borderBottom:'1px solid rgba(59,130,246,0.1)', padding:'24px 0 20px', marginBottom:'24px' }}>
        <a href="/athletes" style={{ color:'#3b82f6', fontSize:'13px', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'4px', marginBottom:'12px' }}>← Back to Athletes</a>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'12px', background:'linear-gradient(135deg,#1d4ed8,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700, color:'white', fontFamily:'var(--font-display)', flexShrink:0 }}>
            {athlete.first_name[0]}{athlete.last_name[0]}
          </div>
          <div>
            <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:700, letterSpacing:'0.04em', color:'white' }}>{athlete.first_name} {athlete.last_name}</h1>
            <span style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', color:'#60a5fa', borderRadius:'4px', padding:'2px 8px', fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:600 }}>{athlete.team}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px', marginBottom:'32px' }}>
        {TEST_TYPES.map(test => {
          const testEntries = byTest[test]
          if (!testEntries.length) return null
          const best = testEntries.reduce((b, e) => {
            if (test === 'Sprint') return e.score < b.score ? e : b
            return e.score > b.score ? e : b
          })
          const latest = testEntries[testEntries.length - 1]
          const first = testEntries[0]
          const change = test === 'Sprint' ? first.score - latest.score : latest.score - first.score
          return (
            <div key={test} style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'10px', padding:'16px' }}>
              <p style={{ color:'#475569', fontSize:'11px', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 8px', fontFamily:'var(--font-display)' }}>{TEST_LABELS[test]}</p>
              <p style={{ color:'#60a5fa', fontSize:'26px', fontWeight:700, margin:'0 0 4px', fontFamily:'var(--font-display)' }}>{formatScore(latest.score, test)}</p>
              <p style={{ color:'#475569', fontSize:'11px', margin:0 }}>
                Best: <span style={{ color:'#fbbf24' }}>{formatScore(best.score, test)}</span>
                {testEntries.length > 1 && <span style={{ marginLeft:'8px', color: change > 0 ? '#34d399' : '#f87171' }}>{change > 0 ? '+' : ''}{change.toFixed(2)}</span>}
              </p>
            </div>
          )
        })}
      </div>

      {/* Score history per test */}
      {TEST_TYPES.map(test => {
        const testEntries = byTest[test]
        if (!testEntries.length) return null
        return (
          <div key={test} style={{ background:'rgba(10,20,40,0.8)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'10px', overflow:'hidden', marginBottom:'16px' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
              <h3 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#64748b', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>{TEST_LABELS[test]} History</h3>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Date','Score','vs Previous'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign: h === 'Date' ? 'left' : 'right', fontSize:'11px', fontWeight:600, color:'#334155', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'var(--font-display)', borderBottom:'1px solid rgba(59,130,246,0.08)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {testEntries.map((entry, i) => {
                    const prev = i > 0 ? testEntries[i-1] : null
                    const diff = prev ? (test === 'Sprint' ? prev.score - entry.score : entry.score - prev.score) : null
                    return (
                      <tr key={entry.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
                        <td style={{ padding:'10px 16px', color:'#e2e8f0', fontSize:'13px' }}>{entry.month} {entry.year}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', color:'#94a3b8', fontSize:'13px', fontFamily:'var(--font-display)', fontWeight:600 }}>{formatScore(entry.score, test)}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontSize:'13px', fontFamily:'var(--font-display)', fontWeight:600, color: diff === null ? '#334155' : diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#475569' }}>
                          {diff === null ? '—' : diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AthletePage() {
  return <Suspense fallback={<div style={{ textAlign:'center', padding:'48px', color:'#475569' }}>Loading...</div>}><AthleteProfile /></Suspense>
}
