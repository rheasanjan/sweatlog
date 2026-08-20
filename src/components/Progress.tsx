import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { logBodyCheckin, fetchStrengthHistory } from '../lib/supabase'
import type { Session, BodyLogEntry, Exercise } from '../types'
import { theme } from '../styles/theme'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '../styles/ui'
import ScreenHeader from './ui/ScreenHeader'

interface ChartDataPoint {
  date: string
  weight?: number | null
  waist?: number | null
}

export interface ProgressProps {
  sessions: Session[]
  bodyLog: BodyLogEntry[]
  exercises: Exercise[]
  onBack: () => void
  onCheckinSaved: () => Promise<void>
}

export default function Progress({ sessions, bodyLog, exercises, onBack, onCheckinSaved }: Readonly<ProgressProps>) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [selectedExId, setSelectedExId] = useState('')
  const [strengthData, setStrengthData] = useState<ChartDataPoint[]>([])
  const [loadingStrength, setLoadingStrength] = useState(false)

  const sortedBody = [...bodyLog].sort((a, b) => a.date.localeCompare(b.date))
  const weightData = sortedBody
    .filter(b => b.weight_kg)
    .map(b => ({ date: formatDate(b.date), weight: parseFloat(String(b.weight_kg)) }))

  const waistData = sortedBody
    .filter(b => b.waist_cm)
    .map(b => ({ date: formatDate(b.date), waist: parseFloat(String(b.waist_cm)) }))

  const latestWeight = weightData.length ? weightData[weightData.length - 1].weight : null
  const startWeight = weightData.length ? weightData[0].weight : null
  const weightDelta = latestWeight != null && startWeight != null ? (latestWeight - startWeight).toFixed(1) : null

  const handleExerciseChange = async (exId: string) => {
    setSelectedExId(exId)
    if (!exId) { setStrengthData([]); return }
    setLoadingStrength(true)
    try {
      const data = await fetchStrengthHistory(exId)
      setStrengthData(data.map(d => ({ date: formatDate(d.date), weight: d.weight_kg })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStrength(false)
    }
  }

  const handleCheckinSaved = async () => {
    setShowCheckin(false)
    await onCheckinSaved()
  }

  const loggedExerciseIds = new Set(
    sessions.flatMap(s => (s.session_sets || []).map(ss => ss.exercise_id))
  )
  const loggedExercises = exercises.filter(e => e.id && loggedExerciseIds.has(e.id))

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <ScreenHeader title="Progress" subtitle="Your trends and training progress" onBack={onBack} />

      <div style={{ padding: '18px 20px 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          <StatCard label="Sessions" value={sessions.length} />
          <StatCard label="Current weight" value={latestWeight != null ? `${latestWeight}kg` : '—'} />
          <StatCard label="Change" value={weightDelta != null ? `${Number(weightDelta) > 0 ? '+' : ''}${weightDelta}kg` : '—'} highlight={weightDelta != null && Number(weightDelta) < 0} />
        </div>

        <Card>
          <CardHeader label="Body weight" onAction={() => setShowCheckin(true)} actionLabel="Log" />
          {weightData.length < 2 ? (
            <Empty text="Log at least 2 entries to see the chart." />
          ) : (
            <Chart data={weightData} dataKey="weight" color={theme.colors.brand} unit="kg" />
          )}
        </Card>

        {waistData.length >= 2 && (
          <Card>
            <CardHeader label="Waist circumference" />
            <Chart data={waistData} dataKey="waist" color="#6C4FFF" unit="cm" />
          </Card>
        )}

        <Card>
          <CardHeader label="Strength by exercise" />
          {loggedExercises.length === 0 ? (
            <Empty text="Log a few sessions to see strength progression here." />
          ) : (
            <>
              <select
                value={selectedExId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleExerciseChange(e.target.value)}
                style={{ ...inputStyle, fontSize: 13, marginBottom: 12 }}
              >
                <option value="">Select an exercise…</option>
                {loggedExercises.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              {loadingStrength && <div style={{ textAlign: 'center', color: theme.colors.muted, fontSize: 12, padding: 16 }}>Loading…</div>}
              {!loadingStrength && strengthData.length >= 2 && (
                <Chart data={strengthData} dataKey="weight" color="#22B573" unit="kg" />
              )}
              {!loadingStrength && selectedExId && strengthData.length < 2 && (
                <Empty text="Need at least 2 sessions with this exercise to show a chart." />
              )}
            </>
          )}
        </Card>

        <div style={{ background: `linear-gradient(135deg, ${theme.colors.navy} 0%, ${theme.colors.navySoft} 100%)`, borderRadius: 16, padding: '18px 16px', display: 'flex', justifyContent: 'space-around' }}>
          {([
            ['Sessions', sessions.length],
            ['Weight logs', bodyLog.length],
            ['Exercises', exercises.length],
          ] as const).map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 800, color: theme.colors.white }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {showCheckin && <CheckinModal onClose={() => setShowCheckin(false)} onSaved={handleCheckinSaved} />}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  highlight?: boolean
}

function StatCard({ label, value, highlight }: Readonly<StatCardProps>) {
  return (
    <div style={{ ...cardStyle, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontFamily: theme.font.display, fontSize: 17, fontWeight: 800, color: highlight ? '#22B573' : theme.colors.text }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.colors.muted, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={{ ...cardStyle, padding: '16px', marginBottom: 16 }}>{children}</div>
}

interface CardHeaderProps {
  label: string
  onAction?: () => void
  actionLabel?: string
}

function CardHeader({ label, onAction, actionLabel }: Readonly<CardHeaderProps>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14 }}>{label}</div>
      {onAction && (
        <button type="button" onClick={onAction} style={{ background: '#EEF0FF', color: theme.colors.brand, border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> {actionLabel}
        </button>
      )}
    </div>
  )
}

function Empty({ text }: Readonly<{ text: string }>) {
  return <div style={{ textAlign: 'center', color: theme.colors.muted, fontSize: 12, padding: '16px 0' }}>{text}</div>
}

interface ChartProps {
  data: ChartDataPoint[]
  dataKey: 'weight' | 'waist'
  color: string
  unit: string
}

function Chart({ data, dataKey, color, unit }: Readonly<ChartProps>) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.line} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.colors.muted }} />
        <YAxis tick={{ fontSize: 10, fill: theme.colors.muted }} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip formatter={(v: number) => [`${v}${unit}`, '']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface CheckinModalProps {
  onClose: () => void
  onSaved: () => Promise<void>
}

function CheckinModal({ onClose, onSaved }: Readonly<CheckinModalProps>) {
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!weight || saving) return
    setSaving(true)
    try {
      await logBodyCheckin({ weightKg: weight, waistCm: waist || null, energy, note: null })
      await onSaved()
    } catch (e) {
      alert('Could not save: ' + (e instanceof Error ? e.message : String(e)))
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,32,0.62)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: theme.colors.white, border: `1px solid ${theme.colors.line}`, borderRadius: '22px 22px 0 0', padding: '22px 20px 32px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: theme.font.display, fontSize: 18, fontWeight: 800 }}>Log Today&apos;s Weight</div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: '#F0F2F6', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <X size={15} color={theme.colors.muted} />
          </button>
        </div>

        <FieldLabel>Weight (kg) *</FieldLabel>
        <ModalInput autoFocus type="number" inputMode="decimal" value={weight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)} placeholder="66.0" />

        <FieldLabel>Waist (cm) — optional</FieldLabel>
        <ModalInput type="number" inputMode="decimal" value={waist} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaist(e.target.value)} placeholder="70" />

        <FieldLabel>Energy today — optional</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} onClick={() => setEnergy(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: `1px solid ${energy === n ? theme.colors.brand : theme.colors.line}`, background: energy === n ? theme.colors.brand : theme.colors.white, color: energy === n ? theme.colors.white : theme.colors.muted, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              {['😴', '😐', '🙂', '😊', '⚡'][n - 1]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!weight || saving}
          style={{ ...primaryButtonStyle, background: weight && !saving ? primaryButtonStyle.background : '#D1D5DB', cursor: weight && !saving ? 'pointer' : 'default' }}
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={labelStyle}>{children}</div>
}

function ModalInput(props: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, marginBottom: 16 }}
    />
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
