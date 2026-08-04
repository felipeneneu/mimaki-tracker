import { getUnsyncedJobs, getSetting, markJobsSynced } from '../db/database'

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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ jobs })
    })

    if (!response.ok) {
      const text = await response.text()
      return { count: 0, error: `Erro da API (${response.status}): ${text}` }
    }

    // Se a API retornou 2xx, marcamos como sincronizados localmente
    const ids = jobs.map((j) => j.id)
    markJobsSynced(ids)

    return { count: jobs.length }
  } catch (err) {
    return { count: 0, error: `Falha de rede ao conectar com a API: ${err}` }
  }
}
