import { ArrowUp } from 'lucide-react'
import type { WeeklySummary } from '../lib/weeklySummary'

export interface WeeklySummaryCardProps {
  summary: WeeklySummary
}

export default function WeeklySummaryCard({ summary }: Readonly<WeeklySummaryCardProps>) {
  const { rich, headline, subline, prs, weekOverWeekBeats, categoryBreakdown } = summary

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: rich ? '#2563EB' : '#94A3B8',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          This week
        </div>
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: -0.2, lineHeight: 1.3 }}>
        {headline}
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 1.4 }}>
        {subline}
      </div>
      {rich && categoryBreakdown ? (
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{categoryBreakdown}</div>
      ) : null}

      {prs.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prs.map(pr => (
            <div key={pr.exerciseId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowUp size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{pr.exerciseName}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>All-time best</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>{pr.deltaLabel}</div>
            </div>
          ))}
        </div>
      )}

      {weekOverWeekBeats.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8' }}>
          Also up on last week: {weekOverWeekBeats.join(', ')}.
        </div>
      )}
    </div>
  )
}
