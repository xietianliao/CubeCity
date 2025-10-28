import { requestJson } from './api-client.js'

function extractGameId(payload) {
  if (payload && typeof payload === 'object') {
    const { gameId } = payload
    if (typeof gameId === 'string' && gameId.trim().length > 0) {
      return gameId.trim()
    }
  }
  throw new Error('Invalid gameId payload from API')
}

export async function createGameSession({ signal } = {}) {
  const payload = await requestJson('/api/session', {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  return extractGameId(payload)
}

export async function loginWithGameId(gameId, { signal } = {}) {
  if (!gameId) {
    throw new Error('A gameId is required for login')
  }
  const payload = await requestJson('/api/session', {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameId }),
  })
  return extractGameId(payload)
}
