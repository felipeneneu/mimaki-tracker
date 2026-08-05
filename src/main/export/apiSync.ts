import { getUnsyncedJobs, getSetting, markJobsSynced } from '../db/database'

const API_TIMEOUT_MS = 30_000

export async function syncToApi(): Promise<{ count: number; error?: string }> {
  const apiUrl = getSetting('next_api_url')
  const apiKey = getSetting('next_api_key')

  if (!apiUrl) {
    return { count: 0, error: 'URL da API não configurada.' }
  }

  const jobs = getUnsyncedJobs()
  if (jobs.length === 0) {
    return { count: 0 }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ jobs }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => 'Erro desconhecido')
      return { count: 0, error: `Erro da API (${response.status}): ${text}` }
    }

    const ids = jobs.map((j) => j.id)
    markJobsSynced(ids)

    return { count: jobs.length }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { count: 0, error: `Timeout ao conectar com a API (${API_TIMEOUT_MS / 1000}s).` }
    }
    return { count: 0, error: `Falha de rede ao conectar com a API: ${err.message}` }
  }
}
