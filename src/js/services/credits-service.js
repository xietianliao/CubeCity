import { requestJson } from './api-client.js'

const DEFAULT_PROFILE_ENDPOINT = 'https://gamesite-api.16z.net/api/me'

function resolveProfileEndpoint() {
  const envUrl = import.meta.env?.VITE_PROFILE_API_URL
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim()
  }
  return DEFAULT_PROFILE_ENDPOINT
}

function normalizeCreditsValue(value) {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(numeric) ? numeric : null
}

function extractProfile(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const data = source.data && typeof source.data === 'object' ? source.data : source

  const balance = normalizeCreditsValue(data.balance)
  const credits = normalizeCreditsValue(data.credits)
  const coin = normalizeCreditsValue(data.coin)
  const coins = normalizeCreditsValue(data.coins)

  return {
    balance: balance ?? credits ?? coin ?? coins ?? null,
    gameId: data.game_id ?? data.gameId ?? null,
    email: data.email ?? null,
  }
}

export async function fetchProfileFromApi({ signal, token } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to request the profile')
  }

  const payload = await requestJson(resolveProfileEndpoint(), {
    signal,
    headers: {
      Authorization: token,
    },
  })

  return extractProfile(payload)
}
