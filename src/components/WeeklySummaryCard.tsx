import { ArrowUp, Sparkles } from 'lucide-react'
import type { WeeklySummary } from '../lib/weeklySummary'
import { theme } from '../styles/theme'
import { cardStyle } from '../styles/ui'

export interface WeeklySummaryCardProps {
  summary: WeeklySummary
}

export default function WeeklySummaryCard({ summary }: Readonly<WeeklySummaryCardProps>) {
  const { rich, headline, subline, prs, weekOverWeekBeats, categoryBreakdown } = summary

  return (
    <div
      style={{
        ...cardStyle,
        background: rich
          ? 'linear-gradient(145deg, #FFFFFF 0%, #F1EEFF 100%)'
          : theme.colors.white,
        padding: '16px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: rich ? theme.colors.brand : theme.colors.muted,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {rich && <Sparkles size={13} />} This week
          </span>
        </div>
      </div>

      <div style={{ fontFamily: theme.font.display, fontSize: 17, fontWeight: 800, color: theme.colors.text, letterSpacing: -0.2, lineHeight: 1.3 }}>
        {headline}
      </div>
      <div style={{ fontSize: 13, color: theme.colors.muted, marginTop: 6, lineHeight: 1.4 }}>
        {subline}
      </div>
      {rich && categoryBreakdown ? (
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{categoryBreakdown}</div>
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
                  background: theme.colors.brand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowUp size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text }}>{pr.exerciseName}</div>
                <div style={{ fontSize: 11, color: theme.colors.muted }}>All-time best</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.brand }}>{pr.deltaLabel}</div>
            </div>
          ))}
        </div>
      )}

      {weekOverWeekBeats.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: theme.colors.muted }}>
          Also up on last week: {weekOverWeekBeats.join(', ')}.
        </div>
      )}
    </div>
  )
}
