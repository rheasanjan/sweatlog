import { useState } from 'react'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { logBodyCheckin, fetchStrengthHistory } from '../lib/supabase'

export default function Progress({ sessions, bodyLog, exercises, onBack, onCheckinSaved }) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [selectedExId, setSelectedExId] = useState('')
  const [strengthData, setStrengthData] = useState([])
  const [loadingStrength, setLoadingStrength] = useState(false)

  const sortedBody = [...bodyLog].sort((a, b) => a.date.localeCompare(b.date))
  const weightData = sortedBody
    .filter(b => b.weight_kg)
    .map(b => ({ date: formatDate(b.date), weight: parseFloat(b.weight_kg) }))

  const waistData = sortedBody
    .filter(b => b.waist_cm)
    .map(b => ({ date: formatDate(b.date), waist: parseFloat(b.waist_cm) }))

  const latestWeight = weightData.length ? weightData[weightData.length - 1].weight : null
  const startWeight = weightData.length ? weightData[0].weight : null
  const weightDelta = latestWeight && startWeight ? (latestWeight - startWeight).toFixed(1) : null

  const handleExerciseChange = async (exId) => {
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

  // Get unique exercises that have been logged
  const loggedExerciseIds = new Set(
    sessions.flatMap(s => (s.session_sets || []).map(ss => ss.exercise_id))
  )
  const loggedExercises = exercises.filter(e => e.id && loggedExerciseIds.has(e.id))

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Progress</div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          <StatCard label="Sessions" value={sessions.length} />
          <StatCard label="Current weight" value={latestWeight ? `${latestWeight}kg` : '—'} />
          <StatCard label="Change" value={weightDelta ? `${weightDelta > 0 ? '+' : ''}${weightDelta}kg` : '—'} highlight={weightDelta < 0} />
        </div>

        {/* Weight chart */}
        <Card>
          <CardHeader label="Body weight" onAction={() => setShowCheckin(true)} actionLabel="Log" />
          {weightData.length < 2 ? (
            <Empty text="Log at least 2 entries to see the chart." />
          ) : (
            <Chart data={weightData} dataKey="weight" color="#2563EB" unit="kg" />
          )}
        </Card>

        {/* Waist chart */}
        {waistData.length >= 2 && (
          <Card>
            <CardHeader label="Waist circumference" />
            <Chart data={waistData} dataKey="waist" color="#7C3AED" unit="cm" />
          </Card>
        )}

        {/* Strength chart */}
        <Card>
          <CardHeader label="Strength by exercise" />
          {loggedExercises.length === 0 ? (
            <Empty text="Log a few sessions to see strength progression here." />
          ) : (
            <>
              <select
                value={selectedExId}
                onChange={e => handleExerciseChange(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, marginBottom: 12, background: '#fff', color: '#0F172A' }}
              >
                <option value="">Select an exercise…</option>
                {loggedExercises.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              {loadingStrength && <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 16 }}>Loading…</div>}
              {!loadingStrength && strengthData.length >= 2 && (
                <Chart data={strengthData} dataKey="weight" color="#059669" unit="kg" />
              )}
              {!loadingStrength && selectedExId && strengthData.length < 2 && (
                <Empty text="Need at least 2 sessions with this exercise to show a chart." />
              )}
            </>
          )}
        </Card>

        {/* Totals */}
        <div style={{ background: '#0F172A', borderRadius: 14, padding: '16px', display: 'flex', justifyContent: 'space-around' }}>
          {[
            ['Sessions', sessions.length],
            ['Weight logs', bodyLog.length],
            ['Exercises', exercises.length],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{val}</div>
              <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {showCheckin && <CheckinModal onClose={() => setShowCheckin(false)} onSaved={handleCheckinSaved} />}
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: highlight ? '#10B981' : '#0F172A' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Card({ children }) {
  return <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>{children}</div>
}

function CardHeader({ label, onAction, actionLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{label}</div>
      {onAction && (
        <button onClick={onAction} style={{ background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> {actionLabel}
        </button>
      )}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '16px 0' }}>{text}</div>
}

function Chart({ data, dataKey, color, unit }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip formatter={v => [`${v}${unit}`, '']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CheckinModal({ onClose, onSaved }) {
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [energy, setEnergy] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!weight || saving) return
    setSaving(true)
    try {
      await logBodyCheckin({ weightKg: weight, waistCm: waist || null, energy, note: null })
      await onSaved()
    } catch (e) {
      alert('Could not save: ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Log Today's Weight</div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="#64748B" />
          </button>
        </div>

        <FieldLabel>Weight (kg) *</FieldLabel>
        <ModalInput autoFocus type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="66.0" />

        <FieldLabel>Waist (cm) — optional</FieldLabel>
        <ModalInput type="number" inputMode="decimal" value={waist} onChange={e => setWaist(e.target.value)} placeholder="70" />

        <FieldLabel>Energy today — optional</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${energy === n ? '#2563EB' : '#E2E8F0'}`, background: energy === n ? '#2563EB' : '#fff', color: energy === n ? '#fff' : '#64748B', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              {['😴', '😐', '🙂', '😊', '⚡'][n - 1]}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!weight || saving}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: weight && !saving ? '#2563EB' : '#E2E8F0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: weight && !saving ? 'pointer' : 'default' }}
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>{children}</div>
}

function ModalInput(props) {
  return (
    <input
      {...props}
      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
    />
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
