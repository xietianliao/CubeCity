import { getAdjustedStabilityRate, STABILITY_CONFIG } from '@/constants/constants.js'
import { loginWithCredentials, registerAccount } from '@/js/services/auth-service.js'
import { fetchProfileFromApi } from '@/js/services/credits-service.js'
import { getEffectiveBuildingValue } from '@/js/utils/building-interaction-utils.js'
import { defineStore } from 'pinia'

export const useGameState = defineStore('gameState', {
  state: () => ({
    // 核心游戏状态
    metadata: Array.from({ length: 17 }, _ =>
      Array.from({ length: 17 }, _ => ({
        type: 'grass',
        building: null,
        direction: 0,
      }))),
    currentMode: 'build',
    selectedBuilding: null,
    selectedPosition: null,
    toastQueue: [],

    // 游戏时间和经济
    gameDay: 1,
    credits: 3000,
    gameId: null,
    authToken: null,
    userEmail: '',
    authStatus: 'idle',
    authError: null,
    isFetchingCredits: false,

    // 城市属性
    territory: 16,
    cityLevel: 1,
    cityName: 'HeXian City',
    citySize: 16,
    language: 'en',
    showMapOverview: false,

    // 音乐系统状态
    musicEnabled: false,
    musicVolume: 0.5,
    isPlayingMusic: false,

    // 稳定度系统（移除计时器相关状态）
    stability: 100,
    stabilityChangeRate: 0,
    // 移除：stabilityIntervalId: null,
  }),
  getters: {
    isAuthenticated: state => Boolean(state.authToken),
    /**
     * 计算每日总收入（直接使用metadata中的detail，大幅提升性能）
     * @param {object} state - 游戏状态
     * @returns {number} 总收入
     */
    dailyIncome: (state) => {
      let totalIncome = 0

      state.metadata.forEach((row, x) => {
        row.forEach((tile, y) => {
          if (tile.building && tile.detail) {
            // 使用高效函数：自动判断是否需要相互作用计算
            const income = getEffectiveBuildingValue(state, x, y, 'coinOutput')
            totalIncome += income
          }
        })
      })

      return totalIncome
    },
    /**
     * 计算总人口容量（优化：直接使用detail，仅对有相互作用的建筑计算修正）
     * @param {object} state - 游戏状态
     * @returns {number} 总人口容量
     */
    maxPopulation: (state) => {
      let totalCapacity = 0

      state.metadata.forEach((row, x) => {
        row.forEach((tile, y) => {
          if (tile.building && tile.detail && tile.detail.category === 'residential') {
            // 使用高效函数：自动判断是否需要相互作用计算
            const capacity = getEffectiveBuildingValue(state, x, y, 'maxPopulation')
            totalCapacity += capacity
          }
        })
      })

      return totalCapacity
    },
    /**
     * 计算总就业岗位
     * @param {object} state - a
     * @returns {number} - b
     */
    totalJobs: (state) => {
      let totalJobs = 0
      state.metadata.forEach((row) => {
        row.forEach((tile) => {
          if (tile.building && tile.detail) {
            totalJobs += tile.detail.population || 0
          }
        })
      })
      return totalJobs
    },
    population() {
      return Math.min(this.maxPopulation * 1.5, this.totalJobs)
    },
    /**
     * 计算最大发电量（优化：直接使用detail，仅对有相互作用的建筑计算修正）
     * @param {object} state - 游戏状态
     * @returns {number} 最大发电量
     */
    maxPower: (state) => {
      let totalPower = 0

      state.metadata.forEach((row, x) => {
        row.forEach((tile, y) => {
          if (tile.building && tile.detail) {
            // 使用高效函数：自动判断是否需要相互作用计算
            const power = getEffectiveBuildingValue(state, x, y, 'powerOutput')
            totalPower += power
          }
        })
      })

      return totalPower
    },
    /**
     * 计算总耗电量
     * @param {object} state - a
     * @returns {number} - b
     */
    power: (state) => {
      let totalUsage = 0
      state.metadata.forEach((row) => {
        row.forEach((tile) => {
          if (tile.building && tile.detail) {
            totalUsage += tile.detail.powerUsage || 0
          }
        })
      })
      return totalUsage
    },

    buildingCount: (state) => {
      let count = 0
      state.metadata.forEach((row) => {
        row.forEach((tile) => {
          if (tile.building && tile.building !== 'road') {
            count++
          }
        })
      })
      return count
    },
    /**
     * 计算总污染值（优化：直接使用detail，仅对有相互作用的建筑计算修正）
     * @param {object} state - 游戏状态
     * @returns {number} 总污染值
     */
    pollution: (state) => {
      let totalPollution = 0

      state.metadata.forEach((row, x) => {
        row.forEach((tile, y) => {
          if (tile.building && tile.detail) {
            // 使用高效函数：自动判断是否需要相互作用计算
            const pollution = getEffectiveBuildingValue(state, x, y, 'pollution')
            totalPollution += pollution
          }
        })
      })

      return totalPollution
    },
    hospitalCount: state =>
      state.metadata.flat().filter(tile => tile.building === 'hospital').length,
    policeStationCount: state =>
      state.metadata.flat().filter(tile => tile.building === 'police').length,
    fireStationCount: state =>
      state.metadata.flat().filter(tile => tile.building === 'fire_station').length,
  },
  actions: {
    updateStability() {
      // 每5秒的变化率，使用配置常量计算
      let changeRate = STABILITY_CONFIG.DEFAULT_STABILITY_CHANGE_RATE

      // 1. 公共服务建筑带来的稳定度提升
      const servicesCount = this.hospitalCount + this.policeStationCount + this.fireStationCount
      changeRate += servicesCount * getAdjustedStabilityRate(STABILITY_CONFIG.SERVICE_STABILITY_PER_SECOND)

      // 2. 就业不足导致的稳定度下降
      const jobDeficit = this.totalJobs - this.maxPopulation
      if (jobDeficit > 0 && this.maxPopulation > 0) {
        const unemploymentRatio = Number((jobDeficit / this.maxPopulation).toFixed(2))
        changeRate -= unemploymentRatio * getAdjustedStabilityRate(STABILITY_CONFIG.UNEMPLOYMENT_STABILITY_PENALTY)
      }

      // 3. 污染导致的稳定度下降
      if (this.pollution > STABILITY_CONFIG.POLLUTION_THRESHOLD) {
        // 污染越高，下降越快，呈指数增长
        const pollutionFactor = (this.pollution / STABILITY_CONFIG.POLLUTION_THRESHOLD) ** 2
        changeRate -= Number((pollutionFactor * getAdjustedStabilityRate(STABILITY_CONFIG.POLLUTION_STABILITY_PENALTY)).toFixed(2))
      }

      // 4. 电力不足导致的稳定度下降
      const powerDeficit = this.power - this.maxPower
      if (powerDeficit > 0 && this.maxPower > 0) {
        const powerDeficitRatio = Number((powerDeficit / this.maxPower).toFixed(2))
        changeRate -= powerDeficitRatio * getAdjustedStabilityRate(STABILITY_CONFIG.POWER_DEFICIT_STABILITY_PENALTY)
      }

      // 确保变化率是有效数值，防止 Infinity 或 NaN
      if (!Number.isFinite(changeRate)) {
        changeRate = 0
      }

      this.stabilityChangeRate = changeRate
    },

    applyStabilityChange() {
      const newStability = this.stability + this.stabilityChangeRate
      this.stability = Math.max(0, Math.min(100, newStability))
    },

    // 移除稳定度定时器相关方法，现在使用统一的5秒计时器
    // startStabilityTimer() 和 stopStabilityTimer() 已移除

    setMode(mode) {
      this.currentMode = mode
    },
    setSelectedBuilding(payload) {
      this.selectedBuilding = payload
    },
    setSelectedPosition(position) {
      this.selectedPosition = position
    },
    async fetchCredits({ signal } = {}) {
      if (!this.authToken) {
        return
      }

      this.isFetchingCredits = true
      try {
        const profile = await fetchProfileFromApi({ signal, token: this.authToken })
        if (Number.isFinite(profile.balance)) {
          this.setCredits(profile.balance)
        }
        if (profile.gameId) {
          this.setGameId(profile.gameId)
        }
        if (profile.email) {
          this.setUserEmail(profile.email)
        }
      }
      catch (error) {
        if (error?.name === 'AbortError') {
          throw error
        }
        console.error('[GameState] Failed to fetch profile from API', error)
        const message = this.language === 'zh'
          ? '无法从服务器获取金币数据，已使用本地数值'
          : 'Unable to fetch coin data from server, using local value'
        this.addToast(message, 'error')
      }
      finally {
        this.isFetchingCredits = false
      }
    },
    // 金币
    setCredits(credits) {
      this.credits = credits
    },
    updateCredits(credits) {
      this.credits += credits
    },
    setGameId(gameId) {
      if (typeof gameId === 'number') {
        this.gameId = String(gameId)
        return
      }
      if (typeof gameId === 'string') {
        const trimmed = gameId.trim()
        this.gameId = trimmed.length > 0 ? trimmed : null
        return
      }
      this.gameId = null
    },
    clearGameSession() {
      this.gameId = null
      this.authToken = null
      this.userEmail = ''
    },
    setAuthToken(token) {
      this.authToken = token
    },
    setUserEmail(email) {
      this.userEmail = email
    },
    setAuthStatus(status) {
      this.authStatus = status
    },
    setAuthError(message) {
      this.authError = message
    },
    async login({ email, password, signal } = {}) {
      const trimmedEmail = typeof email === 'string' ? email.trim() : ''
      const trimmedPassword = typeof password === 'string' ? password.trim() : ''

      if (!trimmedEmail || !trimmedPassword) {
        const message = this.language === 'zh'
          ? '请输入邮箱和密码'
          : 'Please enter your email and password'
        this.setAuthError(message)
        throw new Error(message)
      }

      this.setAuthStatus('authenticating')
      this.setAuthError(null)
      try {
        const token = await loginWithCredentials({ email: trimmedEmail, password: trimmedPassword, signal })
        this.setAuthToken(token)
        this.setUserEmail(trimmedEmail)
        await this.fetchCredits({ signal })
        const message = this.language === 'zh'
          ? '登录成功，金币已刷新'
          : 'Signed in and refreshed coins'
        this.addToast(message, 'success')
        return token
      }
      catch (error) {
        if (error?.name === 'AbortError') {
          throw error
        }
        const message = error?.message || (this.language === 'zh'
          ? '登录失败，请检查邮箱和密码'
          : 'Login failed, please verify your credentials')
        this.setAuthError(message)
        this.addToast(message, 'error')
        throw error
      }
      finally {
        this.setAuthStatus('idle')
      }
    },
    async registerAndLogin({ email, password, gameId, signal } = {}) {
      const trimmedEmail = typeof email === 'string' ? email.trim() : ''
      const trimmedPassword = typeof password === 'string' ? password.trim() : ''
      const trimmedGameId = typeof gameId === 'string' ? gameId.trim() : ''

      if (!trimmedEmail || !trimmedPassword || !trimmedGameId) {
        const message = this.language === 'zh'
          ? '请输入邮箱、密码和游戏ID'
          : 'Please enter your email, password, and game ID'
        this.setAuthError(message)
        throw new Error(message)
      }

      this.setAuthStatus('authenticating')
      this.setAuthError(null)
      try {
        const { gameId: registeredGameId } = await registerAccount({
          email: trimmedEmail,
          password: trimmedPassword,
          gameId: trimmedGameId,
          signal,
        })
        if (registeredGameId) {
          this.setGameId(registeredGameId)
        }
        const token = await loginWithCredentials({
          email: trimmedEmail,
          password: trimmedPassword,
          signal,
        })
        this.setAuthToken(token)
        this.setUserEmail(trimmedEmail)
        await this.fetchCredits({ signal })
        const message = this.language === 'zh'
          ? '注册并登录成功，金币已刷新'
          : 'Registration complete. Signed in and refreshed coins'
        this.addToast(message, 'success')
        return token
      }
      catch (error) {
        if (error?.name === 'AbortError') {
          throw error
        }
        const message = error?.message || (this.language === 'zh'
          ? '注册失败，请稍后再试'
          : 'Unable to register right now')
        this.setAuthError(message)
        this.addToast(message, 'error')
        throw error
      }
      finally {
        this.setAuthStatus('idle')
      }
    },
    logout() {
      this.clearGameSession()
      this.setAuthStatus('idle')
      this.setAuthError(null)
      this.isFetchingCredits = false
      this.credits = 3000
      const message = this.language === 'zh'
        ? '已退出当前账号'
        : 'Signed out of the current session'
      this.addToast(message, 'info')
    },
    setTerritory(territory) {
      this.territory = territory
    },
    setCityLevel(cityLevel) {
      this.cityLevel = cityLevel
    },
    setCityName(cityName) {
      this.cityName = cityName
    },
    setCitySize(citySize) {
      this.citySize = citySize
    },
    addToast(message, type = 'info') {
      const id = Date.now() + Math.random()
      this.toastQueue.push({ message, type, id })
      // 最多只保留 3 条 toast
      if (this.toastQueue.length > 2) {
        this.toastQueue.shift()
      }
    },
    setLanguage(lang) {
      this.language = lang
    },
    removeToast(id) {
      this.toastQueue = this.toastQueue.filter(t => t.id !== id)
    },
    clearSelection() {
      this.selectedBuilding = null
      this.selectedPosition = null
    },
    setTile(x, y, patch) {
      // 合并 patch 到指定 tile
      Object.assign(this.metadata[x][y], patch)
    },
    updateTile(x, y, patch) {
      // 语义同 setTile，便于扩展
      Object.assign(this.metadata[x][y], patch)
    },
    getTile(x, y) {
      return this.metadata?.[x]?.[y] || null
    },
    setShowMapOverview(val) {
      this.showMapOverview = val
    },
    /**
     * 进入下一天，更新金币和稳定度
     */
    nextDay() {
      // 经济系统更新
      this.credits += this.dailyIncome
      this.gameDay++

      // 稳定度系统更新（每5秒执行一次）
      this.updateStability()
      this.applyStabilityChange()
    },
    resetAll() {
      this.metadata = Array.from({ length: 17 }, _ =>
        Array.from({ length: 17 }, _ => ({
          type: 'grass',
          building: null,
          direction: 0,
        })))
      this.currentMode = 'build'
      this.selectedBuilding = null
      this.selectedPosition = null
      this.toastQueue = []
      this.gameDay = 1
      this.credits = 3000
      this.territory = 16
      this.cityLevel = 1
      this.cityName = 'HeXian City'
      this.citySize = 16
      this.language = 'en'
      this.showMapOverview = false
      this.stability = 100
      this.stabilityChangeRate = 0
      this.musicEnabled = false
      this.musicVolume = 0.5
      this.isPlayingMusic = false
    },

    // 音乐系统相关方法
    toggleMusic() {
      this.musicEnabled = !this.musicEnabled
    },
    enableMusic() {
      this.musicEnabled = true
    },
    disableMusic() {
      this.musicEnabled = false
    },
    setMusicVolume(volume) {
      this.musicVolume = Math.max(0, Math.min(1, volume))
    },
    setMusicPlaying(playing) {
      this.isPlayingMusic = playing
    },
  },
  persist: true, // 启用持久化
})
