import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../db/database', () => ({
  getUnsyncedJobs: vi.fn(),
  getSetting: vi.fn(),
  markJobsSynced: vi.fn()
}))

import { syncToApi } from './apiSync'
import { getUnsyncedJobs, getSetting, markJobsSynced } from '../db/database'

const mockGetUnsyncedJobs = vi.mocked(getUnsyncedJobs)
const mockGetSetting = vi.mocked(getSetting)
const mockMarkJobsSynced = vi.mocked(markJobsSynced)

describe('syncToApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns error when API URL not configured', async () => {
    mockGetSetting.mockReturnValue('')
    const result = await syncToApi()
    expect(result).toEqual({ count: 0, error: 'URL da API não configurada.' })
  })

  it('returns 0 when no unsynced jobs', async () => {
    mockGetSetting.mockReturnValue('https://api.example.com/sync')
    mockGetUnsyncedJobs.mockReturnValue([])
    const result = await syncToApi()
    expect(result).toEqual({ count: 0 })
  })

  it('sends jobs to API with correct headers', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'next_api_url') return 'https://api.example.com/sync'
      if (key === 'next_api_key') return 'test-key'
      return ''
    })
    mockGetUnsyncedJobs.mockReturnValue([{ id: 1, job_name: 'test' }] as any)

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('OK')
    })
    vi.stubGlobal('fetch', fetchSpy)

    await syncToApi()

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key'
      },
      body: JSON.stringify({ jobs: [{ id: 1, job_name: 'test' }] }),
      signal: expect.any(AbortSignal)
    })

    expect(mockMarkJobsSynced).toHaveBeenCalledWith([1])
  })

  it('omits Authorization header when no API key', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'next_api_url') return 'https://api.example.com/sync'
      return ''
    })
    mockGetUnsyncedJobs.mockReturnValue([{ id: 1 }] as any)

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: vi.fn() })
    vi.stubGlobal('fetch', fetchSpy)

    await syncToApi()

    const callHeaders = fetchSpy.mock.calls[0][1].headers
    expect(callHeaders).not.toHaveProperty('Authorization')
  })

  it('returns error on non-ok response', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'next_api_url') return 'https://api.example.com/sync'
      return ''
    })
    mockGetUnsyncedJobs.mockReturnValue([{ id: 1 }] as any)

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Internal Server Error')
    })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await syncToApi()
    expect(result.error).toContain('500')
    expect(result.count).toBe(0)
    expect(mockMarkJobsSynced).not.toHaveBeenCalled()
  })

  it('returns timeout error on AbortError', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'next_api_url') return 'https://api.example.com/sync'
      return ''
    })
    mockGetUnsyncedJobs.mockReturnValue([{ id: 1 }] as any)

    const abortError = new DOMException('The operation was aborted', 'AbortError')
    const fetchSpy = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchSpy)

    const result = await syncToApi()
    expect(result.error).toContain('Timeout')
    expect(result.count).toBe(0)
  })

  it('returns network error on fetch failure', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'next_api_url') return 'https://api.example.com/sync'
      return ''
    })
    mockGetUnsyncedJobs.mockReturnValue([{ id: 1 }] as any)

    const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', fetchSpy)

    const result = await syncToApi()
    expect(result.error).toContain('Network error')
    expect(result.count).toBe(0)
  })
})
