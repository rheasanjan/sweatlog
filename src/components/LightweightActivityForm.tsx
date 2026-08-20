import { useMemo, useState } from 'react'
import { toDateInputValue } from '../lib/program'
import { createLightweightActivity, updateLightweightActivity } from '../lib/supabase'
import type { ActivityTypeOption } from '../lib/activityCatalog'
import type { Activity, ActivityCategory, ActivityDetails } from '../types'
import { categoryTheme, theme } from '../styles/theme'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '../styles/ui'
import ActivityIcon from './ActivityIcon'
import ScreenHeader from './ui/ScreenHeader'

export interface LightweightActivityFormProps {
  category: Exclude<ActivityCategory, 'strength'>
  activityType: ActivityTypeOption
  initial?: Activity | null
  onBack: () => void
  onSaved: (activity: Activity) => void | Promise<void>
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function buildDetails(
  typeId: string,
  fields: {
    distanceKm: string
    paceSec: string
    indoor: boolean
    speedKmh: string
    inclinePct: string
    avgSpeedKmh: string
    format: string
    subtype: string
  },
): ActivityDetails {
  const details: ActivityDetails = {}

  if (typeId === 'run') {
    const distance = optionalNumber(fields.distanceKm)
    const pace = optionalNumber(fields.paceSec)
    if (distance != null) details.distance_km = distance
    if (pace != null) details.pace_sec_per_km = pace
    if (fields.indoor) details.indoor = true
  }

  if (typeId === 'walk' || typeId === 'incline_walk') {
    const distance = optionalNumber(fields.distanceKm)
    const speed = optionalNumber(fields.speedKmh)
    const incline = optionalNumber(fields.inclinePct)
    if (distance != null) details.distance_km = distance
    if (speed != null) details.speed_kmh = speed
    if (incline != null) details.incline_pct = incline
  }

  if (typeId === 'cycling') {
    const distance = optionalNumber(fields.distanceKm)
    const avg = optionalNumber(fields.avgSpeedKmh)
    if (distance != null) details.distance_km = distance
    if (avg != null) details.avg_speed_kmh = avg
  }

  if (typeId === 'pickleball' && (fields.format === 'singles' || fields.format === 'doubles')) {
    details.format = fields.format
  }

  if (['mobility', 'stretching', 'yoga', 'recovery', 'other'].includes(typeId) && fields.subtype.trim()) {
    details.subtype = fields.subtype.trim()
  }

  return details
}

export default function LightweightActivityForm({
  category,
  activityType,
  initial = null,
  onBack,
  onSaved,
}: Readonly<LightweightActivityFormProps>) {
  const initialDetails = initial?.details || {}
  const [date, setDate] = useState(
    initial ? toDateInputValue(new Date(initial.started_at)) : toDateInputValue(),
  )
  const [durationMins, setDurationMins] = useState(
    initial?.duration_mins != null ? String(initial.duration_mins) : '',
  )
  const [note, setNote] = useState(initial?.note || '')
  const [distanceKm, setDistanceKm] = useState(
    initialDetails.distance_km != null ? String(initialDetails.distance_km) : '',
  )
  const [paceSec, setPaceSec] = useState(
    initialDetails.pace_sec_per_km != null ? String(initialDetails.pace_sec_per_km) : '',
  )
  const [indoor, setIndoor] = useState(Boolean(initialDetails.indoor))
  const [speedKmh, setSpeedKmh] = useState(
    initialDetails.speed_kmh != null ? String(initialDetails.speed_kmh) : '',
  )
  const [inclinePct, setInclinePct] = useState(
    initialDetails.incline_pct != null ? String(initialDetails.incline_pct) : '',
  )
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(
    initialDetails.avg_speed_kmh != null ? String(initialDetails.avg_speed_kmh) : '',
  )
  const [format, setFormat] = useState(
    typeof initialDetails.format === 'string' ? initialDetails.format : '',
  )
  const [subtype, setSubtype] = useState(
    typeof initialDetails.subtype === 'string' ? initialDetails.subtype : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationValid = useMemo(() => {
    const n = Number(durationMins)
    return durationMins.trim() !== '' && Number.isFinite(n) && n > 0
  }, [durationMins])

  const save = async () => {
    if (!durationValid) {
      setError('Enter duration in minutes.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const startedAt = new Date(`${date}T12:00:00`).toISOString()
      const details = buildDetails(activityType.id, {
        distanceKm,
        paceSec,
        indoor,
        speedKmh,
        inclinePct,
        avgSpeedKmh,
        format,
        subtype,
      })
      const payload = {
        durationMins: Number(durationMins),
        startedAt,
        note: note.trim() || null,
        details,
      }
      const activity = initial
        ? await updateLightweightActivity(initial.id, {
            ...payload,
            name: activityType.label,
            color: activityType.color,
          })
        : await createLightweightActivity({
            category,
            name: activityType.label,
            color: activityType.color,
            ...payload,
          })
      await onSaved(activity)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        /details|column/i.test(message)
          ? `${message} Run the Phase 2 activity details migration.`
          : message,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <ScreenHeader
        title={initial ? `Edit ${activityType.label}` : activityType.label}
        subtitle={initial ? 'Update your logged activity' : 'Log what you completed'}
        onBack={onBack}
        accent={categoryTheme[category].color}
        action={(
          <span style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.12)' }}>
            <ActivityIcon name={activityType.icon} color={theme.colors.white} size={20} />
          </span>
        )}
      />

      <div style={{ padding: '18px 20px 28px' }}>
        <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="activity-date">Date</label>
          <input
            id="activity-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="activity-duration">Duration (min)</label>
          <input
            id="activity-duration"
            type="number"
            min={1}
            inputMode="numeric"
            value={durationMins}
            onChange={e => setDurationMins(e.target.value)}
            placeholder="e.g. 30"
            style={inputStyle}
          />
        </div>

        {activityType.id === 'run' && (
          <>
            <div>
              <label style={labelStyle} htmlFor="distance-km">Distance (km)</label>
              <input id="distance-km" type="number" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="pace-sec">Pace (sec/km)</label>
              <input id="pace-sec" type="number" value={paceSec} onChange={e => setPaceSec(e.target.value)} style={inputStyle} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={indoor} onChange={e => setIndoor(e.target.checked)} />
              Indoor
            </label>
          </>
        )}

        {(activityType.id === 'walk' || activityType.id === 'incline_walk') && (
          <>
            <div>
              <label style={labelStyle} htmlFor="walk-distance">Distance (km)</label>
              <input id="walk-distance" type="number" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="walk-speed">Speed (km/h)</label>
              <input id="walk-speed" type="number" step="0.1" value={speedKmh} onChange={e => setSpeedKmh(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="walk-incline">Incline (%)</label>
              <input id="walk-incline" type="number" step="0.5" value={inclinePct} onChange={e => setInclinePct(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        {activityType.id === 'cycling' && (
          <>
            <div>
              <label style={labelStyle} htmlFor="cycle-distance">Distance (km)</label>
              <input id="cycle-distance" type="number" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="cycle-speed">Avg speed (km/h)</label>
              <input id="cycle-speed" type="number" step="0.1" value={avgSpeedKmh} onChange={e => setAvgSpeedKmh(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        {activityType.id === 'pickleball' && (
          <div>
            <label style={labelStyle} htmlFor="pickle-format">Format</label>
            <select id="pickle-format" value={format} onChange={e => setFormat(e.target.value)} style={inputStyle}>
              <option value="">Optional</option>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </div>
        )}

        {category === 'mobility' && (
          <div>
            <label style={labelStyle} htmlFor="mobility-subtype">Subtype</label>
            <input id="mobility-subtype" type="text" value={subtype} onChange={e => setSubtype(e.target.value)} placeholder="Optional" style={inputStyle} />
          </div>
        )}

        <div>
          <label style={labelStyle} htmlFor="activity-notes">Notes</label>
          <textarea
            id="activity-notes"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{ color: '#DC2626', fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving || !durationValid}
          style={{ ...primaryButtonStyle, background: durationValid ? primaryButtonStyle.background : '#D1D5DB', cursor: durationValid && !saving ? 'pointer' : 'default' }}
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save activity'}
        </button>
        </div>
      </div>
    </div>
  )
}
