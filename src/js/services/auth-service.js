import { requestJson } from './api-client.js'

function normalizeGameId(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return null
}

export async function registerAccount({ email, password, gameId, signal } = {}) {
  if (!email || !password || !gameId) {
    throw new Error('Missing required registration fields')
  }

  const payload = await requestJson('/api/register', {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, game_id: Number.parseInt(gameId, 10) || gameId }),
  })

  const extracted = normalizeGameId(payload?.game_id ?? payload?.gameId)
  return {
    gameId: extracted ?? normalizeGameId(gameId),
  }
}

export async function loginWithCredentials({ email, password, signal } = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const payload = await requestJson('/api/login', {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (payload && typeof payload === 'object') {
    const token = payload.token || payload.data?.token
    if (typeof token === 'string' && token.trim()) {
      return token.trim()
    }
  }

  throw new Error('登录响应缺少 token')
}
