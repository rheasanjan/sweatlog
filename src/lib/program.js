export const DAY_COLORS = ['#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#0891B2', '#DB2777']

export const DEFAULT_SETS = {
  'Incline Dumbbell Press': 3,
  'Seated DB Shoulder Press': 3,
  'Chest Press Machine': 3,
  'Lateral Raises': 4,
  'Tricep Pushdowns': 3,
  'Cable External Rotations': 2,
  'Lat Pulldown': 3,
  'Seated Cable Row': 3,
  'Face Pulls': 3,
  'Dumbbell Curls': 3,
  'Hammer Curls': 2,
  'Dead Hang': 2,
  'Hip Thrust': 4,
  'Bulgarian Split Squat': 3,
  'Hip Abduction Machine': 3,
  'Standing Calf Raises': 4,
  'Single-Arm DB Row': 3,
  'Arnold Press': 3,
  'Overhead Tricep Extension': 3,
  'Weighted Crunches': 3,
  'Pallof Press': 3,
  'Squat or Leg Press': 4,
  'Leg Curl': 3,
  'Leg Extension': 3,
  'Single-Leg RDL': 2,
  'Tibialis Raises': 2,
  "Farmer's Carry": 3,
  'Plank': 1,
  'Dead Bug': 3,
  'Hanging Knee Raise': 3,
  'Russian Twist': 3,
  'Side Plank': 2,
  'Cable Woodchop': 3,
  'Single-Leg Glute Bridge': 2,
  'Clamshells': 2,
  'Monster Walks': 2,
  'Copenhagen Plank': 2,
  'Box Jumps': 3,
  'Broad Jump': 3,
  'Jump Squats': 3,
  'Med Ball Slam': 3,
}

export const DEFAULT_REPS = {
  'Incline Dumbbell Press': '8–12',
  'Seated DB Shoulder Press': '8–12',
  'Chest Press Machine': '10–12',
  'Lateral Raises': '12–15',
  'Tricep Pushdowns': '10–15',
  'Cable External Rotations': '15',
  'Lat Pulldown': '8–12',
  'Seated Cable Row': '8–12',
  'Face Pulls': '12–15',
  'Dumbbell Curls': '10–15',
  'Hammer Curls': '10–15',
  'Dead Hang': '30s',
  'Hip Thrust': '8–12',
  'Bulgarian Split Squat': '8–12 ea',
  'Hip Abduction Machine': '12–15',
  'Standing Calf Raises': '12–20',
  'Single-Arm DB Row': '8–12',
  'Arnold Press': '10–12',
  'Overhead Tricep Extension': '10–15',
  'Weighted Crunches': '12–15',
  'Pallof Press': '10 ea',
  'Squat or Leg Press': '8–12',
  'Leg Curl': '10–15',
  'Leg Extension': '10–15',
  'Single-Leg RDL': '8 ea',
  'Tibialis Raises': '15',
  "Farmer's Carry": '30s',
  'Plank': '30–45s',
  'Dead Bug': '10 ea',
  'Hanging Knee Raise': '12',
  'Russian Twist': '15 ea',
  'Side Plank': '20–30s ea',
  'Cable Woodchop': '10 ea',
  'Single-Leg Glute Bridge': '12 ea',
  'Clamshells': '15 ea',
  'Monster Walks': '10 ea',
  'Copenhagen Plank': '20–30s ea',
  'Box Jumps': '5',
  'Broad Jump': '5',
  'Jump Squats': '8',
  'Med Ball Slam': '10',
}

export function isTimed(repStr = '') {
  return repStr.includes('s')
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function weekStartKey(date = new Date()) {
  return startOfWeek(date).toISOString().slice(0, 10)
}

export function addWeeks(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export function formatWeekRange(monday) {
  const start = new Date(monday)
  const end = new Date(monday)
  end.setDate(start.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

export function formatSessionDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function lightColor(hex) {
  const map = {
    '#2563EB': '#EFF6FF',
    '#7C3AED': '#F5F3FF',
    '#DC2626': '#FEF2F2',
    '#059669': '#ECFDF5',
    '#D97706': '#FFFBEB',
    '#0891B2': '#ECFEFF',
    '#DB2777': '#FDF2F8',
  }
  return map[hex] || '#F1F5F9'
}
