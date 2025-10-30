const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080'

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

export function resolveApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_BASE_URL
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '')
  }
  return DEFAULT_API_BASE_URL
}

function buildRequestUrl(path, baseOverride) {
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path
  }

  const baseUrl = (baseOverride ?? resolveApiBaseUrl()).replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function extractErrorMessage(status, payload) {
  if (payload && typeof payload === 'object') {
    const message = payload.error || payload.message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }
  if (status === 401) {
    return 'Unauthorized request'
  }
  if (status === 404) {
    return 'Requested resource was not found'
  }
  return `API request failed with status ${status}`
}

export async function requestJson(path, { signal, method = 'GET', headers = {}, body, baseUrl } = {}) {
  const url = buildRequestUrl(path, baseUrl)
  const response = await fetch(url, {
    signal,
    method,
    headers,
    body,
  })

  let parsed = null
  let rawText = ''

  try {
    rawText = await response.text()
    if (rawText) {
      parsed = JSON.parse(rawText)
    }
  }
  catch (error) {
    // Ignore JSON parse errors for non-JSON responses
    parsed = null
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(response.status, parsed))
  }

  if (parsed !== null) {
    return parsed
  }

  // Successful responses without JSON payload
  return rawText ? { data: rawText } : {}
}
