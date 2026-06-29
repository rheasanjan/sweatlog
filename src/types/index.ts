export type Screen = 'home' | 'picker' | 'session' | 'summary' | 'progress' | 'history' | 'sessionEdit'

export interface MuscleGroup {
  id: string
  slug: string
  label: string
  sort_order: number
}

export interface ExerciseMuscleGroup {
  muscle_group_id: string
  muscle_groups: Pick<MuscleGroup, 'id' | 'slug' | 'label'> | null
}

export interface Exercise {
  id: string
  name: string
  alt_name: string | null
  is_custom: boolean
  exercise_muscle_groups?: ExerciseMuscleGroup[]
}

export interface WorkoutDay {
  id: string
  name: string
  slug: string
  color: string
  subtitle: string | null
  sort_order: number
  is_custom: boolean
}

export interface WorkoutDayExercise {
  id: string
  sort_order: number
  target_sets: number
  target_reps: string
  exercise_id: string
  exercises: Exercise | null
}

export interface SessionSet {
  id?: string
  exercise_id: string | null
  exercise_name: string
  alt_used: boolean
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_secs: number | null
  done: boolean
}

export interface Session {
  id: string
  workout_day_id: string
  status: string
  started_at: string
  finished_at: string | null
  duration_mins: number | null
  note: string | null
  workout_days?: Pick<WorkoutDay, 'id' | 'name' | 'slug' | 'color' | 'subtitle'> | null
  session_sets?: SessionSet[]
}

export interface FinishedSession extends Omit<Session, 'session_sets'> {
  prs?: PersonalRecord[]
  session_sets?: SessionSet[] | SetRow[]
}

export interface PersonalRecord {
  exercise_id: string
  exercise_name: string
  weight_kg: number | null
  reps: number | null
  duration_secs: number | null
}

export interface WorkoutSkip {
  id: string
  workout_day_id: string
  week_start: string
  note: string | null
}

export interface BodyLogEntry {
  date: string
  weight_kg: number | null
  waist_cm: number | null
  energy: number | null
  note: string | null
}

export interface SetInput {
  setNumber: number
  weight: string
  reps: string
  repeat?: string
  done: boolean
}

export interface ExerciseSetGroup {
  exerciseId: string | null
  exerciseName: string
  altName?: string | null
  altUsed?: boolean
  targetReps: string
  sets: SetInput[]
}

export interface SessionExercise extends ExerciseSetGroup {
  exerciseId: string
  altName: string | null
  altUsed: boolean
  targetSets: number
  lastBest?: SessionSet | null
  lastWeekLabel?: string | null
}

export interface SetRow {
  exerciseId: string | null
  exerciseName: string
  altUsed: boolean
  setNumber: number
  weightKg: string | null
  reps: string | null
  durationSecs: string | null
  done: boolean
}

export interface StrengthHistoryPoint {
  date: string
  weight_kg: number | null
  reps: number | null
  duration_secs: number | null
}
