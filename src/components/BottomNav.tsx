import { Home, CalendarDays, TrendingUp } from 'lucide-react'
import type { Screen } from '../types'

interface BottomNavProps {
  screen: Screen
  onHome: () => void
  onHistory: () => void
  onProgress: () => void
}

export default function BottomNav({ screen, onHome, onHistory, onProgress }: BottomNavProps) {
  const isHome = ['home', 'picker', 'summary'].includes(screen)
  const items = [
    { id: 'home', icon: Home, label: 'Home', action: onHome, active: isHome },
    { id: 'history', icon: CalendarDays, label: 'History', action: onHistory, active: screen === 'history' },
    { id: 'progress', icon: TrendingUp, label: 'Progress', action: onProgress, active: screen === 'progress' },
  ]
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex', padding: '8px 0', boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', zIndex: 40 }}>
      {items.map(({ id, icon: Icon, label, action, active }) => (
        <button key={id} onClick={action} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '4px 0' }}>
          <Icon size={20} color={active ? '#2563EB' : '#94A3B8'} />
          <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#2563EB' : '#94A3B8' }}>{label}</span>
        </button>
      ))}
    </div>
  )
}
