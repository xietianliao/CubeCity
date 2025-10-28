<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameState } from '@/stores/useGameState.js'

const gameState = useGameState()
const { t } = useI18n()

const gameIdInput = ref(gameState.gameId || '')
const localError = ref('')
const pendingAction = ref(null)

const isAuthenticating = computed(() => gameState.authStatus === 'authenticating')
const activeError = computed(() => localError.value || gameState.authError || '')

let activeController = null

function resetErrors() {
  localError.value = ''
  if (gameState.authError) {
    gameState.setAuthError(null)
  }
}

function beginRequest(tag) {
  if (activeController) {
    activeController.abort()
  }
  pendingAction.value = tag
  const controller = new AbortController()
  activeController = controller
  return controller
}

function endRequest(controller) {
  if (activeController === controller) {
    activeController = null
  }
  pendingAction.value = null
}

async function handleSignIn() {
  resetErrors()
  const controller = beginRequest('login')
  try {
    const result = await gameState.loginWithExistingGameId(gameIdInput.value, { signal: controller.signal })
    if (typeof result === 'string') {
      gameIdInput.value = result
    }
  }
  catch (error) {
    if (error?.name === 'AbortError') {
      return
    }
    if (error?.message) {
      localError.value = error.message
    }
    else {
      localError.value = t('auth.error.required')
    }
  }
  finally {
    endRequest(controller)
  }
}

async function handleGenerate() {
  resetErrors()
  const controller = beginRequest('generate')
  try {
    const newId = await gameState.createNewGameSession({ signal: controller.signal })
    if (typeof newId === 'string') {
      gameIdInput.value = newId
    }
  }
  catch (error) {
    if (error?.name === 'AbortError') {
      return
    }
    if (error?.message) {
      localError.value = error.message
    }
  }
  finally {
    endRequest(controller)
  }
}

const signInLabel = computed(() => isAuthenticating.value && pendingAction.value === 'login'
  ? t('auth.signingIn')
  : t('auth.signIn'))

const generateLabel = computed(() => isAuthenticating.value && pendingAction.value === 'generate'
  ? t('auth.generating')
  : t('auth.generate'))

onUnmounted(() => {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
})
</script>

<template>
  <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="w-[min(90vw,420px)] rounded-2xl border border-gray-700 bg-gray-900/95 p-6 shadow-2xl">
      <div class="space-y-6">
        <header class="space-y-2 text-center">
          <h2 class="text-2xl font-extrabold text-white drop-shadow">{{ t('auth.title') }}</h2>
          <p class="text-sm text-gray-300 leading-relaxed">
            {{ t('auth.description') }}
          </p>
        </header>

        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-200">
            {{ t('auth.existingLabel') }}
          </label>
          <input
            v-model="gameIdInput"
            :placeholder="t('auth.existingPlaceholder')"
            class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white focus:border-industrial-green focus:outline-none focus:ring-2 focus:ring-industrial-green/50"
            :disabled="isAuthenticating"
            @keydown.enter.prevent="handleSignIn"
          >
          <button
            class="w-full rounded-lg bg-industrial-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-industrial-green/85 disabled:cursor-not-allowed disabled:bg-gray-600"
            :disabled="isAuthenticating"
            @click="handleSignIn"
          >
            {{ signInLabel }}
          </button>
        </div>

        <div class="flex items-center space-x-2 text-xs uppercase tracking-widest text-gray-500">
          <span class="flex-1 h-px bg-gray-700" />
          <span>{{ t('auth.orDivider') }}</span>
          <span class="flex-1 h-px bg-gray-700" />
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded-lg border border-industrial-green/60 bg-transparent px-4 py-2 text-sm font-semibold text-industrial-green hover:bg-industrial-green/10 disabled:cursor-not-allowed disabled:border-gray-600 disabled:text-gray-400"
            :disabled="isAuthenticating"
            @click="handleGenerate"
          >
            {{ generateLabel }}
          </button>
          <p class="text-xs text-gray-400">{{ t('auth.generatedNotice') }}</p>
        </div>

        <p v-if="activeError" class="rounded-lg border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {{ activeError }}
        </p>

        <p class="text-xs text-gray-500 text-center">{{ t('auth.remember') }}</p>
      </div>
    </div>
  </div>
</template>
