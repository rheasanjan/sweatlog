import type { CSSProperties } from 'react'
import { theme } from './theme'

export const cardStyle: CSSProperties = {
  background: theme.colors.white,
  border: `1px solid ${theme.colors.line}`,
  borderRadius: 16,
}

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${theme.colors.line}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  background: theme.colors.white,
  color: theme.colors.text,
  outlineColor: theme.colors.brand,
}

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: theme.colors.muted,
}

export const primaryButtonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 16,
  padding: '15px 18px',
  background: `linear-gradient(135deg, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 100%)`,
  color: theme.colors.white,
  fontFamily: theme.font.display,
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 12px 24px -12px rgba(61,92,255,0.55)',
}

export const sectionTitleStyle: CSSProperties = {
  margin: '0 0 12px 2px',
  fontFamily: theme.font.display,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: theme.colors.muted,
}
