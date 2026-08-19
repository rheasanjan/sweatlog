import { ChevronLeft } from 'lucide-react'
import { ACTIVITY_CATEGORIES } from '../lib/activityCatalog'
import type { ActivityCategory } from '../types'

export interface ActivityCategoryPickerProps {
  onBack: () => void
  onSelectCategory: (category: ActivityCategory) => void
}

export default function ActivityCategoryPicker({
  onBack,
  onSelectCategory,
}: ActivityCategoryPickerProps) {
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
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>What did you do?</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACTIVITY_CATEGORIES.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            style={{
              textAlign: 'left',
              background: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${category.color}`,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 800,
              color: '#0F172A',
            }}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  )
}
