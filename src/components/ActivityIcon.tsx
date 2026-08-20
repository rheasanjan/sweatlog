import {
  Activity,
  Bike,
  CirclePlus,
  Dumbbell,
  Footprints,
  HeartPulse,
  Mountain,
  Music2,
  PersonStanding,
  Trophy,
  Waves,
} from 'lucide-react'
import type { ActivityIcon as ActivityIconName } from '../lib/activityCatalog'

const icons = {
  activity: Activity,
  bike: Bike,
  'circle-plus': CirclePlus,
  dumbbell: Dumbbell,
  footprints: Footprints,
  'heart-pulse': HeartPulse,
  mountain: Mountain,
  music: Music2,
  'person-standing': PersonStanding,
  trophy: Trophy,
  waves: Waves,
}

export default function ActivityIcon({
  name,
  color = 'currentColor',
  size = 20,
}: Readonly<{
  name: ActivityIconName
  color?: string
  size?: number
}>) {
  const Icon = icons[name]
  return <Icon size={size} color={color} strokeWidth={2.1} />
}
