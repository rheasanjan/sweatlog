import { ChevronLeft } from 'lucide-react'
import { typesForCategory } from '../lib/activityCatalog'
import type { ActivityCategory } from '../types'
import type { ActivityTypeOption } from '../lib/activityCatalog'

export interface ActivityTypePickerProps {
  category: Exclude<ActivityCategory, 'strength'>
  onBack: () => void
  onSelectType: (type: ActivityTypeOption) => void
}

const TITLES: Record<Exclude<ActivityCategory, 'strength'>, string> = {
  cardio: 'Cardio',
  sport: 'Sport',
  mobility: 'Mobility',
}

export default function ActivityTypePicker({
  category,
  onBack,
  onSelectType,
}: ActivityTypePickerProps) {
  const types = typesForCategory(category)

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{TITLES[category]}</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {types.map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelectType(type)}
            style={{
              textAlign: 'left',
              background: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${type.color}`,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
              color: '#0F172A',
            }}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
