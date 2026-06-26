import { isTimed } from './program'

export function sessionExercisesToRows(exercises) {
  return exercises.flatMap(ex => {
    const timed = isTimed(ex.targetReps)
    const name = ex.altUsed && ex.altName ? ex.altName : ex.exerciseName
    return ex.sets
      .filter(s => s.done || s.weight || s.reps)
      .map(s => ({
        exerciseId: ex.exerciseId,
        exerciseName: name,
        altUsed: ex.altUsed || false,
        setNumber: s.setNumber,
        weightKg: timed ? null : s.weight,
        reps: timed ? null : s.reps,
        durationSecs: timed ? s.weight : null,
        done: s.done,
      }))
  })
}

export function editExercisesToRows(exercises) {
  return exercises.flatMap(ex => {
    const timed = isTimed(ex.targetReps)
    return ex.sets
      .filter(s => s.done || s.weight || s.reps)
      .map(s => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        altUsed: ex.altUsed || false,
        setNumber: s.setNumber,
        weightKg: timed ? null : s.weight,
        reps: timed ? null : s.reps,
        durationSecs: timed ? s.weight : null,
        done: s.done,
      }))
  })
}
