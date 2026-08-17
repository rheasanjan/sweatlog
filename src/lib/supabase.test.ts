import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, from } = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClient.mockReturnValue({ from }),
}))

import { createSession, fetchInProgressSession } from './supabase'

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
