import { createClient } from '@supabase/supabase-js'
import { slugify } from './program'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const EXERCISE_SELECT = `
  *,
  exercise_muscle_groups (
    muscle_group_id,
    muscle_groups ( id, slug, label )
  )
`

// ─── WORKOUT SKIPS ─────────────────────────────────────────────

export async function fetchWeekSkips(weekStart) {
  const { data, error } = await supabase
    .from('workout_skips')
    .select('id, workout_day_id, week_start, note')
    .eq('week_start', weekStart)
  if (error) throw error
  return data
}

export async function fetchAllWeekSkips() {
  const { data, error } = await supabase
    .from('workout_skips')
    .select('id, workout_day_id, week_start, note')
    .order('week_start', { ascending: false })
  if (error) throw error
  return data
}

export async function skipWorkoutForWeek(workoutDayId, weekStart) {
  const { data, error } = await supabase
    .from('workout_skips')
    .upsert({ workout_day_id: workoutDayId, week_start: weekStart }, { onConflict: 'workout_day_id,week_start' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unskipWorkoutForWeek(workoutDayId, weekStart) {
  const { error } = await supabase
    .from('workout_skips')
    .delete()
    .eq('workout_day_id', workoutDayId)
    .eq('week_start', weekStart)
  if (error) throw error
}

// ─── MUSCLE GROUPS ───────────────────────────────────────────

export async function fetchMuscleGroups() {
  const { data, error } = await supabase
    .from('muscle_groups')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

// ─── EXERCISES ───────────────────────────────────────────────

export async function fetchAllExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_SELECT)
    .order('is_custom', { ascending: true })
    .order('name')
  if (error) throw error
  return data
}

export async function addCustomExercise({ name, altName, muscleGroupIds }) {
  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({ name, alt_name: altName || null, is_custom: true })
    .select()
    .single()
  if (error) throw error

  if (muscleGroupIds?.length) {
    const { error: linkError } = await supabase
      .from('exercise_muscle_groups')
      .insert(muscleGroupIds.map(id => ({ exercise_id: exercise.id, muscle_group_id: id })))
    if (linkError) throw linkError
  }

  return exercise
}

// ─── WORKOUT DAYS ────────────────────────────────────────────

export async function fetchWorkoutDays() {
  const { data, error } = await supabase
    .from('workout_days')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createWorkoutDay({ name, subtitle, color }) {
  const { data: existing } = await supabase.from('workout_days').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order || 0) + 1
  let slug = slugify(name)
  const { data: slugClash } = await supabase.from('workout_days').select('id').eq('slug', slug).maybeSingle()
  if (slugClash) slug = `${slug}-${Date.now()}`

  const { data, error } = await supabase
    .from('workout_days')
    .insert({
      name,
      slug,
      subtitle: subtitle || null,
      color: color || '#2563EB',
      sort_order: nextOrder,
      is_custom: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkoutDay(workoutDayId) {
  const { error } = await supabase
    .from('workout_days')
    .delete()
    .eq('id', workoutDayId)
    .eq('is_custom', true)
  if (error) throw error
}

export async function fetchWorkoutDayExercises(workoutDayId) {
  const { data, error } = await supabase
    .from('workout_day_exercises')
    .select(`
      id, sort_order, target_sets, target_reps, exercise_id,
      exercises ( id, name, alt_name, is_custom, exercise_muscle_groups ( muscle_groups ( slug, label ) ) )
    `)
    .eq('workout_day_id', workoutDayId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function addExerciseToWorkoutDay(workoutDayId, exerciseId, { targetSets = 3, targetReps = '8–12' } = {}) {
  const { data: existing } = await supabase
    .from('workout_day_exercises')
    .select('sort_order')
    .eq('workout_day_id', workoutDayId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order || 0) + 1

  const { data, error } = await supabase
    .from('workout_day_exercises')
    .insert({
      workout_day_id: workoutDayId,
      exercise_id: exerciseId,
      sort_order: nextOrder,
      target_sets: targetSets,
      target_reps: targetReps,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeExerciseFromWorkoutDay(workoutDayExerciseId) {
  const { error } = await supabase
    .from('workout_day_exercises')
    .delete()
    .eq('id', workoutDayExerciseId)
  if (error) throw error
}

// ─── SESSIONS ────────────────────────────────────────────────

export async function createSession(workoutDayId) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ workout_day_id: workoutDayId, status: 'in_progress', started_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finishSession(sessionId, { durationMins, note }) {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_mins: durationMins,
      note,
    })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function abandonSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
  if (error) throw error
}

export async function fetchRecentSessions(limit = 20) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      workout_days ( id, name, slug, color, subtitle ),
      session_sets (
        id, exercise_id, exercise_name, alt_used,
        set_number, weight_kg, reps, duration_secs, done
      )
    `)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── SESSION SETS ─────────────────────────────────────────────

export async function upsertSets(sessionId, sets) {
  const { error: deleteError } = await supabase
    .from('session_sets')
    .delete()
    .eq('session_id', sessionId)
  if (deleteError) throw deleteError

  if (!sets.length) return

  const rows = sets.map(s => ({
    session_id:    sessionId,
    exercise_id:   s.exerciseId,
    exercise_name: s.exerciseName,
    alt_used:      s.altUsed || false,
    set_number:    s.setNumber,
    weight_kg:     s.weightKg ? parseFloat(s.weightKg) : null,
    reps:          s.reps     ? parseInt(s.reps)       : null,
    duration_secs: s.durationSecs || null,
    done:          s.done || false,
  }))
  const { error } = await supabase.from('session_sets').insert(rows)
  if (error) throw error
}

// ─── BODY CHECK-INS ──────────────────────────────────────────

export async function logBodyCheckin({ weightKg, waistCm, energy, note }) {
  const date = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('body_checkins')
    .upsert(
      {
        date,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        waist_cm:  waistCm  ? parseFloat(waistCm)  : null,
        energy:    energy   ? parseInt(energy)      : null,
        note:      note || null,
      },
      { onConflict: 'date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchBodyLog() {
  const { data, error } = await supabase
    .from('latest_body_log')
    .select('date, weight_kg, waist_cm, energy, note')
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

// ─── PERSONAL RECORDS ─────────────────────────────────────────

export async function checkAndSavePR(sessionId, exerciseId, exerciseName, weightKg, reps, durationSecs) {
  const { data: existing } = await supabase
    .from('personal_records')
    .select('weight_kg, reps, duration_secs')
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  const weight = weightKg ? parseFloat(weightKg) : null
  const duration = durationSecs ? parseInt(durationSecs) : null

  if (duration != null) {
    const currentBest = existing?.duration_secs || 0
    if (duration <= currentBest) return null
  } else if (weight != null) {
    const currentBest = existing?.weight_kg || 0
    if (weight <= currentBest) return null
  } else {
    return null
  }

  const { data, error } = await supabase
    .from('personal_records')
    .upsert(
      {
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        weight_kg: weight,
        reps: reps ? parseInt(reps) : null,
        duration_secs: duration,
        session_id: sessionId,
        achieved_at: new Date().toISOString(),
      },
      { onConflict: 'exercise_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchStrengthHistory(exerciseId) {
  const { data, error } = await supabase
    .from('session_sets')
    .select('weight_kg, reps, duration_secs, created_at, sessions!inner(started_at, status)')
    .eq('exercise_id', exerciseId)
    .eq('done', true)
    .eq('sessions.status', 'completed')
    .order('created_at', { ascending: true })
  if (error) throw error

  const bySession = {}
  data.forEach(row => {
    const dateKey = row.sessions.started_at.slice(0, 10)
    const weight = row.weight_kg != null ? parseFloat(row.weight_kg) : null
    const duration = row.duration_secs
    const current = bySession[dateKey]

    if (duration != null) {
      if (!current || duration > (current.duration_secs || 0)) {
        bySession[dateKey] = { date: dateKey, weight_kg: weight, reps: row.reps, duration_secs: duration }
      }
    } else if (weight != null) {
      if (!current || weight > (current.weight_kg || 0)) {
        bySession[dateKey] = { date: dateKey, weight_kg: weight, reps: row.reps, duration_secs: duration }
      }
    }
  })
  return Object.values(bySession).sort((a, b) => a.date.localeCompare(b.date))
}
