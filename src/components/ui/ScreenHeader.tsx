import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { theme } from '../../styles/theme'

export interface ScreenHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
  accent?: string
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  accent = theme.colors.navySoft,
}: Readonly<ScreenHeaderProps>) {
  return (
    <header
      style={{
        background: `linear-gradient(180deg, ${theme.colors.navy} 0%, ${accent} 100%)`,
        padding: '18px 20px 20px',
        color: theme.colors.white,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onBack && (
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
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={19} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: theme.font.display,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div style={{ marginTop: 3, fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
    </header>
  )
}
