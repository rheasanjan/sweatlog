import { Home, CalendarDays, TrendingUp } from 'lucide-react'
import type { Screen } from '../types'
import { theme } from '../styles/theme'

interface BottomNavProps {
  screen: Screen
  onHome: () => void
  onHistory: () => void
  onProgress: () => void
}

export default function BottomNav({ screen, onHome, onHistory, onProgress }: Readonly<BottomNavProps>) {
  const isHome = ['home', 'picker', 'summary', 'logActivity', 'activityForm'].includes(screen)
  const items = [
    { id: 'home', icon: Home, label: 'Home', action: onHome, active: isHome },
    { id: 'history', icon: CalendarDays, label: 'History', action: onHistory, active: screen === 'history' },
    { id: 'progress', icon: TrendingUp, label: 'Progress', action: onProgress, active: screen === 'progress' },
  ]
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: theme.colors.white, borderTop: `1px solid ${theme.colors.line}`, display: 'flex', padding: '10px 0 16px', zIndex: 40 }}>
      {items.map(({ id, icon: Icon, label, action, active }) => (
        <button type="button" key={id} onClick={action} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '3px 0' }}>
          <Icon size={20} color={active ? theme.colors.brand : theme.colors.muted} strokeWidth={active ? 2.3 : 2} />
          <span style={{ fontSize: 11, fontWeight: 600, color: active ? theme.colors.brand : theme.colors.muted }}>{label}</span>
        </button>
      ))}
    </div>
  )
}
