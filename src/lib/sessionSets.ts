import type { ExerciseSetGroup, SessionExercise, SessionSet, SetInput, SetRow } from '../types'
import { isTimed, setRepeatCount } from './program'

type MapRowFn = (
  ex: ExerciseSetGroup,
  s: SetInput,
  setNumber: number,
  timed: boolean,
  name: string,
) => SetRow

function expandExerciseSets(ex: ExerciseSetGroup, mapRow: MapRowFn): SetRow[] {
  const timed = isTimed(ex.targetReps)
  const name = ex.altUsed && ex.altName ? ex.altName : ex.exerciseName
  const rows: SetRow[] = []
  let setNumber = 1

  for (const s of ex.sets) {
    if (!s.done && !s.weight && !s.reps) continue
    const count = setRepeatCount(s)
    for (let i = 0; i < count; i++) {
      rows.push(mapRow(ex, s, setNumber++, timed, name))
    }
  }
  return rows
}

export function sessionExercisesToRows(exercises: SessionExercise[]): SetRow[] {
  return exercises.flatMap(ex =>
    expandExerciseSets(ex, (ex, s, setNumber, timed, name) => ({
      exerciseId: ex.exerciseId,
      exerciseName: name,
      altUsed: ex.altUsed || false,
      setNumber,
      weightKg: timed ? null : s.weight,
      reps: timed ? null : s.reps,
      durationSecs: timed ? s.weight : null,
      done: s.done,
    }))
  )
}

export function editExercisesToRows(exercises: ExerciseSetGroup[]): SetRow[] {
  return exercises.flatMap(ex =>
    expandExerciseSets(ex, (ex, s, setNumber, timed) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      altUsed: ex.altUsed || false,
      setNumber,
      weightKg: timed ? null : s.weight,
      reps: timed ? null : s.reps,
      durationSecs: timed ? s.weight : null,
      done: s.done,
    }))
  )
}

export function countLoggedSets(exercises: SessionExercise[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const ex of exercises) {
    for (const s of ex.sets) {
      const n = setRepeatCount(s)
      total += n
      if (s.done) done += n
    }
  }
  return { done, total }
}

export function emptySet(setNumber: number, lastBest: SessionSet | null | undefined, timed: boolean): SetInput {
  return {
    setNumber,
    weight: timed
      ? (lastBest?.duration_secs != null ? String(lastBest.duration_secs) : '')
      : (lastBest?.weight_kg != null ? String(lastBest.weight_kg) : ''),
    reps: timed ? '' : (lastBest?.reps != null ? String(lastBest.reps) : ''),
    repeat: '1',
    done: false,
  }
}
