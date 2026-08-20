import { useMemo, useState } from 'react'
import { ChevronLeft, Search } from 'lucide-react'
import {
  ACTIVITY_CATEGORIES,
  typesForCategory,
  type ActivityTypeOption,
} from '../lib/activityCatalog'
import { categoryTheme, theme } from '../styles/theme'
import type { Activity, ActivityCategory } from '../types'
import ActivityIcon from './ActivityIcon'

type NonStrengthCategory = Exclude<ActivityCategory, 'strength'>

export interface LogActivityPickerProps {
  activities: Activity[]
  onBack: () => void
  onSelectStrength: () => void
  onSelectType: (
    category: NonStrengthCategory,
    type: ActivityTypeOption,
  ) => void
}

function relativeLastDone(date: string): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime())
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function latestActivityTypes(activities: Activity[]) {
  const seen = new Set<string>()
  return [...activities]
    .filter(activity => activity.status === 'completed' && activity.category !== 'strength')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .flatMap(activity => {
      const category = activity.category as NonStrengthCategory
      const type = typesForCategory(category).find(item => item.label === activity.name)
      const key = `${category}:${type?.id}`
      if (!type || seen.has(key)) return []
      seen.add(key)
      return [{ category, type, activity }]
    })
    .slice(0, 2)
}

export default function LogActivityPicker({
  activities,
  onBack,
  onSelectStrength,
  onSelectType,
}: Readonly<LogActivityPickerProps>) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const recentTypes = useMemo(() => latestActivityTypes(activities), [activities])
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date()).replace(/^(\w+)\s/, '$1, ')

  const groups: Array<{
    category: ActivityCategory
    types: ActivityTypeOption[]
  }> = [
    { category: 'cardio', types: typesForCategory('cardio') },
    {
      category: 'strength',
      types: [{
        id: 'strength',
        label: 'Strength',
        color: categoryTheme.strength.color,
        icon: 'dumbbell',
      }],
    },
    { category: 'sport', types: typesForCategory('sport') },
    { category: 'mobility', types: typesForCategory('mobility') },
  ]

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <header
        style={{
          background: `linear-gradient(180deg, ${theme.colors.navy} 0%, ${theme.colors.navySoft} 100%)`,
          padding: '18px 20px 22px',
          color: theme.colors.white,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: theme.colors.white,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={19} />
          </button>
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: theme.font.display,
                fontWeight: 800,
                fontSize: 23,
                letterSpacing: '-0.02em',
              }}
            >
              Log Activity
            </h1>
            <div style={{ marginTop: 3, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              {dateLabel}
            </div>
          </div>
        </div>

        <label
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.08)',
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Search size={17} color="rgba(255,255,255,0.55)" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search activities…"
            aria-label="Search activities"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: theme.colors.white,
              fontFamily: theme.font.body,
              fontSize: 14,
            }}
          />
        </label>
      </header>

      <main style={{ padding: '20px 20px 32px' }}>
        {!normalizedQuery && (
          <>
            <SectionTitle>Quick log</SectionTitle>
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 4,
                marginBottom: 28,
              }}
            >
              <QuickChip
                label="Strength"
                meta="Choose a template"
                category="strength"
                icon="dumbbell"
                onClick={onSelectStrength}
              />
              {recentTypes.map(({ category, type, activity }) => (
                <QuickChip
                  key={`${category}:${type.id}`}
                  label={type.label}
                  meta={`Last: ${relativeLastDone(activity.started_at)}`}
                  category={category}
                  icon={type.icon}
                  onClick={() => onSelectType(category, type)}
                />
              ))}
            </div>
          </>
        )}

        {groups.map(({ category, types }) => {
          const filtered = types.filter(type =>
            type.label.toLowerCase().includes(normalizedQuery),
          )
          if (filtered.length === 0) return null
          const categoryInfo = ACTIVITY_CATEGORIES.find(item => item.id === category)!
          return (
            <section key={category} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: categoryInfo.color,
                  }}
                />
                <h2
                  style={{
                    margin: 0,
                    fontFamily: theme.font.display,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {categoryInfo.label}
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {filtered.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      if (category === 'strength') onSelectStrength()
                      else onSelectType(category, type)
                    }}
                    style={{
                      minHeight: 100,
                      padding: '13px 7px 11px',
                      border: `1px solid ${theme.colors.line}`,
                      borderRadius: 16,
                      background: theme.colors.white,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        display: 'grid',
                        placeItems: 'center',
                        background: categoryInfo.softColor,
                      }}
                    >
                      <ActivityIcon name={type.icon} color={categoryInfo.color} />
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, color: theme.colors.text }}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}

function SectionTitle({ children }: Readonly<{ children: string }>) {
  return (
    <div
      style={{
        margin: '0 0 12px 2px',
        fontFamily: theme.font.display,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: theme.colors.muted,
      }}
    >
      {children}
    </div>
  )
}

function QuickChip({
  label,
  meta,
  category,
  icon,
  onClick,
}: Readonly<{
  label: string
  meta: string
  category: ActivityCategory
  icon: ActivityTypeOption['icon']
  onClick: () => void
}>) {
  const presentation = ACTIVITY_CATEGORIES.find(item => item.id === category)!
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 154,
        flexShrink: 0,
        padding: '11px 13px',
        border: `1px solid ${theme.colors.line}`,
        borderRadius: 16,
        background: theme.colors.white,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          display: 'grid',
          placeItems: 'center',
          background: presentation.softColor,
          flexShrink: 0,
        }}
      >
        <ActivityIcon name={icon} color={presentation.color} size={19} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: theme.colors.text }}>
          {label}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 11.5, color: theme.colors.muted, whiteSpace: 'nowrap' }}>
          {meta}
        </span>
      </span>
    </button>
  )
}
