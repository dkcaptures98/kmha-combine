interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  icon?: React.ReactNode
}

export default function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="kmha-card p-4" style={accent ? { borderColor: 'rgba(14,165,233,0.4)' } : {}}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{
            color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-display)'
          }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{
            fontFamily: 'var(--font-display)', color: accent ? '#38bdf8' : '#f0f4f8', letterSpacing: '0.02em'
          }}>
            {value}
          </p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
        </div>
        {icon && <div style={{ color: '#334155' }}>{icon}</div>}
      </div>
    </div>
  )
}
