'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TestType, TEST_LABELS, TEST_UNITS } from '@/types'
import { formatScore } from '@/lib/analytics'

interface ChartEntry {
  name: string
  score: number
  team: string
}

interface LeaderboardChartProps {
  testType: TestType
  data: ChartEntry[]
}

const COLORS = ['#fbbf24', '#94a3b8', '#b45309', '#38bdf8', '#34d399']

export default function LeaderboardChart({ testType, data }: LeaderboardChartProps) {
  return (
    <div className="kmha-card p-4">
      <h3 className="font-display text-sm font-semibold tracking-wider mb-4" style={{ color: '#64748b', textTransform: 'uppercase' }}>
        {TEST_LABELS[testType]} — Top Performers
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
          <XAxis
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={110}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(14,165,233,0.06)' }}
            contentStyle={{
              background: '#111827',
              border: '1px solid #1e3a5f',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            formatter={(value: number) => [formatScore(value, testType), TEST_LABELS[testType]]}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i] || '#38bdf8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
