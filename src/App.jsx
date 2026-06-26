import { useState, useEffect } from 'react'
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
  fetchAllWeekSkips,
} from './lib/supabase'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [sessions, setSessions] = useState([])
  const [bodyLog, setBodyLog] = useState([])
  const [exercises, setExercises] = useState([])
  const [workoutDays, setWorkoutDays] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [weekSkips, setWeekSkips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeWorkoutDay, setActiveWorkoutDay] = useState(null)
  const [activeDayExercises, setActiveDayExercises] = useState([])
  const [finishedSession, setFinishedSession] = useState(null)
  const [editingSession, setEditingSession] = useState(null)
  const [editReturnScreen, setEditReturnScreen] = useState('history')

  const loadAll = async () => {
    const [s, b, e, d, m, skips] = await Promise.all([
      fetchRecentSessions(100),
      fetchBodyLog(),
      fetchAllExercises(),
      fetchWorkoutDays(),
      fetchMuscleGroups(),
      fetchAllWeekSkips(),
    ])
    setSessions(s || [])
    setBodyLog(b || [])
    setExercises(e || [])
    setWorkoutDays(d || [])
    setMuscleGroups(m || [])
    setWeekSkips(skips || [])
  }

  useEffect(() => {
    loadAll()
      .catch(err => setError(err.message))
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

  const startSession = async (workoutDay) => {
    const dayExercises = await fetchWorkoutDayExercises(workoutDay.id)
    setActiveWorkoutDay(workoutDay)
    setActiveDayExercises(dayExercises)
    setScreen('session')
  }

  const handleSessionFinished = async (session) => {
    setFinishedSession(session)
    setScreen('summary')
    await refreshData()
  }

  const openSessionEdit = (session, from = 'history') => {
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
        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Check your .env file and run schema.sql in Supabase.</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#F8FAFC', minHeight: '100vh', color: '#0F172A', paddingBottom: hideBottomNav ? 0 : 70 }}>
      {screen === 'home' && (
        <Home
          workoutDays={workoutDays}
          sessions={sessions}
          bodyLog={bodyLog}
          weekSkips={weekSkips}
          onStart={() => setScreen('picker')}
          onEditSession={(session) => openSessionEdit(session, 'home')}
        />
      )}
      {screen === 'picker' && (
        <Picker
          workoutDays={workoutDays}
          sessions={sessions}
          weekSkips={weekSkips}
          exercises={exercises}
          muscleGroups={muscleGroups}
          onBack={() => setScreen('home')}
          onSelect={startSession}
          onDaysChanged={refreshData}
        />
      )}
      {screen === 'session' && activeWorkoutDay && (
        <ActiveSession
          workoutDay={activeWorkoutDay}
          dayExercises={activeDayExercises}
          exercises={exercises}
          sessions={sessions}
          muscleGroups={muscleGroups}
          onBack={() => setScreen('picker')}
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
          sessions={sessions}
          workoutDays={workoutDays}
          weekSkips={weekSkips}
          onBack={() => setScreen('home')}
          onEditSession={(session) => openSessionEdit(session, 'history')}
        />
      )}
      {screen === 'sessionEdit' && editingSession && (
        <SessionEdit
          session={editingSession}
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
