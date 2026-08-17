import { useState, useEffect } from 'react'
import type { Activity, Screen, Session, WorkoutDay, WorkoutDayExercise, Exercise, MuscleGroup, BodyLogEntry, FinishedSession } from './types'
import Home from './components/Home'
import Picker from './components/Picker'
import ActiveSession from './components/ActiveSession'
import Summary from './components/Summary'
import Progress from './components/Progress'
import History from './components/History'
import SessionEdit from './components/SessionEdit'
import BottomNav from './components/BottomNav'
import {
  fetchRecentSessions,
  fetchBodyLog,
  fetchAllExercises,
  fetchWorkoutDays,
  fetchMuscleGroups,
  fetchWorkoutDayExercises,
} from './lib/supabase'

type EditReturnScreen = 'home' | 'picker' | 'history'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [sessions, setSessions] = useState<Session[]>([])
  const [bodyLog, setBodyLog] = useState<BodyLogEntry[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeWorkoutDay, setActiveWorkoutDay] = useState<WorkoutDay | null>(null)
  const [activeDayExercises, setActiveDayExercises] = useState<WorkoutDayExercise[]>([])
  const [sessionLogDate, setSessionLogDate] = useState<Date | null>(null)
  const [sessionReturnScreen, setSessionReturnScreen] = useState<EditReturnScreen>('picker')
  const [resumeActivity, setResumeActivity] = useState<Activity | null>(null)
  const [finishedSession, setFinishedSession] = useState<FinishedSession | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editReturnScreen, setEditReturnScreen] = useState<EditReturnScreen>('history')

  const loadAll = async () => {
    const [s, b, e, d, m] = await Promise.all([
      fetchRecentSessions(100),
      fetchBodyLog(),
      fetchAllExercises(),
      fetchWorkoutDays(),
      fetchMuscleGroups(),
    ])
    setSessions(s || [])
    setBodyLog(b || [])
    setExercises(e || [])
    setWorkoutDays(d || [])
    setMuscleGroups(m || [])
  }

  useEffect(() => {
    loadAll()
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const refreshData = async () => {
    await loadAll()
  }

  const refreshExercises = async () => {
    const e = await fetchAllExercises()
    setExercises(e || [])
  }

  const refreshDayPlan = async () => {
    if (!activeWorkoutDay) return
    const dayExercises = await fetchWorkoutDayExercises(activeWorkoutDay.id)
    setActiveDayExercises(dayExercises)
  }

  const startSession = async (workoutDay: WorkoutDay, logDate: Date = new Date(), returnScreen: EditReturnScreen = 'picker') => {
    const dayExercises = await fetchWorkoutDayExercises(workoutDay.id)
    setResumeActivity(null)
    setActiveWorkoutDay(workoutDay)
    setActiveDayExercises(dayExercises)
    setSessionLogDate(logDate)
    setSessionReturnScreen(returnScreen)
    setScreen('session')
  }

  const resumeSession = async (activity: Activity) => {
    const workoutDay = workoutDays.find(day => day.id === activity.workout_day_id)
    if (!workoutDay) {
      alert('Could not resume: workout template not found')
      return
    }
    const dayExercises = await fetchWorkoutDayExercises(workoutDay.id)
    setActiveWorkoutDay(workoutDay)
    setActiveDayExercises(dayExercises)
    setSessionLogDate(new Date(activity.started_at))
    setSessionReturnScreen('picker')
    setResumeActivity(activity)
    setScreen('session')
  }

  const handleSessionBack = () => {
    setResumeActivity(null)
    setSessionLogDate(null)
    setScreen(sessionReturnScreen)
  }

  const handleSessionFinished = async (session: FinishedSession) => {
    setResumeActivity(null)
    setFinishedSession(session)
    setScreen('summary')
    await refreshData()
  }

  const openSessionEdit = (session: Session, from: EditReturnScreen = 'history') => {
    setEditingSession(session)
    setEditReturnScreen(from)
    setScreen('sessionEdit')
  }

  const hideBottomNav = ['session', 'sessionEdit'].includes(screen)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#94A3B8', fontSize: 13 }}>Loading Sweatlog…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#DC2626', fontWeight: 700 }}>Connection error</p>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>{error}</p>
        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
          Check your .env file and run schema.sql in Supabase.
          {/(category|column)/i.test(error) && ' Run the Phase 1 activity migration SQL.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#F8FAFC', minHeight: '100vh', color: '#0F172A', paddingBottom: hideBottomNav ? 0 : 70 }}>
      {screen === 'home' && (
        <Home
          templates={workoutDays}
          activities={sessions}
          bodyLog={bodyLog}
          onStart={() => setScreen('picker')}
          onStartTemplate={(day) => startSession(day, new Date(), 'home')}
          onEditSession={(session) => openSessionEdit(session, 'home')}
        />
      )}
      {screen === 'picker' && (
        <Picker
          workoutDays={workoutDays}
          sessions={sessions}
          exercises={exercises}
          muscleGroups={muscleGroups}
          onBack={() => {
            setResumeActivity(null)
            setScreen('home')
          }}
          onSelect={(day, logDate) => startSession(day, logDate, 'picker')}
          onResume={resumeSession}
          onDaysChanged={refreshData}
        />
      )}
      {screen === 'session' && activeWorkoutDay && (
        <ActiveSession
          key={resumeActivity?.id ?? `new-${activeWorkoutDay.id}-${sessionLogDate?.toISOString() ?? 'today'}`}
          workoutDay={activeWorkoutDay}
          dayExercises={activeDayExercises}
          exercises={exercises}
          sessions={sessions}
          muscleGroups={muscleGroups}
          logDate={sessionLogDate}
          resumeActivity={resumeActivity}
          onBack={handleSessionBack}
          onFinished={handleSessionFinished}
          onExerciseAdded={refreshExercises}
          onPlanChanged={refreshDayPlan}
        />
      )}
      {screen === 'summary' && finishedSession && (
        <Summary
          session={finishedSession}
          onDone={() => setScreen('home')}
        />
      )}
      {screen === 'progress' && (
        <Progress
          sessions={sessions}
          bodyLog={bodyLog}
          exercises={exercises}
          onBack={() => setScreen('home')}
          onCheckinSaved={refreshData}
        />
      )}
      {screen === 'history' && (
        <History
          activities={sessions}
          onBack={() => setScreen('home')}
          onEditSession={(session) => openSessionEdit(session, 'history')}
        />
      )}
      {screen === 'sessionEdit' && editingSession && (
        <SessionEdit
          session={editingSession}
          exercises={exercises}
          muscleGroups={muscleGroups}
          onBack={() => {
            setEditingSession(null)
            setScreen(editReturnScreen)
          }}
          onSaved={refreshData}
        />
      )}
      {!hideBottomNav && (
        <BottomNav
          screen={screen}
          onHome={() => setScreen('home')}
          onHistory={() => setScreen('history')}
          onProgress={() => setScreen('progress')}
        />
      )}
    </div>
  )
}
