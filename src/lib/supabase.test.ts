import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, from } = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClient.mockReturnValue({ from }),
}))

import { createLightweightActivity, createSession, deleteWorkoutDay, fetchInProgressSession, updateLightweightActivity } from './supabase'

describe('activity session persistence', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('snapshots template fields when creating a strength activity', async () => {
    const activity = {
      id: 'activity-1',
      category: 'strength',
      name: 'Push',
      color: '#2563EB',
      workout_day_id: 'template-1',
      status: 'in_progress',
      started_at: '2026-08-17T06:30:00.000Z',
      finished_at: null,
      duration_mins: null,
      note: null,
    }
    const single = vi.fn().mockResolvedValue({ data: activity, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    from.mockReturnValue({ insert })

    const result = await createSession(
      { id: 'template-1', name: 'Push', color: '#2563EB' },
      { startedAt: '2026-08-17T06:30:00.000Z' },
    )

    expect(from).toHaveBeenCalledWith('sessions')
    expect(insert).toHaveBeenCalledWith({
      workout_day_id: 'template-1',
      category: 'strength',
      name: 'Push',
      color: '#2563EB',
      status: 'in_progress',
      started_at: '2026-08-17T06:30:00.000Z',
    })
    expect(result).toEqual(activity)
  })

  it('fetches the newest in-progress activity for a template', async () => {
    const activity = {
      id: 'activity-2',
      category: 'strength',
      name: 'Pull',
      color: '#7C3AED',
      workout_day_id: 'template-2',
      status: 'in_progress',
      started_at: '2026-08-17T07:30:00.000Z',
      finished_at: null,
      duration_mins: null,
      note: null,
    }
    const maybeSingle = vi.fn().mockResolvedValue({ data: activity, error: null })
    const limit = vi.fn().mockReturnValue({ maybeSingle })
    const order = vi.fn().mockReturnValue({ limit })
    const statusEq = vi.fn().mockReturnValue({ order })
    const templateEq = vi.fn().mockReturnValue({ eq: statusEq })
    const select = vi.fn().mockReturnValue({ eq: templateEq })
    from.mockReturnValue({ select })

    const result = await fetchInProgressSession('template-2')

    expect(from).toHaveBeenCalledWith('sessions')
    expect(templateEq).toHaveBeenCalledWith('workout_day_id', 'template-2')
    expect(statusEq).toHaveBeenCalledWith('status', 'in_progress')
    expect(order).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(1)
    expect(result).toEqual(activity)
  })
})

describe('lightweight activity persistence', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('inserts a completed cardio activity with details and duration', async () => {
    const activity = {
      id: 'run-1',
      category: 'cardio',
      name: 'Run',
      color: '#0891B2',
      workout_day_id: null,
      status: 'completed',
      started_at: '2026-08-19T12:00:00.000Z',
      finished_at: '2026-08-19T12:18:00.000Z',
      duration_mins: 18,
      note: null,
      details: { distance_km: 2.1 },
    }
    const single = vi.fn().mockResolvedValue({ data: activity, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    from.mockReturnValue({ insert })

    const result = await createLightweightActivity({
      category: 'cardio',
      name: 'Run',
      color: '#0891B2',
      durationMins: 18,
      startedAt: '2026-08-19T12:00:00.000Z',
      details: { distance_km: 2.1 },
    })

    expect(from).toHaveBeenCalledWith('sessions')
    expect(insert).toHaveBeenCalledWith({
      workout_day_id: null,
      category: 'cardio',
      name: 'Run',
      color: '#0891B2',
      status: 'completed',
      started_at: '2026-08-19T12:00:00.000Z',
      finished_at: '2026-08-19T12:18:00.000Z',
      duration_mins: 18,
      note: null,
      details: { distance_km: 2.1 },
    })
    expect(result).toEqual(activity)
  })

  it('updates duration and details on an existing lightweight activity', async () => {
    const activity = {
      id: 'run-1',
      category: 'cardio',
      name: 'Run',
      color: '#0891B2',
      duration_mins: 22,
      details: { distance_km: 2.5 },
    }
    const single = vi.fn().mockResolvedValue({ data: activity, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ update })

    const result = await updateLightweightActivity('run-1', {
      durationMins: 22,
      startedAt: '2026-08-19T12:00:00.000Z',
      details: { distance_km: 2.5 },
    })

    expect(update).toHaveBeenCalledWith({
      started_at: '2026-08-19T12:00:00.000Z',
      finished_at: '2026-08-19T12:22:00.000Z',
      duration_mins: 22,
      details: { distance_km: 2.5 },
    })
    expect(eq).toHaveBeenCalledWith('id', 'run-1')
    expect(result).toEqual(activity)
  })
})

describe('deleteWorkoutDay', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('rejects non-custom templates', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'seed-1', is_custom: false, name: 'Push' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(deleteWorkoutDay('seed-1')).rejects.toThrow('Only custom templates can be deleted')
    expect(from).toHaveBeenCalledWith('workout_days')
  })

  it('unlinks sessions then deletes a custom template', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'custom-1', is_custom: true, name: 'Apartment Push' },
      error: null,
    })
    const fetchEq = vi.fn().mockReturnValue({ maybeSingle })
    const fetchSelect = vi.fn().mockReturnValue({ eq: fetchEq })

    const unlinkEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: unlinkEq })

    const deleteSelect = vi.fn().mockResolvedValue({ data: [{ id: 'custom-1' }], error: null })
    const deleteCustomEq = vi.fn().mockReturnValue({ select: deleteSelect })
    const deleteIdEq = vi.fn().mockReturnValue({ eq: deleteCustomEq })
    const del = vi.fn().mockReturnValue({ eq: deleteIdEq })

    from
      .mockReturnValueOnce({ select: fetchSelect })
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce({ delete: del })

    await deleteWorkoutDay('custom-1')

    expect(from).toHaveBeenNthCalledWith(1, 'workout_days')
    expect(from).toHaveBeenNthCalledWith(2, 'sessions')
    expect(update).toHaveBeenCalledWith({ workout_day_id: null })
    expect(unlinkEq).toHaveBeenCalledWith('workout_day_id', 'custom-1')
    expect(from).toHaveBeenNthCalledWith(3, 'workout_days')
    expect(deleteIdEq).toHaveBeenCalledWith('id', 'custom-1')
    expect(deleteCustomEq).toHaveBeenCalledWith('is_custom', true)
  })
})
