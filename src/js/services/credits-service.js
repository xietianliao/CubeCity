import { requestJson } from './api-client.js'

function normalizeCreditsValue(value) {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(numeric) ? numeric : null
}

function parseCreditsFromResponse(payload) {
  if (payload && typeof payload === 'object') {
    const directCredits = normalizeCreditsValue(payload.credits)
    if (directCredits !== null) {
      return directCredits
    }
    const coin = normalizeCreditsValue(payload.coin)
    if (coin !== null) {
      return coin
    }
    const coins = normalizeCreditsValue(payload.coins)
    if (coins !== null) {
      return coins
    }
    if (payload.data && typeof payload.data === 'object') {
      return parseCreditsFromResponse(payload.data)
    }
  }
  throw new Error('Invalid credits payload from API')
}

export async function fetchCreditsFromApi({ signal, gameId } = {}) {
  if (!gameId) {
    throw new Error('A gameId is required to request credits')
  }

  const payload = await requestJson(`/api/credits?gameId=${encodeURIComponent(gameId)}`, { signal })
  return parseCreditsFromResponse(payload)
}
