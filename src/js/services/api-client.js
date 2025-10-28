const DEFAULT_API_BASE_URL = 'http://localhost:8080'

export function resolveApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_BASE_URL
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '')
  }
  return DEFAULT_API_BASE_URL
}

export async function requestJson(path, { signal, method = 'GET', headers, body } = {}) {
  const baseUrl = resolveApiBaseUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    signal,
    method,
    headers,
    body,
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }

  return response.json()
}
