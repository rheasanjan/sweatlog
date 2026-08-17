import { describe, expect, it, vi } from 'vitest'
import { buildResumedSessionExercises, initialSessionStartMs } from './ActiveSession'
import type { Activity, WorkoutDayExercise } from '../types'

vi.mock('../lib/supabase', () => ({
  createSession: vi.fn(),
  finishSession: vi.fn(),
  abandonSession: vi.fn(),
  upsertSets: vi.fn(),
  checkAndSavePR: vi.fn(),
  addCustomExercise: vi.fn(),
  addExerciseToWorkoutDay: vi.fn(),
  updateSession: vi.fn(),
}))

const dayExercise: WorkoutDayExercise = {
  id: 'day-exercise-1',
  sort_order: 0,
  target_sets: 3,
  target_reps: '8–12',
  exercise_id: 'exercise-1',
  exercises: {
    id: 'exercise-1',
    name: 'Bench Press',
    alt_name: 'Dumbbell Press',
    is_custom: false,
  },
}

const activity: Activity = {
  id: 'activity-1',
  category: 'strength',
  name: 'Push Day',
  color: '#DC2626',
  workout_day_id: 'template-1',
  status: 'in_progress',
  started_at: '2026-08-17T08:00:00.000Z',
  finished_at: null,
  duration_mins: null,
  note: null,
  session_sets: [
    {
      id: 'set-2',
      exercise_id: 'exercise-1',
      exercise_name: 'Bench Press',
      alt_used: false,
      set_number: 2,
      weight_kg: 52.5,
      reps: 8,
      duration_secs: null,
      done: false,
    },
    {
      id: 'set-1',
      exercise_id: 'exercise-1',
      exercise_name: 'Bench Press',
      alt_used: false,
      set_number: 1,
      weight_kg: 50,
      reps: 10,
      duration_secs: null,
      done: true,
    },
  ],
}

describe('buildResumedSessionExercises', () => {
  it('hydrates persisted sets in set order with plan metadata', () => {
    expect(buildResumedSessionExercises(activity, [dayExercise])).toEqual([
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        altName: 'Dumbbell Press',
        altUsed: false,
        targetSets: 3,
        targetReps: '8–12',
        lastBest: null,
        lastWeekLabel: null,
        sets: [
          { setNumber: 1, weight: '50', reps: '10', repeat: '1', done: true },
          { setNumber: 2, weight: '52.5', reps: '8', repeat: '1', done: false },
        ],
      },
    ])
  })

  it('uses current plan reps to interpret persisted set values', () => {
    const changedPlanActivity: Activity = {
      ...activity,
      session_sets: [
        {
          id: 'set-1',
          exercise_id: 'exercise-1',
          exercise_name: 'Bench Press',
          alt_used: false,
          set_number: 1,
          weight_kg: null,
          reps: null,
          duration_secs: 45,
          done: true,
        },
      ],
    }

    const [resumed] = buildResumedSessionExercises(changedPlanActivity, [dayExercise])

    expect(resumed.targetReps).toBe('8–12')
    expect(resumed.sets[0]).toEqual({
      setNumber: 1,
      weight: '',
      reps: '',
      repeat: '1',
      done: true,
    })
  })
})

describe('initialSessionStartMs', () => {
  it('uses the persisted start time when resuming an activity', () => {
    expect(initialSessionStartMs(activity, Date.parse('2026-08-17T09:30:00.000Z')))
      .toBe(Date.parse('2026-08-17T08:00:00.000Z'))
  })

  it('uses the current time for a new activity', () => {
    const now = Date.parse('2026-08-17T09:30:00.000Z')
    expect(initialSessionStartMs(null, now)).toBe(now)
  })
})
