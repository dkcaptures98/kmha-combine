'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Athlete = {
  id: string
  first_name: string
  last_name: string
  team: string
}

function valueOf(input: HTMLInputElement | undefined, numeric = true) {
  if (!input || input.value.trim() === '') return null
  return numeric ? Number(input.value) : input.value
}

function currentRosterPhase() {
  const month = new Date().getMonth() // 0 = January
  return month >= 3 && month <= 7 ? 'offseason' : 'inseason'
}

export default function CombineManualSave() {
  const pathname = usePathname()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (pathname !== '/combine') return

    let cancelled = false
    let attempts = 0

    const applyDetectedPhase = () => {
      if (cancelled) return
      attempts++

      const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
      const phaseSelect = selects.find(s =>
        Array.from(s.options).some(o => o.value === 'offseason') &&
        Array.from(s.options).some(o => o.value === 'inseason')
      )

      if (!phaseSelect) {
        if (attempts < 20) window.setTimeout(applyDetectedPhase, 100)
        return
      }

      const detected = currentRosterPhase()
      if (phaseSelect.value !== detected) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
        setter?.call(phaseSelect, detected)
        phaseSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    applyDetectedPhase()
    return () => { cancelled = true }
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/combine') return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saving) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pathname, saving])

  if (pathname !== '/combine') return null

  async function saveEverythingVisible() {
    setSaving(true)
    setMessage('Reading current table...')

    try {
      const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
      const teamSelect = selects.find(s => Array.from(s.options).some(o => /^U\d{2}/.test(o.value)))
      const seasonSelect = selects.find(s => Array.from(s.options).some(o => /^20\d{2}-20\d{2}$/.test(o.value)))
      const phaseSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'offseason') && Array.from(s.options).some(o => o.value === 'inseason'))

      const team = teamSelect?.value || ''
      const season = seasonSelect?.value || ''
      const rosterPhase = phaseSelect?.value || ''

      if (!team || !season || !rosterPhase) throw new Error('Select a team, season, and roster phase first.')

      const athleteRes = await fetch(`/api/athletes?team=${encodeURIComponent(team)}&season=${encodeURIComponent(season)}&roster_phase=${encodeURIComponent(rosterPhase)}`, { cache: 'no-store' })
      if (!athleteRes.ok) throw new Error('Could not load the athlete roster.')
      const athletes: Athlete[] = await athleteRes.json()
      if (!Array.isArray(athletes) || athletes.length === 0) throw new Error('No athletes were found for this roster.')

      const rows = Array.from(document.querySelectorAll('tbody tr')) as HTMLTableRowElement[]
      if (rows.length < athletes.length) throw new Error(`Only ${rows.length} table rows were found for ${athletes.length} athletes.`)

      let saved = 0
      const failed: string[] = []

      for (let i = 0; i < athletes.length; i++) {
        const athlete = athletes[i]
        const inputs = Array.from(rows[i].querySelectorAll('input')) as HTMLInputElement[]
        const isYoung = inputs.length === 9

        const payload: Record<string, unknown> = {
          athlete_id: athlete.id,
          athlete_name: `${athlete.first_name} ${athlete.last_name}`,
          team,
          season,
          sprint: valueOf(inputs[0]),
          height_ft: valueOf(inputs[1]),
          height_in: valueOf(inputs[2]),
          wingspan_ft: valueOf(inputs[3]),
          wingspan_in: valueOf(inputs[4]),
          vertical: valueOf(inputs[5]),
          broad_jump_ft: valueOf(inputs[6]),
          broad_jump_in: valueOf(inputs[7]),
        }

        if (isYoung) {
          payload.chinup_hold = valueOf(inputs[8])
          payload.chinups = null
          payload.mile02_time = null
          payload.mile02_watts = null
        } else {
          payload.chinup_hold = null
          payload.chinups = valueOf(inputs[8])
          payload.mile02_time = valueOf(inputs[9], false)
          payload.mile02_watts = valueOf(inputs[10])
        }

        setMessage(`Saving ${i + 1} of ${athletes.length}...`)
        const res = await fetch('/api/combine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) saved++
        else failed.push(`${athlete.first_name} ${athlete.last_name}`)
      }

      if (failed.length) {
        setMessage(`⚠ Saved ${saved}/${athletes.length}. Failed: ${failed.join(', ')}`)
      } else {
        setMessage(`✓ MANUAL SAVE COMPLETE — ${saved}/${athletes.length} athletes saved`)
      }
    } catch (error) {
      setMessage(`⚠ ${error instanceof Error ? error.message : 'Manual save failed.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, maxWidth: 420 }}>
      {message && (
        <div style={{ background: 'rgba(5,15,35,0.97)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 8, padding: '9px 12px', color: message.startsWith('⚠') ? '#fbbf24' : '#e2e8f0', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={saveEverythingVisible}
        disabled={saving}
        style={{ padding: '12px 18px', borderRadius: 9, border: '1px solid rgba(52,211,153,0.55)', background: saving ? 'rgba(30,41,59,0.95)' : 'linear-gradient(135deg,#047857,#059669)', color: 'white', fontSize: 13, fontWeight: 800, letterSpacing: '0.03em', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
      >
        {saving ? 'SAVING ALL…' : '💾 MANUAL SAVE ALL'}
      </button>
    </div>
  )
}
