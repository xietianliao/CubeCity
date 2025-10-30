<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameState } from '@/stores/useGameState.js'

const gameState = useGameState()
const { t } = useI18n()

const authMode = ref('login')
const emailInput = ref(gameState.userEmail || '')
const passwordInput = ref('')
const gameIdInput = ref(gameState.gameId ? String(gameState.gameId) : '')
const localError = ref('')

const isAuthenticating = computed(() => gameState.authStatus === 'authenticating')
const activeError = computed(() => localError.value || gameState.authError || '')
const isLoginMode = computed(() => authMode.value === 'login')

watch(() => gameState.gameId, (value) => {
  if (value) {
    gameIdInput.value = String(value)
  }
})

let activeController = null

function resetErrors() {
  localError.value = ''
  if (gameState.authError) {
    gameState.setAuthError(null)
  }
}

function switchMode(mode) {
  if (authMode.value === mode || isAuthenticating.value) {
    return
  }
  authMode.value = mode
  resetErrors()
}

function beginRequest() {
  if (activeController) {
    activeController.abort()
  }
  const controller = new AbortController()
  activeController = controller
  return controller
}

function endRequest(controller) {
  if (activeController === controller) {
    activeController = null
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePassword(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeGameId(value) {
  if (typeof value === 'number') {
    return String(value)
  }
  return typeof value === 'string' ? value.trim() : ''
}

function validateGameId(value) {
  return /^[1-9]\d{10}$/.test(value)
}

function generateGameId() {
  resetErrors()
  const digits = Array.from({ length: 11 }, (_, index) => (
    index === 0
      ? Math.floor(Math.random() * 9) + 1
      : Math.floor(Math.random() * 10)
  ))
  gameIdInput.value = digits.join('')
}

async function handleLogin() {
  resetErrors()
  const email = normalizeEmail(emailInput.value)
  const password = normalizePassword(passwordInput.value)

  if (!email || !password) {
    localError.value = t('auth.error.missingCredentials')
    return
  }

  const controller = beginRequest()
  try {
    await gameState.login({
      email,
      password,
      signal: controller.signal,
    })
    if (gameState.gameId) {
      gameIdInput.value = String(gameState.gameId)
    }
  }
  catch (error) {
    if (error?.name === 'AbortError') {
      return
    }
    localError.value = error?.message || t('auth.error.genericLogin')
  }
  finally {
    endRequest(controller)
  }
}

async function handleRegister() {
  resetErrors()
  const email = normalizeEmail(emailInput.value)
  const password = normalizePassword(passwordInput.value)
  const gameId = normalizeGameId(gameIdInput.value)

  if (!email || !password || !gameId) {
    localError.value = t('auth.error.missingRegistrationFields')
    return
  }

  if (!validateGameId(gameId)) {
    localError.value = t('auth.error.invalidGameId')
    return
  }

  const controller = beginRequest()
  try {
    await gameState.registerAndLogin({
      email,
      password,
      gameId,
      signal: controller.signal,
    })
    if (gameState.gameId) {
      gameIdInput.value = String(gameState.gameId)
    }
  }
  catch (error) {
    if (error?.name === 'AbortError') {
      return
    }
    localError.value = error?.message || t('auth.error.genericRegister')
  }
  finally {
    endRequest(controller)
  }
}

function handleSubmit() {
  if (isLoginMode.value) {
    handleLogin()
  }
  else {
    handleRegister()
  }
}

const primaryButtonLabel = computed(() => {
  if (isAuthenticating.value) {
    return isLoginMode.value ? t('auth.signingIn') : t('auth.creatingAccountBusy')
  }
  return isLoginMode.value ? t('auth.signIn') : t('auth.createAccount')
})

const modeTabs = computed(() => ([
  { key: 'login', label: t('auth.tabLogin') },
  { key: 'register', label: t('auth.tabRegister') },
]))

onUnmounted(() => {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
})
</script>

<template>
  <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="w-[min(90vw,460px)] rounded-2xl border border-gray-700 bg-gray-900/95 p-6 shadow-2xl">
      <div class="space-y-6">
        <header class="space-y-2 text-center">
          <h2 class="text-2xl font-extrabold text-white drop-shadow">{{ t('auth.title') }}</h2>
          <p class="text-sm text-gray-300 leading-relaxed">
            {{ t('auth.description') }}
          </p>
        </header>

        <nav class="grid grid-cols-2 gap-2 rounded-xl bg-gray-800/80 p-1 text-sm font-semibold text-gray-300">
          <button
            v-for="tab in modeTabs"
            :key="tab.key"
            class="rounded-lg px-3 py-2 transition"
            :class="authMode === tab.key ? 'bg-industrial-green text-white shadow' : 'hover:bg-gray-700/80'"
            :disabled="isAuthenticating"
            @click="switchMode(tab.key)"
          >
            {{ tab.label }}
          </button>
        </nav>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-200" for="login-email">
              {{ t('auth.emailLabel') }}
            </label>
            <input
              id="login-email"
              v-model="emailInput"
              type="email"
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
              class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white focus:border-industrial-green focus:outline-none focus:ring-2 focus:ring-industrial-green/50"
              :disabled="isAuthenticating"
            >
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-200" for="login-password">
              {{ t('auth.passwordLabel') }}
            </label>
            <input
              id="login-password"
              v-model="passwordInput"
              type="password"
              autocomplete="current-password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white focus:border-industrial-green focus:outline-none focus:ring-2 focus:ring-industrial-green/50"
              :disabled="isAuthenticating"
            >
          </div>

          <div v-if="!isLoginMode" class="space-y-2">
            <label class="block text-sm font-semibold text-gray-200" for="login-game-id">
              {{ t('auth.gameIdLabel') }}
            </label>
            <div class="flex items-center gap-2">
              <input
                id="login-game-id"
                v-model="gameIdInput"
                maxlength="11"
                inputmode="numeric"
                pattern="\\d*"
                :placeholder="t('auth.gameIdPlaceholder')"
                class="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white focus:border-industrial-green focus:outline-none focus:ring-2 focus:ring-industrial-green/50"
                :disabled="isAuthenticating"
              >
              <button
                type="button"
                class="rounded-lg border border-industrial-green/60 bg-transparent px-3 py-2 text-xs font-semibold text-industrial-green transition hover:bg-industrial-green/10 disabled:cursor-not-allowed disabled:border-gray-600 disabled:text-gray-400"
                :disabled="isAuthenticating"
                @click="generateGameId"
              >
                {{ t('auth.generateId') }}
              </button>
            </div>
            <p class="text-xs text-gray-400">{{ t('auth.gameIdHint') }}</p>
          </div>

          <button
            type="submit"
            class="w-full rounded-lg bg-industrial-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-industrial-green/85 disabled:cursor-not-allowed disabled:bg-gray-600"
            :disabled="isAuthenticating"
          >
            {{ primaryButtonLabel }}
          </button>
        </form>

        <p v-if="activeError" class="rounded-lg border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {{ activeError }}
        </p>

        <p class="text-xs text-gray-500 text-center">{{ t('auth.remember') }}</p>
      </div>
    </div>
  </div>
</template>
