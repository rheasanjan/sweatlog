import type { ActivityCategory } from '../types'

export const theme = {
  colors: {
    background: '#F2F4F8',
    navy: '#0B1120',
    navySoft: '#16203A',
    white: '#FFFFFF',
    text: '#0B1120',
    muted: '#6B7280',
    line: '#E7EAF0',
    brand: '#3D5CFF',
    brandDark: '#2A44E0',
  },
  font: {
    display: "'Manrope', sans-serif",
    body: "'Inter', sans-serif",
  },
} as const

export const categoryTheme: Record<
  ActivityCategory,
  { color: string; softColor: string }
> = {
  strength: { color: '#6C4FFF', softColor: '#F1EEFF' },
  cardio: { color: '#00A9A0', softColor: '#E4F7F5' },
  sport: { color: '#FF8A3D', softColor: '#FFF1E5' },
  mobility: { color: '#22B573', softColor: '#E7F8EF' },
}
